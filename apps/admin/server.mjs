import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./dist/server/server.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(rootDir, "dist/client");
const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function tryServeStatic(pathname) {
  const safePath = pathname.split("?")[0].split("#")[0];
  const relativePath = safePath === "/" ? "/index.html" : safePath;
  const filePath = join(clientDir, relativePath);
  if (!filePath.startsWith(clientDir)) return null;

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    const body = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return new Response(body, { headers: { "content-type": contentType } });
  } catch {
    return null;
  }
}

async function readRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function toWebRequest(req, body) {
  const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
  const init = {
    method: req.method,
    headers: req.headers,
  };
  if (body !== undefined && body.length > 0) {
    init.body = body;
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function writeWebResponse(res, webResponse) {
  res.statusCode = webResponse.status;
  for (const [key, value] of webResponse.headers) {
    if (key.toLowerCase() === "set-cookie") {
      res.appendHeader(key, value);
    } else {
      res.setHeader(key, value);
    }
  }

  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname;
    const staticResponse = await tryServeStatic(pathname);
    if (staticResponse) {
      await writeWebResponse(res, staticResponse);
      return;
    }

    const body = await readRequestBody(req);
    const webResponse = await handler.fetch(toWebRequest(req, body), {}, {});
    await writeWebResponse(res, webResponse);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}).listen(port, host, () => {
  console.log(`Admin server listening on http://${host}:${port}`);
});
