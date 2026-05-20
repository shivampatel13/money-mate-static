import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 8080);
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' https://www.gstatic.com; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const requestedPath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const filePath = resolve(root, requestedPath);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      throw new Error("Blocked unsafe path.");
    }
    const content = await readFile(filePath);
    response.writeHead(200, { ...securityHeaders, "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    const content = await readFile(join(root, "index.html"));
    response.writeHead(200, { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" });
    response.end(content);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Money Mate static app running at http://127.0.0.1:${port}`);
});
