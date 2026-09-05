/** Connect auth mode — demo localStorage vs Supabase + /api/v1/me.
 * Default is api. Set VITE_CONNECT_AUTH_MODE=demo only for offline demos.
 */

export type ConnectAuthMode = "demo" | "api";

export function getConnectAuthMode(): ConnectAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_CONNECT_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "demo" ? "demo" : "api";
}

export function isApiAuthMode(): boolean {
  return getConnectAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getConnectAuthMode() === "demo";
}
