/** Public origin for canonical URLs, Open Graph, and the sitemap. */

type OriginReader = () => string | undefined;

let requestOriginReader: OriginReader | undefined;

/** Wired from the Worker entry so SSR `head()` can see this request’s origin. */
export function registerRequestOriginReader(reader: OriginReader): void {
  requestOriginReader = reader;
}

function peekStartRequest(): Request | undefined {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const storage = (globalThis as unknown as Record<symbol, { getStore?: () => { h3Event?: { req?: Request } } }>)[key];
    return storage?.getStore?.()?.h3Event?.req;
  } catch {
    return undefined;
  }
}

export function getSiteOrigin(request?: Request): string {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN?.trim().replace(/\/$/, "") ?? "";
  if (fromEnv) return fromEnv;
  const incoming = request ?? peekStartRequest();
  if (incoming) {
    try {
      return new URL(incoming.url).origin;
    } catch {
      /* ignore */
    }
  }
  const fromRequest = requestOriginReader?.()?.replace(/\/$/, "") ?? "";
  if (fromRequest) return fromRequest;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function canonicalUrl(path: string, request?: Request): string | undefined {
  const origin = getSiteOrigin(request);
  if (!origin) return undefined;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `${origin}/`;
  return `${origin}${normalized.replace(/\/$/, "")}`;
}

export function isNoIndex(): boolean {
  const flag = import.meta.env.VITE_NOINDEX?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export const SITE_PATHS = [
  "/",
  "/products",
  "/products/admin",
  "/products/connect",
  "/products/transport",
  "/products/admissions",
  "/products/careers",
  "/products/nexus",
  "/solutions",
  "/features",
  "/modules",
  "/how-it-works",
  "/demo",
  "/pricing",
  "/downloads",
  "/get-started",
  "/contact",
] as const;
