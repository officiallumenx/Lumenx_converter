/** Connect auth mode — demo localStorage vs Supabase + /api/v1/me. */

export type ConnectAuthMode = "demo" | "api";

export function getConnectAuthMode(): ConnectAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_CONNECT_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "api" ? "api" : "demo";
}

export function isApiAuthMode(): boolean {
  return getConnectAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getConnectAuthMode() === "demo";
}
