/**
 * Admin tenant scope — demo profile vs freshly registered institute.
 * Registered tenants use empty operational seeds (no shared demo roster).
 */

import type { DemoAcademicConfig, DemoInstituteProfile } from "@lumenx/types";
import { setAdminBoundNexusInstituteId } from "@lumenx/config";
import type { InstituteRegistrationPayload } from "@lumenx/utils";

export const ADMIN_TENANT_STORAGE_KEY = "lumenx.admin.activeTenant.v1";
export const ADMIN_TENANT_CHANGED_EVENT = "lumenx-admin-tenant-changed";

export type RegisteredAdminTenant = {
  mode: "registered";
  instituteId: string;
  instituteName: string;
  principalName: string;
  principalEmail: string;
  principalMobile: string;
  boundAt: string;
};

export type AdminTenantState = RegisteredAdminTenant | { mode: "demo" };

/** Empty school academic — levels/sections exist so Admin can create classes; no seeded sections. */
export const EMPTY_SCHOOL_ACADEMIC: DemoAcademicConfig = {
  mode: "school",
  levelLabel: "Grade",
  departmentLabel: "Department",
  classPageTitle: "Classes & Sections",
  classPageSubtitle: "No classes yet — create your first section",
  subjectLabel: "Subject",
  subjectsPageTitle: "Subjects & Faculty",
  levels: [
    { id: "9", label: "Grade 9", shortLabel: "9" },
    { id: "10", label: "Grade 10", shortLabel: "10" },
    { id: "11", label: "Grade 11", shortLabel: "11" },
    { id: "12", label: "Grade 12", shortLabel: "12" },
  ],
  sections: ["A", "B", "C", "D"],
  departments: [],
  courses: [],
  classGroups: [],
};

function emptyInstituteProfile(input: {
  instituteName: string;
  principalName: string;
  email: string;
  phone: string;
  address?: string;
  logo?: string;
}): DemoInstituteProfile {
  return {
    name: input.instituteName,
    founded: "",
    founder: "",
    principal: input.principalName,
    vision: "",
    mission: "",
    ranking: "",
    logo: input.logo || input.instituteName.slice(0, 2).toUpperCase(),
    profilePhoto: "",
    phone: input.phone,
    email: input.email,
    address: input.address || "",
    history: [],
    awards: [],
    achievements: [],
    customFields: [],
  };
}

export function instituteProfileFromRegistrationPayload(
  payload: InstituteRegistrationPayload,
): DemoInstituteProfile {
  const address = [
    payload.address,
    payload.city,
    payload.district,
    payload.state,
    payload.pincode,
    payload.country,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

  return emptyInstituteProfile({
    instituteName: payload.instituteName.trim(),
    principalName: payload.principalName.trim(),
    email: payload.principalEmail.trim().toLowerCase(),
    phone: payload.principalMobile.trim(),
    address,
    logo: payload.logoPreview,
  });
}

export function readRegisteredAdminTenant(): RegisteredAdminTenant | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_TENANT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminTenantState;
    if (parsed?.mode !== "registered") return null;
    if (!parsed.instituteId?.trim() || !parsed.instituteName?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isRegisteredAdminTenant(): boolean {
  return readRegisteredAdminTenant() !== null;
}

/**
 * Storage namespace for operational Admin data.
 * Demo: existing demo profile id. Registered: `reg.<nexusInstituteId>`.
 */
export function readAdminDataScopeKey(): string {
  const tenant = readRegisteredAdminTenant();
  if (tenant) return `reg.${tenant.instituteId}`;
  // Lazy import avoided — callers that need demo id still import types separately.
  try {
    const raw = localStorage.getItem("lumenx_demo_profile");
    if (raw === "multi_institute" || raw === "single_institute" || raw === "inter_college") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "multi_institute";
}

function emitTenantChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_TENANT_CHANGED_EVENT));
  window.dispatchEvent(new CustomEvent("lumenx-demo-profile-change", { detail: readAdminDataScopeKey() }));
}

