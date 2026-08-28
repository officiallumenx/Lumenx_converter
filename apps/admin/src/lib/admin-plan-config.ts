/** Single source of truth for Admin plan tiers, module catalog, and storage quotas. */
import { useSyncExternalStore } from "react";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  applyNexusEntitlementCeiling,
  readNexusModuleEntitlements,
  subscribeNexusLicenseChanges,
} from "@lumenx/config";

export type PlanTier = "core" | "plus" | "max" | "custom";

export type BillingTerm = "6mo" | "1yr" | "2yr" | "5yr";

export type ModuleGroup =
  | "Core"
  | "Operations"
  | "Communications"
  | "Intelligence"
  | "Infrastructure"
  | "Services"
  | "Institute";

export type ModuleDef = {
  id: string;
  label: string;
  route?: string;
  minPlan: PlanTier;
  group: ModuleGroup;
  description: string;
  /** When false, module is always on and cannot be toggled. */
  toggleable?: boolean;
};

export const PLAN_ORDER: PlanTier[] = ["core", "plus", "max", "custom"];

export const PLAN_LABELS: Record<PlanTier, string> = {
  core: "Core",
  plus: "Plus",
  max: "Max",
  custom: "Custom",
};

export const PLAN_DETAILS: Record<
  PlanTier,
  {
    price: string;
    desc: string;
    studentLimit: number;
    customRoleCap: number;
    storageGb: number;
    features: string[];
  }
> = {
  core: {
    price: "₹49,999/yr",
    desc: "Essential people & academics for small institutes",
    studentLimit: 500,
    customRoleCap: 2,
    storageGb: 500,
    features: ["Up to 500 students", "One institute account", "Core modules"],
  },
  plus: {
    price: "₹1,49,999/yr",
    desc: "Operational depth for growing institutes",
    studentLimit: 5000,
    customRoleCap: 5,
    storageGb: 1024,
    features: ["Up to 5,000 students", "One institute account", "Timetable & analytics"],
  },
  max: {
    price: "₹3,99,999/yr",
    desc: "Full platform with services & insights",
    studentLimit: 20000,
    customRoleCap: 10,
    storageGb: 2048,
    features: ["Up to 20,000 students", "One institute account", "All modules"],
  },
  custom: {
    price: "Contact sales",
    desc: "Unlimited scale with custom branding and Roles & Access",
    studentLimit: Infinity,
    customRoleCap: Infinity,
    storageGb: 5120,
    features: ["Unlimited students", "One institute account", "Full Roles & Access", "Custom branding"],
  },
};

export const BILLING_TERMS: { key: BillingTerm; label: string }[] = [
  { key: "6mo", label: "6 months" },
  { key: "1yr", label: "Yearly" },
  { key: "2yr", label: "2 years" },
  { key: "5yr", label: "5 years" },
];

