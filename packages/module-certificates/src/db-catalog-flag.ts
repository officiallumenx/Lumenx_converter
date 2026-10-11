/**
 * Dual-read / cutover flag for Nexus platform certificate templates.
 * Default OFF — localStorage remains the UI source of truth until explicitly enabled.
 *
 * Set VITE_NEXUS_TEMPLATE_DB_CATALOG=true in a local env file only after
 * migrations are applied to a verified local Supabase instance (never silently
 * against hosted production).
 */
function readFlagRaw(): string | undefined {
  try {
    const fromImportMeta =
      typeof import.meta !== "undefined"
        ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
            .env?.VITE_NEXUS_TEMPLATE_DB_CATALOG
        : undefined;
    if (fromImportMeta != null && String(fromImportMeta).trim() !== "") {
      return String(fromImportMeta);
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof process !== "undefined" && process.env) {
      return process.env.VITE_NEXUS_TEMPLATE_DB_CATALOG;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function isDbCertificateCatalogEnabled(): boolean {
  const v = String(readFlagRaw() ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
}
