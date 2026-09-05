/**
 * Careers auth mode — demo localStorage vs Supabase + /api/v1/me.
 * Default is api. Set VITE_CAREERS_AUTH_MODE=demo only for offline demos.
 */

export type CareersAuthMode = "demo" | "api";

export function getCareersAuthMode(): CareersAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_CAREERS_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "demo" ? "demo" : "api";
}

export function isApiAuthMode(): boolean {
  return getCareersAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getCareersAuthMode() === "demo";
}

export function assertProductionApiAuthMode(): void {
  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;

  if (getCareersAuthMode() !== "api") {
    throw new Error(
      "LumenX Careers production requires VITE_CAREERS_AUTH_MODE=api.",
    );
  }

  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }
  if (!import.meta.env.VITE_API_BASE_URL?.trim()) missing.push("VITE_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(`Production API auth is misconfigured. Set: ${missing.join(", ")}`);
  }
}
