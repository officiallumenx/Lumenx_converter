/** Nexus auth mode — demo/local vs Supabase + Hono /api/nexus.
 * Default is api. Set VITE_NEXUS_AUTH_MODE=demo only for offline demos.
 */

export type NexusAuthMode = "demo" | "api";

export function getNexusAuthMode(): NexusAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_NEXUS_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "demo" ? "demo" : "api";
}

export function isNexusApiMode(): boolean {
  return getNexusAuthMode() === "api";
}

export function isNexusDemoMode(): boolean {
  return getNexusAuthMode() === "demo";
}
