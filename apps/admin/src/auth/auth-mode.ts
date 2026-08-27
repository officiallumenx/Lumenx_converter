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
