export type TransportAuthMode = "demo" | "api";

export function getTransportAuthMode(): TransportAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_TRANSPORT_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "api" ? "api" : "demo";
}

export function isApiAuthMode(): boolean {
  return getTransportAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getTransportAuthMode() === "demo";
}
