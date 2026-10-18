/**
 * Public read-only download host for LumenX release artifacts in R2.
 * Allows GET for /android/*, /windows/*, /manifest.json only.
 */

export interface Env {
  DOWNLOADS: R2Bucket;
}

const ALLOWED_PREFIXES = ["android/", "windows/"];
const ALLOWED_EXACT = new Set(["manifest.json"]);

function contentTypeFor(key: string): string {
  if (key.endsWith(".apk")) return "application/vnd.android.package-archive";
  if (key.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    const object = await env.DOWNLOADS.get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentTypeFor(key));
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    if (object.size != null) headers.set("Content-Length", String(object.size));
    if (object.httpEtag) headers.set("ETag", object.httpEtag);

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(object.body, { status: 200, headers });
  },
};
