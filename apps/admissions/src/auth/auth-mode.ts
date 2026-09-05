/**
 * Admissions auth mode — demo localStorage vs Supabase + /api/v1/me.
 * Default is api. Set VITE_ADMISSIONS_AUTH_MODE=demo only for offline demos.
 */

export type AdmissionsAuthMode = "demo" | "api";

export function getAdmissionsAuthMode(): AdmissionsAuthMode {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_ADMISSIONS_AUTH_MODE?.trim().toLowerCase()
      : undefined;
  return raw === "demo" ? "demo" : "api";
}

export function isApiAuthMode(): boolean {
  return getAdmissionsAuthMode() === "api";
}

export function isDemoAuthMode(): boolean {
  return getAdmissionsAuthMode() === "demo";
}

export function assertProductionApiAuthMode(): void {
  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;

  if (getAdmissionsAuthMode() !== "api") {
    throw new Error(
      "LumenX Admissions production requires VITE_ADMISSIONS_AUTH_MODE=api.",
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
