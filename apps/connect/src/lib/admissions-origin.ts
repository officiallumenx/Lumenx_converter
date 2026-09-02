/**
 * LumenX Admissions standalone app origin.
 * Override with VITE_ADMISSIONS_ORIGIN (e.g. https://admissions.lumenx.app).
 */
export function getAdmissionsOrigin(): string {
  const fromEnv = import.meta.env.VITE_ADMISSIONS_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5177`;
    }
  }
  return "https://admissions.lumenx.app";
}

export function admissionsPortalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAdmissionsOrigin()}${normalized}`;
}

/** Hard redirect to the standalone Admissions app (preserves query + hash). */
export function redirectToAdmissionsPortal(subpath = "/"): void {
  if (typeof window === "undefined") return;
  const path = subpath.startsWith("/") ? subpath : `/${subpath}`;
  const { search, hash } = window.location;
  window.location.replace(`${getAdmissionsOrigin()}${path}${search}${hash}`);
}