export function clearRegisteredAdminTenant(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ADMIN_TENANT_STORAGE_KEY);
  emitTenantChanged();
}

const TENANT_PROFILE_OVERRIDES_KEY = "lumenx.admin.tenantInstituteProfiles.v1";

export function saveTenantInstituteProfile(
  scopeKey: string,
  profile: DemoInstituteProfile,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(TENANT_PROFILE_OVERRIDES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, DemoInstituteProfile>) : {};
    map[scopeKey] = profile;
    localStorage.setItem(TENANT_PROFILE_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function readTenantInstituteProfile(
  scopeKey: string,
  fallback: DemoInstituteProfile,
): DemoInstituteProfile {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(TENANT_PROFILE_OVERRIDES_KEY);
    if (!raw) return fallback;
    const map = JSON.parse(raw) as Record<string, DemoInstituteProfile>;
    return map[scopeKey] ?? fallback;
  } catch {
    return fallback;
  }
}

/** Ensure empty JSON arrays exist so stores don't fall back to demo seeds. */
function ensureEmptyScopedStores(scopeKey: string): void {
  if (typeof localStorage === "undefined") return;
  const keys = [
    `lumenx.admin.students.v2.${scopeKey}`,
    `lumenx.admin.parents.v2.${scopeKey}`,
    `lumenx.admin.classes.v2.${scopeKey}`,
    `lumenx.admin.subjects.v2.${scopeKey}`,
    `lumenx.admin.teachers.v2.${scopeKey}`,
    `lumenx.admin.timetables.v2.${scopeKey}`,
    `lumenx.admin.timetable-schedule.v1.${scopeKey}`,
    `lumenx.admin.transport.v2.${scopeKey}`,
  ];
  for (const key of keys) {
    if (localStorage.getItem(key) == null) {
      localStorage.setItem(key, "[]");
    }
  }
}

export function bindRegisteredAdminTenant(input: {
  instituteId: string;
  instituteName: string;
  payload?: InstituteRegistrationPayload;
  principalName?: string;
  principalEmail?: string;
  principalMobile?: string;
}): RegisteredAdminTenant {
  const instituteId = input.instituteId.trim();
  const instituteName =
    input.instituteName.trim() ||
    input.payload?.instituteName.trim() ||
    "New Institute";

  const existing = readRegisteredAdminTenant();
  if (existing?.instituteId === instituteId) {
    setAdminBoundNexusInstituteId(instituteId);
    const scopeKey = `reg.${instituteId}`;
    ensureEmptyScopedStores(scopeKey);
    return existing;
  }

  const tenant: RegisteredAdminTenant = {
    mode: "registered",
    instituteId,
    instituteName,
    principalName:
      input.principalName?.trim() ||
      input.payload?.principalName.trim() ||
      "Principal",
    principalEmail:
      input.principalEmail?.trim().toLowerCase() ||
      input.payload?.principalEmail.trim().toLowerCase() ||
      "",
    principalMobile:
      input.principalMobile?.trim() ||
      input.payload?.principalMobile.trim() ||
      "",
    boundAt: new Date().toISOString(),
  };

  localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, JSON.stringify(tenant));
  setAdminBoundNexusInstituteId(instituteId);

  const scopeKey = `reg.${instituteId}`;
  ensureEmptyScopedStores(scopeKey);

  const profile = input.payload
    ? instituteProfileFromRegistrationPayload(input.payload)
    : emptyInstituteProfile({
        instituteName,
        principalName: tenant.principalName,
        email: tenant.principalEmail,
        phone: tenant.principalMobile,
      });
  saveTenantInstituteProfile(scopeKey, profile);

  emitTenantChanged();
  return tenant;
}

export function subscribeAdminTenant(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === ADMIN_TENANT_STORAGE_KEY || e.key === TENANT_PROFILE_OVERRIDES_KEY) {
      listener();
    }
  };
  window.addEventListener(ADMIN_TENANT_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ADMIN_TENANT_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
