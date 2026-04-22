import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes.get(ext) ?? "application/octet-stream",
    "Cache-Control": filePath === indexFile ? "no-cache" : "public, max-age=31536000, immutable",
  });

  createReadStream(filePath).pipe(res);
};

const server = http.createServer(async (req, res) => {
  if (!existsSync(distDir)) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing dist directory. Run `npm run build` before `npm start`.");
    return;
  }

  const requestPath = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname;
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
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
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving dist on http://0.0.0.0:${port}`);
});
