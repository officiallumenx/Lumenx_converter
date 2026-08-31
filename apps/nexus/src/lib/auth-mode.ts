/** Nexus auth mode — demo/local vs Supabase + Hono /api/nexus. */

export type NexusAuthMode = "demo" | "api";

export function getNexusAuthMode(): NexusAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_NEXUS_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "api" ? "api" : "demo";
}

export function isNexusApiMode(): boolean {
  return getNexusAuthMode() === "api";
}

export function isNexusDemoMode(): boolean {
  return getNexusAuthMode() === "demo";
}
