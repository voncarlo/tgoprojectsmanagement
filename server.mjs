import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema, getPool, hasDatabaseConfig } from "./server/db.mjs";
import { findUserByEmail, getAuthState, getStateSnapshot, listProjects, listTasks, listUsers, migrateLegacyAuthSnapshot, saveAuthState, saveStateSnapshot, saveUserPassword, seedDatabase } from "./server/repository.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const indexFile = path.join(distDir, "index.html");
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};
const sseClients = new Set();
let appStateRevision = 0;

const sendSseEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcastAppStateUpdate = (payload) => {
  appStateRevision += 1;
  const message = {
    channel: "app-state",
    revision: appStateRevision,
    serverTime: new Date().toISOString(),
    ...payload,
  };

  sseClients.forEach((client) => {
    try {
      sendSseEvent(client, "app-state-updated", message);
    } catch {
      console.error("[realtime] failed to deliver app-state update");
      sseClients.delete(client);
    }
  });

  console.debug("[realtime] app-state updated", {
    revision: message.revision,
    sourceClientId: message.sourceClientId ?? null,
    clients: sseClients.size,
  });

  return message;
};

const resetEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

const sendPasswordResetEmail = async ({ email, temporaryPassword, userName }) => {
  if (!resetEmailConfigured()) {
    throw new Error("Password reset email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: "Your temporary TGO Projects Portal password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
          <p>Hello ${userName},</p>
          <p>A temporary password was requested for your TGO Projects Portal account.</p>
          <p><strong>Temporary password:</strong> ${temporaryPassword}</p>
          <p>Please sign in with this password, then change it immediately in Settings.</p>
          <p>If you did not request this, contact your Admin or Super Admin right away.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Email delivery failed.");
  }
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes.get(ext) ?? "application/octet-stream",
    "Cache-Control": filePath === indexFile ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
};

const handleApiRequest = async (req, res, pathname) => {
  if (!hasDatabaseConfig()) {
    sendJson(res, 503, {
      ok: false,
      error: "MySQL is not configured. Add MYSQL_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE in Railway.",
    });
    return true;
  }

  if (pathname === "/api/health") {
    await getPool().query("SELECT 1");
    sendJson(res, 200, { ok: true, database: "mysql" });
    return true;
  }

  if (pathname === "/api/users") {
    sendJson(res, 200, { ok: true, data: await listUsers() });
    return true;
  }

  if (pathname === "/api/state/auth" && req.method === "GET") {
    sendJson(res, 200, { ok: true, data: await getAuthState() });
    return true;
  }

  if (pathname === "/api/state/auth" && req.method === "PUT") {
    const body = await readJsonBody(req);
    await saveAuthState(body);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/auth/password-reset-request" && req.method === "POST") {
    const body = await readJsonBody(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      sendJson(res, 400, { ok: false, error: "Email is required." });
      return true;
    }

    const account = await findUserByEmail(email);
    if (!account) {
      sendJson(res, 404, { ok: false, error: "No account found for that email." });
      return true;
    }

    if (account.status !== "Active") {
      sendJson(res, 400, { ok: false, error: "This account is inactive." });
      return true;
    }

    if (!resetEmailConfigured()) {
      sendJson(res, 503, { ok: false, error: "Password reset email is not configured. Contact an Admin or Super Admin." });
      return true;
    }

    const temporaryPassword = `TGO-${Math.random().toString(36).slice(2, 6).toUpperCase()}!`;
    await sendPasswordResetEmail({
      email: account.email,
      temporaryPassword,
      userName: account.name,
    });
    await saveUserPassword(account.id, temporaryPassword);
    sendJson(res, 200, { ok: true, message: "Temporary password sent to your email." });
    return true;
  }

  if (pathname === "/api/state/app" && req.method === "GET") {
    sendJson(res, 200, { ok: true, data: await getStateSnapshot("app"), meta: { revision: appStateRevision } });
    return true;
  }

  if (pathname === "/api/state/app" && req.method === "PUT") {
    const body = await readJsonBody(req);
    const nextState = body?.state ?? body;
    const sourceClientId =
      typeof body?.meta?.sourceClientId === "string" && body.meta.sourceClientId.trim()
        ? body.meta.sourceClientId.trim()
        : undefined;
    await saveStateSnapshot("app", nextState);
    const event = broadcastAppStateUpdate({ sourceClientId });
    console.debug("[state] saved app snapshot", { revision: event.revision, sourceClientId: sourceClientId ?? null });
    sendJson(res, 200, { ok: true, meta: { revision: event.revision, sourceClientId: event.sourceClientId } });
    return true;
  }

  if (pathname === "/api/realtime/app" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    sendSseEvent(res, "ready", { channel: "app-state", revision: appStateRevision, serverTime: new Date().toISOString() });
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });

    return true;
  }

  if (pathname === "/api/tasks") {
    sendJson(res, 200, { ok: true, data: await listTasks() });
    return true;
  }

  if (pathname === "/api/projects") {
    sendJson(res, 200, { ok: true, data: await listProjects() });
    return true;
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith("/api/")) {
      const handled = await handleApiRequest(req, res, pathname);
      if (!handled) sendJson(res, 404, { ok: false, error: "API route not found." });
      return;
    }

    if (!existsSync(distDir)) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Missing dist directory. Run `npm run build` before `npm start`.");
      return;
    }

    const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(distDir, safePath === "/" ? "index.html" : safePath);

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        sendFile(res, filePath);
        return;
      }
    } catch {
      // Fall through to SPA index fallback.
    }

    sendFile(res, indexFile);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unexpected server error." });
  }
});

const start = async () => {
  if (hasDatabaseConfig()) {
    await ensureSchema();
    await seedDatabase();
    await migrateLegacyAuthSnapshot();
    console.log("MySQL schema ready.");
  } else {
    console.log("MySQL not configured yet. API routes will return 503 until database env vars are set.");
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Serving app on http://0.0.0.0:${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
