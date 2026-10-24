/**
 * Public download host for LumenX release artifacts.
 * Prefer R2 when bound; otherwise stream from the public GitHub Release and
 * cache at the Cloudflare edge for faster repeat downloads.
 */

export interface Env {
  DOWNLOADS?: R2Bucket;
  RELEASE_TAG?: string;
}

const ALLOWED_PREFIXES = ["android/", "windows/"];
const ALLOWED_EXACT = new Set(["manifest.json"]);
const DEFAULT_TAG = "downloads-v1.0.2";

function contentTypeFor(key: string): string {
  if (key.endsWith(".apk")) return "application/vnd.android.package-archive";
  if (key.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function filenameFor(key: string): string {
  return key.split("/").pop() || key;
}

function githubUrl(tag: string, key: string): string {
  return `https://github.com/officiallumenx/Lumenx_converter/releases/download/${tag}/${filenameFor(key)}`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, "");
    if (!key || key.includes("..")) {
      return new Response("Not found", { status: 404 });
    }

    const allowed =
      ALLOWED_EXACT.has(key) || ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!allowed) {
      return new Response("Not found", { status: 404 });
    }

    if (env.DOWNLOADS) {
      const object = await env.DOWNLOADS.get(key);
      if (object) {
        const headers = new Headers();
        headers.set("Content-Type", contentTypeFor(key));
        headers.set("Cache-Control", "public, max-age=86400, immutable");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set(
          "Content-Disposition",
          `attachment; filename="${filenameFor(key)}"`,
        );
        if (object.size != null) headers.set("Content-Length", String(object.size));
        if (object.httpEtag) headers.set("ETag", object.httpEtag);
        if (request.method === "HEAD") {
          return new Response(null, { status: 200, headers });
        }
        return new Response(object.body, { status: 200, headers });
      }
    }

    const tag = env.RELEASE_TAG?.trim() || DEFAULT_TAG;
    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}${url.pathname}?release=${encodeURIComponent(tag)}`, {
      method: "GET",
    });
    const cached = await cache.match(cacheKey);
    if (cached) {
      if (request.method === "HEAD") {
        return new Response(null, { status: 200, headers: cached.headers });
      }
      return cached;
    }

    const upstream = await fetch(githubUrl(tag, key), {
      redirect: "follow",
      cf: {
        cacheEverything: true,
        cacheTtl: 86400,
      },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentTypeFor(key));
    headers.set("Cache-Control", "public, max-age=86400, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filenameFor(key)}"`,
    );
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    const response = new Response(upstream.body, { status: 200, headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
