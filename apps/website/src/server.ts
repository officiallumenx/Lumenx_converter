import "@lumenx/utils/error-capture";

import { consumeLastCapturedError } from "@lumenx/utils/error-capture";
import { renderErrorPage } from "@lumenx/utils/error-page";
import { robotsTxt, sitemapXml } from "./lib/seo";
import { requestOriginStore } from "./lib/request-origin";
import { SITE_PATHS, getSiteOrigin, registerRequestOriginReader } from "./lib/site";

registerRequestOriginReader(() => requestOriginStore.getStore());

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (response.status === 404) {
    headers.set("X-Robots-Tag", "noindex");
  }
  if (import.meta.env.PROD) {
    headers.set("Content-Security-Policy", CSP);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function handleWellKnown(request: Request): Response | null {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const origin = getSiteOrigin(request);

  if (url.pathname === "/robots.txt") {
    return new Response(robotsTxt(origin), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }
  if (url.pathname === "/sitemap.xml") {
    return new Response(sitemapXml(origin, SITE_PATHS), {
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }
  return null;
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function ensureNotFoundTitle(response: Response): Promise<Response> {
  if (response.status !== 404) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  const withTitle = /<title>/i.test(html)
    ? html
    : html.replace(/<\/head>/i, "<title>Page not found — LumenX</title></head>");
  return new Response(withTitle, {
    status: 404,
    statusText: response.statusText,
    headers: response.headers,
  });
}
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const origin = getSiteOrigin(request);
    return requestOriginStore.run(origin, () => handleFetch(request, env, ctx));
  },
};

async function handleFetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  try {
    const wellKnown = handleWellKnown(request);
    if (wellKnown) return withSecurityHeaders(wellKnown);

    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    const normalized = await ensureNotFoundTitle(await normalizeCatastrophicSsrResponse(response));
    return withSecurityHeaders(normalized);
  } catch (error) {
    console.error(error);
    return withSecurityHeaders(brandedErrorResponse());
  }
}
