/**
 * Lightweight zero-dependency static HTTP server (`tools/server.mjs`).
 * Serves the project root for both interactive preview and Puppeteer capture.
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

export function startStaticServer({ port = 0, host = "127.0.0.1" } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (/^\/[a-z]{2}(-[A-Z]{2})?\.json$/.test(urlPath)) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end("{}");
        return;
      }
      let rel = urlPath === "/" ? "/index.html" : urlPath;
      const absPath = path.resolve(ROOT, "." + rel);

      if (!absPath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const data = await fs.readFile(absPath);
      const ext = path.extname(absPath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({
        server,
        port: addr.port,
        baseUrl: `http://${host}:${addr.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// Run standalone CLI when invoked directly
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portArgIdx = process.argv.indexOf("--port");
  const port = portArgIdx >= 0 ? Number(process.argv[portArgIdx + 1]) : 4173;
  const { baseUrl } = await startStaticServer({ port });
  console.log(`Pelican Test preview server listening on ${baseUrl}/`);
}
