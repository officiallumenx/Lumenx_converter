/** Production API origin used when Vite env is unset during a prod build. */
const PROD_API_BASE_URL = "https://api.lumenxtech.in";
const DEV_API_BASE_URL = "http://127.0.0.1:8787";

/**
 * Resolve the LumenX API base URL.
 * Prefer VITE_API_BASE_URL; never fall back to localhost in production builds.
 */
export function getTransportApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return (import.meta.env.PROD ? PROD_API_BASE_URL : DEV_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
}
