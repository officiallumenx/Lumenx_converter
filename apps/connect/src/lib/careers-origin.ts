/**
 * LumenX Careers standalone app origin.
 * Override with VITE_CAREERS_ORIGIN (e.g. https://careers.lumenx.app).
 */
export function getCareersOrigin(): string {
  const fromEnv = import.meta.env.VITE_CAREERS_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5176`;
    }
  }
  return "https://careers.lumenx.app";
}

export function careersPortalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getCareersOrigin()}${normalized}`;
}

/** Hard redirect to the standalone Careers app (preserves query + hash). */
export function redirectToCareersPortal(subpath = "/"): void {
  if (typeof window === "undefined") return;
  const path = subpath.startsWith("/") ? subpath : `/${subpath}`;
  const { search, hash } = window.location;
  window.location.replace(`${getCareersOrigin()}${path}${search}${hash}`);
}
