/**
 * Nexus → Admin module entitlement bridge (demo/localStorage).
 * Nexus owns entitlement; Admin applies it as a visibility ceiling.
 * Does not delete routes or data — only hides non-entitled modules in Admin nav.
 */

export const NEXUS_LICENSE_STORAGE_KEY = "lumenx.nexus.instituteLicenses.v4";
export const NEXUS_LICENSE_LEGACY_STORAGE_KEYS = [
  "lumenx.nexus.instituteLicenses.v3",
  "lumenx.nexus.instituteLicenses.v2",
  "lumenx.nexus.instituteLicenses.v1",
] as const;
export const NEXUS_LICENSE_CHANGED_EVENT = "lumenx-nexus-institute-licenses-changed";

/**
 * Which Nexus institute the Admin demo session consumes for entitlement.
 * Default matches seeded Delhi Riverside (Transport disabled for the demo story).
 */
export const NEXUS_ADMIN_BOUND_INSTITUTE_KEY = "lumenx.nexus.adminBoundInstituteId.v1";
export const NEXUS_ADMIN_DEFAULT_BOUND_INSTITUTE_ID = "ins-delhi-riverside";

export function getAdminBoundNexusInstituteId(): string {
  if (typeof localStorage === "undefined") return NEXUS_ADMIN_DEFAULT_BOUND_INSTITUTE_ID;
  try {
    const raw = localStorage.getItem(NEXUS_ADMIN_BOUND_INSTITUTE_KEY);
    if (raw && raw.trim()) return raw.trim();
  } catch {
    // ignore
  }
  return NEXUS_ADMIN_DEFAULT_BOUND_INSTITUTE_ID;
}

export function setAdminBoundNexusInstituteId(instituteId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(NEXUS_ADMIN_BOUND_INSTITUTE_KEY, instituteId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NEXUS_LICENSE_CHANGED_EVENT));
  }
}

type LicenseLike = {
  instituteId?: string;
  modules?: Record<string, boolean>;
  connect?: Record<
    string,
    { enabled?: boolean; modules?: Record<string, boolean> }
  >;
  apps?: Record<string, { enabled?: boolean }>;
};

function readLicenseMap(): Record<string, LicenseLike> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let raw = localStorage.getItem(NEXUS_LICENSE_STORAGE_KEY);
    if (!raw) {
      for (const key of NEXUS_LICENSE_LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, LicenseLike>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Module entitlement map for one institute from Nexus licensing truth.
 * Returns null when no license is stored yet (Admin keeps local defaults).
 */
export function readNexusModuleEntitlements(
  instituteId: string = getAdminBoundNexusInstituteId(),
): Record<string, boolean> | null {
  const map = readLicenseMap();
  if (!map) return null;
  const lic = map[instituteId];
  if (!lic?.modules || typeof lic.modules !== "object") return null;
  return { ...lic.modules };
}

export type NexusConnectPortalId = "teachers" | "parents" | "students";
export type NexusPlatformAppId = "careers" | "admissions" | "transport";

export type NexusConnectPortalEntitlement = {
  enabled: boolean;
  modules: Record<string, boolean>;
};

/**
 * Connect portal entitlements for one institute (portal + module map).
 * Returns null when no license / connect block is stored yet.
 */
export function readNexusConnectEntitlements(
  instituteId: string = getAdminBoundNexusInstituteId(),
): Record<NexusConnectPortalId, NexusConnectPortalEntitlement> | null {
  const map = readLicenseMap();
  if (!map) return null;
  const lic = map[instituteId];
  if (!lic?.connect || typeof lic.connect !== "object") return null;
  const portals: NexusConnectPortalId[] = ["teachers", "parents", "students"];
  const out = {} as Record<NexusConnectPortalId, NexusConnectPortalEntitlement>;
  for (const id of portals) {
    const raw = lic.connect[id];
    out[id] = {
      enabled: raw?.enabled !== false,
      modules: raw?.modules && typeof raw.modules === "object" ? { ...raw.modules } : {},
    };
  }
  return out;
}

/**
 * Whole-app entitlements (Careers / Admissions / Transport).
 * Returns null when no license / apps block is stored yet.
 */
export function readNexusAppEntitlements(
  instituteId: string = getAdminBoundNexusInstituteId(),
): Record<NexusPlatformAppId, boolean> | null {
  const map = readLicenseMap();
  if (!map) return null;
  const lic = map[instituteId];
  if (!lic?.apps || typeof lic.apps !== "object") {
    // Fall back to Admin module mirrors when apps block is absent.
    if (!lic?.modules) return null;
    return {
      careers: lic.modules.careers !== false,
      admissions: lic.modules.admissions !== false,
      transport: lic.modules.transport !== false,
    };
  }
  return {
    careers: lic.apps.careers?.enabled !== false,
    admissions: lic.apps.admissions?.enabled !== false,
    transport: lic.apps.transport?.enabled !== false,
  };
}

/**
 * Apply Nexus entitlement as a ceiling on Admin's enabled-module map.
 * - Nexus `false` → force Admin off (hide from nav)
 * - Nexus `true` / missing key → leave Admin local preference
 * Locked Admin modules (caller responsibility) should stay on.
 *
 * Maps Nexus catalog ids onto Admin catalog aliases where they differ
 * (e.g. homework → homework-logs) without changing Admin workflows.
 */
const NEXUS_TO_ADMIN_MODULE_ALIASES: Record<string, string[]> = {
  homework: ["homework", "homework-logs"],
  diary: ["diary", "teacher-diary"],
  documents: ["documents"],
};

export function applyNexusEntitlementCeiling(
  adminEnabled: Record<string, boolean>,
  entitlements: Record<string, boolean> | null,
): Record<string, boolean> {
  if (!entitlements) return adminEnabled;
  const next = { ...adminEnabled };
  for (const [moduleId, entitled] of Object.entries(entitlements)) {
    if (entitled !== false) continue;
    next[moduleId] = false;
    for (const alias of NEXUS_TO_ADMIN_MODULE_ALIASES[moduleId] ?? []) {
      next[alias] = false;
    }
  }
  return next;
}

export function subscribeNexusLicenseChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === NEXUS_LICENSE_STORAGE_KEY ||
      e.key === NEXUS_ADMIN_BOUND_INSTITUTE_KEY ||
      (e.key && NEXUS_LICENSE_LEGACY_STORAGE_KEYS.includes(e.key as (typeof NEXUS_LICENSE_LEGACY_STORAGE_KEYS)[number]))
    ) {
      listener();
    }
  };
  window.addEventListener(NEXUS_LICENSE_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener(NEXUS_LICENSE_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
  };
}
