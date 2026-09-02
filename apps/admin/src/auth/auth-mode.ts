/**
 * Admin auth mode — demo/offline mock vs real Supabase + Hono API.
 * Default is demo so existing offline workflows keep working without env.
 */

export type AdminAuthMode = "demo" | "api";

export function getAdminAuthMode(): AdminAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_ADMIN_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "api" ? "api" : "demo";
}

export function isApiAuthMode(): boolean {
  return getAdminAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getAdminAuthMode() === "demo";
}

/**
 * Production builds must use API auth with Supabase + backend configured.
 * Throws at runtime so misconfigured deploys fail fast (demo auth must not ship).
 */
export function assertProductionApiAuthMode(): void {
  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;

  if (getAdminAuthMode() !== "api") {
    throw new Error(
      "LumenX Admin production requires VITE_ADMIN_AUTH_MODE=api. Demo authentication must not be used in production.",
    );
  }

  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }
  if (!import.meta.env.VITE_API_BASE_URL?.trim()) missing.push("VITE_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(
      `Production API auth is misconfigured. Set: ${missing.join(", ")}`,
    );
  }
}