export const MODULE_CATALOG: ModuleDef[] = [
  {
    id: "overview",
    label: M.home,
    route: "/",
    minPlan: "core",
    group: "Intelligence",
    description: "What should I do today — attention, reviews, and shortcuts",
    toggleable: false,
  },
  {
    id: "analytics",
    label: M.analytics,
    route: "/analytics",
    minPlan: "plus",
    group: "Intelligence",
    description: "Live dashboard, charts, and insights",
    toggleable: false,
  },
  {
    id: "students",
    label: "Students",
    route: "/students",
    minPlan: "core",
    group: "Core",
    description: "Directory, admissions, 360 profiles",
  },
  {
    id: "teachers",
    label: "Teachers",
    route: "/teachers",
    minPlan: "core",
    group: "Core",
    description: "Faculty records and ratings",
  },
  {
    id: "parents",
    label: "Parents",
    route: "/parents",
    minPlan: "core",
    group: "Core",
    description: "Guardian accounts and child linking",
  },
  {
    id: "accounts",
    label: M.accounts,
    route: "/accounts",
    minPlan: "core",
    group: "Core",
    description: "Login accounts for portals",
    toggleable: false,
  },
  {
    id: "classes",
    label: M.classes,
    route: "/classes",
    minPlan: "core",
    group: "Core",
    description: "Class structure and section assignments",
  },
  {
    id: "academic-management",
    label: M.academics,
    route: "/academic-management",
    minPlan: "core",
    group: "Core",
    description: "Academic years, promotion, graduation, and status",
  },
  {
    id: "subjects",
    label: "Subjects",
    route: "/subjects",
    minPlan: "core",
    group: "Core",
    description: "Subject catalog and teacher assignment",
  },
  {
    id: "student-attendance",
    label: M.attendance,
    route: "/student-attendance",
    minPlan: "core",
    group: "Operations",
    description: "Central student attendance workspace",
  },
  {
    id: "attendance",
    label: M.attendanceReports,
    route: "/attendance",
    minPlan: "core",
    group: "Operations",
    description: "Monitor, reports, and analytics for student attendance",
  },
  {
    id: "teacher-attendance",
    label: M.staffAttendance,
    route: "/teacher-attendance",
    minPlan: "core",
    group: "Operations",
    description: "Faculty daily attendance",
  },
  {
    id: "timetable",
    label: "Timetable",
    route: "/timetable",
    minPlan: "plus",
    group: "Operations",
    description: "Conflict-aware schedule builder",
  },
  {
    id: "exams",
    label: "Exams",
    route: "/exams",
    minPlan: "plus",
    group: "Operations",
    description: "Exam scheduling and timetables",
  },
  {
    id: "marks",
    label: "Marks",
    route: "/marks",
    minPlan: "plus",
    group: "Operations",
    description: "Review teacher submissions and publish results",
  },
  {
    id: "homework-logs",
    label: M.homework,
    route: "/homework",
    minPlan: "plus",
    group: "Operations",
    description: "View-only teacher homework activity logs",
  },
  {
    id: "teacher-diary",
    label: M.diary,
    route: "/diary",
    minPlan: "plus",
    group: "Operations",
    description: "View-only submitted teacher diary days",
  },
  {
    id: "complaints",
    label: "Complaints",
    route: "/complaints",
    minPlan: "plus",
    group: "Operations",
    description: "Case management with SLAs",
  },
  {
    id: "notifications",
    label: "Notifications",
    route: "/notifications",
    minPlan: "core",
    group: "Communications",
    description: "Push/email/SMS messages",
  },
  {
    id: "announcements",
    label: "Announcements",
    route: "/announcements",
    minPlan: "plus",
    group: "Communications",
    description: "Long-form notices with pinning",
  },
  {
    id: "alerts",
    label: "Alerts",
    route: "/alerts",
    minPlan: "max",
    group: "Communications",
    description: "Rule-based operational alerting",
  },
  {
    id: "subscription",
    label: M.subscription,
    route: "/subscription",
    minPlan: "core",
    group: "Infrastructure",
    description: "Trial status, renewal quote, and offline payment",
    toggleable: false,
  },
  {
    id: "modules",
    label: M.modules,
    route: "/modules",
    minPlan: "core",
    group: "Infrastructure",
    description: "Module toggles and entitlements",
    toggleable: false,
  },
  {
    id: "permissions",
    label: M.roles,
    route: "/permissions",
    minPlan: "max",
    group: "Infrastructure",
    description: "Custom roles, assigned users, and module access",
    toggleable: false,
  },
  {
    id: "storage",
    label: M.storage,
    route: "/storage",
    minPlan: "plus",
    group: "Infrastructure",
    description: "Archive, quotas, cleanup",
  },
  {
    id: "settings",
    label: "Settings",
    route: "/settings",
    minPlan: "core",
    group: "Infrastructure",
    description: "Profile, appearance, and support",
    toggleable: false,
  },
  {
    id: "transport",
    label: "Transport",
    route: "/transport",
    minPlan: "plus",
    group: "Services",
    description: "Routes, fleet, students",
  },
  {
    id: "leave",
    label: M.leave,
    route: "/leave",
    minPlan: "plus",
    group: "Services",
    description: "Teacher leave approval · student leave in Connect",
  },
  {
    id: "fees",
    label: "Fees",
    route: "/fees",
    minPlan: "plus",
    group: "Services",
    description: "Fee structures and collection",
  },
  {
    id: "admissions",
    label: "Admissions",
    route: "/admissions",
    minPlan: "plus",
    group: "Services",
    description: "Application pipeline",
  },
  {
    id: "careers",
    label: "Careers",
    route: "/careers",
    minPlan: "max",
    group: "Services",
    description: "Hiring pipeline",
  },
  {
    id: "institute",
    label: M.institute,
    route: "/institute",
    minPlan: "core",
    group: "Institute",
    description: "Public institute identity",
  },
  {
    id: "templates",
    label: M.certificates,
    route: "/templates",
    minPlan: "plus",
    group: "Institute",
    description: "Certificate designs, student records, and issuance",
  },
  {
    id: "documents",
    label: M.documents,
    route: "/documents",
    minPlan: "plus",
    group: "Institute",
    description: "Document templates, generation, and publishing",
  },
  {
    id: "calendar",
    label: M.calendar,
    route: "/calendar",
    minPlan: "core",
    group: "Institute",
    description: "Holidays and exam windows",
  },
  {
    id: "events",
    label: M.events,
    route: "/events",
    minPlan: "plus",
    group: "Institute",
    description: "Institute-wide events owned by Admin",
  },
  {
    id: "reports",
    label: M.reports,
    route: "/reports",
    minPlan: "max",
    group: "Intelligence",
    description: "Download & export · Excel, PDF, CSV",
  },
  {
    id: "teacher-performance",
    label: M.performance,
    route: "/teacher-performance",
    minPlan: "max",
    group: "Intelligence",
    description: "Faculty ratings and trends",
  },
];

export function isModuleToggleable(mod: ModuleDef): boolean {
  return mod.toggleable !== false;
}

export function planIndex(tier: PlanTier): number {
  return PLAN_ORDER.indexOf(tier);
}

