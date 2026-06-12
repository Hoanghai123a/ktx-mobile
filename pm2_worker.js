import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./dist", import.meta.url)));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3001);
const pocketBaseUrl = new URL(
  process.env.POCKETBASE_URL || "http://127.0.0.1:8091",
);
const pocketBasePrefix = "/api/public/pb";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
};

function sendFile(req, res, filePath) {
  const stat = statSync(filePath);
  res.writeHead(200, {
    "Content-Type":
      mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": filePath.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(filePath).pipe(res);
}

function staticFile(req, res) {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://local").pathname,
  );
  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  const requestedPath = resolve(join(root, relativePath));
  const insideRoot =
    requestedPath === root || requestedPath.startsWith(`${root}${sep}`);
  const filePath =
    insideRoot && existsSync(requestedPath) && statSync(requestedPath).isFile()
      ? requestedPath
      : join(root, "index.html");

  if (!existsSync(filePath)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Build not found. Run npm run build first.");
  }
  sendFile(req, res, filePath);
}

function proxyPocketBase(req, res) {
  const upstreamPath =
    req.url.replace(/^\/api\/public\/pb(?=\/|\?|$)/, "") || "/";
  const transport =
    pocketBaseUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const proxyReq = transport(
    {
      protocol: pocketBaseUrl.protocol,
      hostname: pocketBaseUrl.hostname,
      port: pocketBaseUrl.port,
      method: req.method,
      path: `${pocketBaseUrl.pathname.replace(/\/$/, "")}${upstreamPath}`,
      headers: {
        ...req.headers,
        host: pocketBaseUrl.host,
        "x-forwarded-host": req.headers.host || "",
        "x-forwarded-proto": req.headers["x-forwarded-proto"] || "http",
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    if (res.headersSent) return res.destroy(error);
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "PocketBase unavailable" }));
  });
  req.pipe(proxyReq);
}

if (!existsSync(root)) {
  console.error("Missing dist directory. Run npm run build first.");
  process.exit(1);
}

createServer((req, res) => {
  if (
    req.url === pocketBasePrefix ||
    req.url.startsWith(`${pocketBasePrefix}/`) ||
    req.url.startsWith(`${pocketBasePrefix}?`)
  ) {
    return proxyPocketBase(req, res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }
  try {
    return staticFile(req, res);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Bad request");
  }
}).listen(port, host, () => {
  console.log(`KTX frontend listening on http://${host}:${port}`);
  console.log(`PocketBase proxy target: ${pocketBaseUrl.origin}`);
});
