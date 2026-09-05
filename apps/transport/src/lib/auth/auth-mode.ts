/** Transport auth mode — demo seed vs Supabase + /api/v1/transport.
 * Default is api. Set VITE_TRANSPORT_AUTH_MODE=demo only for offline demos.
 */

export type TransportAuthMode = "demo" | "api";

export function getTransportAuthMode(): TransportAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_TRANSPORT_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "demo" ? "demo" : "api";
}

export function isApiAuthMode(): boolean {
  return getTransportAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getTransportAuthMode() === "demo";
}