export function inferPlanFromStudentCount(studentCount: number): PlanTier {
  if (studentCount <= 500) return "core";
  if (studentCount <= 5000) return "plus";
  return "max";
}

export function planMeetsMin(current: PlanTier, minPlan: PlanTier): boolean {
  return planIndex(current) >= planIndex(minPlan);
}

/** Modules are no longer gated by plan tiers — all available; institutes restrict by turning off. */
export function isModuleAvailable(_mod: ModuleDef, _plan?: PlanTier): boolean {
  return true;
}

const DEFAULT_ENABLED_MODULES: Record<string, boolean> = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.id, true]),
);

/** All catalog modules enabled by default (locked modules stay on). */
export function defaultEnabledModules(_plan?: PlanTier): Record<string, boolean> {
  return { ...DEFAULT_ENABLED_MODULES };
}

const ENABLED_MODULES_KEY = "lumenx.admin.enabledModules.v1";
const MODULES_CHANGED_EVENT = "lumenx-admin-modules-changed";
const moduleListeners = new Set<() => void>();

let enabledModulesCache: Record<string, boolean> | null = null;

export function loadEnabledModules(): Record<string, boolean> {
  if (enabledModulesCache) {
    return enabledModulesCache;
  }
  const base = defaultEnabledModules();
  try {
    const raw = localStorage.getItem(ENABLED_MODULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      for (const mod of MODULE_CATALOG) {
        if (!isModuleToggleable(mod)) {
          base[mod.id] = true;
        } else if (typeof parsed[mod.id] === "boolean") {
          base[mod.id] = parsed[mod.id]!;
        }
      }
    }
  } catch {
    // keep defaults
  }

  // Nexus entitlement ceiling — disabled in Nexus ⇒ hidden in Admin for this institute.
  // Does not delete routes/data; re-enable in Nexus restores access.
  const withEntitlement = applyNexusEntitlementCeiling(base, readNexusModuleEntitlements());
  for (const mod of MODULE_CATALOG) {
    if (!isModuleToggleable(mod)) withEntitlement[mod.id] = true;
  }

  enabledModulesCache = withEntitlement;
  return enabledModulesCache;
}

export function saveEnabledModules(enabled: Record<string, boolean>): void {
  const next = { ...enabled };
  for (const mod of MODULE_CATALOG) {
    if (!isModuleToggleable(mod)) next[mod.id] = true;
  }
  try {
    localStorage.setItem(ENABLED_MODULES_KEY, JSON.stringify(next));
  } catch {
    // Persist failed — still notify listeners so in-session UI stays consistent.
  }
  // Re-apply Nexus ceiling so Admin cannot turn on a Nexus-disabled module.
  enabledModulesCache = applyNexusEntitlementCeiling(next, readNexusModuleEntitlements());
  for (const mod of MODULE_CATALOG) {
    if (!isModuleToggleable(mod)) enabledModulesCache[mod.id] = true;
  }
  moduleListeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MODULES_CHANGED_EVENT));
  }
}

function subscribeEnabledModules(listener: () => void): () => void {
  moduleListeners.add(listener);
  const onWindowEvent = () => {
    enabledModulesCache = null;
    listener();
  };
  const unsubNexus = subscribeNexusLicenseChanges(onWindowEvent);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onWindowEvent);
    window.addEventListener("focus", onWindowEvent);
    // Same-tab saveEnabledModules already notifies moduleListeners.
  }
  return () => {
    moduleListeners.delete(listener);
    unsubNexus();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onWindowEvent);
      window.removeEventListener("focus", onWindowEvent);
    }
  };
}

function getEnabledModulesSnapshot(): Record<string, boolean> {
  return loadEnabledModules();
}

export function useEnabledModules(): Record<string, boolean> {
  return useSyncExternalStore(
    subscribeEnabledModules,
    getEnabledModulesSnapshot,
    () => DEFAULT_ENABLED_MODULES,
  );
}

/** Whether an Admin nav route should be visible for the current module map. */
export function isAdminRouteModuleEnabled(
  route: string,
  enabled: Record<string, boolean>,
): boolean {
  const normalized = route === "" ? "/" : route;
  const mod = MODULE_CATALOG.filter((m) => {
    if (!m.route) return false;
    if (m.route === "/") return normalized === "/";
    return normalized === m.route || normalized.startsWith(`${m.route}/`);
  }).sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0))[0];
  if (!mod) return true;
  if (!isModuleToggleable(mod)) return true;
  return enabled[mod.id] !== false;
}

export const STORAGE_MODULE_WEIGHTS: Record<string, number> = {
  Students: 0.18,
  Exams: 0.12,
  Marks: 0.08,
  Media: 0.24,
  Assignments: 0.14,
  Documents: 0.1,
  Transport: 0.04,
  Temp: 0.1,
};

/** Default institute storage quota when plans are not used for licensing. */
export const DEFAULT_STORAGE_QUOTA_GB = 1024;

export function storageQuotaGb(plan?: PlanTier): number {
  if (plan) return PLAN_DETAILS[plan].storageGb;
  return DEFAULT_STORAGE_QUOTA_GB;
}
