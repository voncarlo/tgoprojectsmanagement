import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema, getPool, hasDatabaseConfig } from "./server/db.mjs";
import { listProjects, listTasks, listUsers, seedDatabase } from "./server/repository.mjs";

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
