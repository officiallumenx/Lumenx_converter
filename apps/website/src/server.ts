import "@lumenx/utils/error-capture";

import { consumeLastCapturedError } from "@lumenx/utils/error-capture";
import { renderErrorPage } from "@lumenx/utils/error-page";
import { robotsTxt, sitemapXml } from "./lib/seo";
import { requestOriginStore } from "./lib/request-origin";
import {
  SITE_PATHS,
  getSiteOrigin,
  isProductionMarketingHost,
  registerRequestOriginReader,
} from "./lib/site";
import { handleLeadApiRequest } from "./lib/lead-api";

registerRequestOriginReader(() => requestOriginStore.getStore());

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://formsubmit.co https://api.web3forms.com https://api.resend.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function withSecurityHeaders(response: Response, opts?: { skipCsp?: boolean }): Response {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (response.status === 404) {
    headers.set("X-Robots-Tag", "noindex");
  }
  if (import.meta.env.PROD) {
    headers.set("Strict-Transport-Security", "max-age=15552000");
    if (!opts?.skipCsp) headers.set("Content-Security-Policy", CSP);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function publicOriginForSeo(request: Request, url: URL): string {
  // Prefer the live marketing origin for canonical sitemap locs.
  const configured = getSiteOrigin(request);
  if (configured) {
    try {
      if (isProductionMarketingHost(new URL(configured).hostname)) return configured;
    } catch {
      /* ignore */
    }
  }
  if (isProductionMarketingHost(url.hostname)) return url.origin;
  return configured || url.origin;
}

const PRODUCT_SLUGS = new Set(["admin", "connect", "transport", "admissions", "careers"]);

const MODULE_SECTIONS: Record<string, string> = {
  transport: "transport",
  admissions: "admissions",
  academics: "admin",
  administration: "admin",
  finance: "admin",
  communication: "admin",
  documents: "admin",
  growth: "admin",
};

function legacyRedirectTarget(pathname: string, search: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/download" || path.startsWith("/download/")) return `/resources/downloads${search}`;
  if (path === "/downloads" || path.startsWith("/downloads/")) return `/resources/downloads${search}`;
  if (path === "/demo" || path.startsWith("/demo/")) return "/contact?intent=demo";
  if (path === "/demos" || path.startsWith("/demos/")) return "/contact?intent=demo";
  if (path === "/features" || path.startsWith("/features/")) return "/modules";
  if (path === "/how-it-works" || path.startsWith("/how-it-works/")) return "/platform";
  if (path === "/resources/blog" || path === "/resources/demo") return "/resources";
  if (path === "/products") return "/platform";
  if (path.startsWith("/products/")) {
    const slug = path.slice("/products/".length);
    if (slug === "nexus") return "/about";
    if (PRODUCT_SLUGS.has(slug)) return `/platform/${slug}`;
    return null;
  }
  if (path.startsWith("/modules/") && path !== "/modules") {
    const category = path.slice("/modules/".length);
    const section = MODULE_SECTIONS[category];
    return section ? `/modules?section=${section}` : "/modules";
  }
  if (path.startsWith("/solutions/") && path !== "/solutions") {
    const role = path.slice("/solutions/".length);
    return /^[a-z0-9-]+$/.test(role) ? `/solutions?role=${role}` : "/solutions";
  }
  return null;
}

function canonicalHostRedirect(request: Request, url: URL): Response | null {
  const host = url.hostname.toLowerCase();
  if (host !== "www.lumenxtech.in") return null;
  const target = new URL(url.pathname + url.search, "https://lumenxtech.in");
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
  return new Response(null, { status, headers: { Location: target.toString() } });
}

function handleLegacyRedirect(request: Request, url: URL): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const targetPath = legacyRedirectTarget(url.pathname, url.search);
  if (!targetPath) return null;
  const target = new URL(targetPath, url.origin);
  return new Response(null, { status: 301, headers: { Location: target.toString() } });
}

function handleWellKnown(request: Request): Response | null {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const origin = publicOriginForSeo(request, url);
  // Short cache so Search Console / Googlebot pick up robots fixes quickly.
  const cache = "public, max-age=300, must-revalidate";

  if (url.pathname === "/robots.txt") {
    return new Response(robotsTxt(origin, request), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": cache,
      },
    });
  }
  if (url.pathname === "/sitemap.xml") {
    return new Response(sitemapXml(origin, SITE_PATHS), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": cache,
      },
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
    const url = new URL(request.url);
    const hostRedirect = canonicalHostRedirect(request, url);
    if (hostRedirect) return withSecurityHeaders(hostRedirect, { skipCsp: true });

    const legacy = handleLegacyRedirect(request, url);
    if (legacy) return withSecurityHeaders(legacy, { skipCsp: true });

    const leadApi = await handleLeadApiRequest(request, env);
    if (leadApi) return withSecurityHeaders(leadApi);

    const wellKnown = handleWellKnown(request);
    // robots/sitemap are plain text/XML for crawlers — skip CSP noise on those responses.
    if (wellKnown) return withSecurityHeaders(wellKnown, { skipCsp: true });

    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    const normalized = await ensureNotFoundTitle(await normalizeCatastrophicSsrResponse(response));
    return withSecurityHeaders(normalized);
  } catch (error) {
    console.error(error);
    return withSecurityHeaders(brandedErrorResponse());
  }
}
