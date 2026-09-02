/**
 * Nexus institute licensing — plan truth, module entitlement, renewals.
 * Single store for Plans & Modules (demo/localStorage). Admin consumes what Nexus grants.
 */

import { formatDateTimeEnIn, formatInrOrDash } from "@lumenx/utils";
import {
  NEXUS_LICENSE_CHANGED_EVENT,
  NEXUS_LICENSE_LEGACY_STORAGE_KEYS,
  NEXUS_LICENSE_STORAGE_KEY,
} from "@lumenx/config";
import { appendAuditEvent } from "@/lib/audit-log-store";
import {
  ADMIN_MODULES_MOVED_TO_APPS,
  CONNECT_PORTAL_CATALOG,
  PLATFORM_APP_CATALOG,
  connectPortalDef,
  defaultAppEntitlements,
  defaultConnectEntitlements,
  defaultConnectPortalModules,
  type ConnectPortalId,
  type PlatformAppId,
} from "@/lib/platform-entitlement-catalog";

export type {
  ConnectPortalId,
  PlatformAppId,
  EntitlementFeatureDef,
  ConnectPortalDef,
  PlatformAppDef,
} from "@/lib/platform-entitlement-catalog";

export {
  ADMIN_MODULES_MOVED_TO_APPS,
  CONNECT_PORTAL_CATALOG,
  PLATFORM_APP_CATALOG,
  connectPortalDef,
  platformAppDef,
  defaultConnectEntitlements,
  defaultAppEntitlements,
} from "@/lib/platform-entitlement-catalog";

export type BillingCadence = "monthly" | "yearly";
export type PlanTier = "core" | "plus" | "max";
/** LumenX → institute commercial model (not student fees). */
export type BillingModel = "per_institute" | "per_student" | "custom";
export type PlatformPaymentStatus = "paid" | "pending" | "overdue";

export type LicensePaymentRecord = {
  id: string;
  amountInr: number;
  recordedAt: string;
  note?: string;
  method?: "bank_transfer" | "upi" | "cheque" | "other";
};

export type NexusModuleGroup =
  | "Core"
  | "Operations"
  | "Communications"
  | "Intelligence"
  | "Infrastructure"
  | "Services"
  | "Institute";

export type NexusModuleDef = {
  id: string;
  label: string;
  description: string;
  group: NexusModuleGroup;
  /** Minimum plan that may entitle this module. */
  minPlan: PlanTier;
};

export type PlanDef = {
  id: PlanTier;
  label: string;
  description: string;
  /** Suggested list price (demo) when assigning this plan yearly. */
  suggestedYearlyInr: number;
  suggestedMonthlyInr: number;
};

export type InstituteSeed = {
  id: string;
  name: string;
  studentCount: number;
  city: string;
};

export type InstituteLicense = {
  instituteId: string;
  /** Nexus-owned plan truth. */
  plan: PlanTier;
  cadence: BillingCadence;
  /**
   * Calculated / billed amount for the current period (₹).
   * Derived from billingModel + rateInr (+ student count when per_student).
   */
  amountInr: number;
  /** Per-institute flat, per-student rate, or custom agreed rate. */
  billingModel: BillingModel;
  /** Rate used with billingModel (₹). */
  rateInr: number;
  /** Cumulative paid against current billed amount (demo). */
  paidAmountInr: number;
  /** Payment history — LumenX → institute only. */
  payments: LicensePaymentRecord[];
  /** datetime-local string, e.g. 2026-07-21T10:00 */
  startAt: string;
  reminderDays: number[];
  /** Admin app module entitlement map — true = Nexus grants to Admin. */
  modules: Record<string, boolean>;
  /** Connect portals — portal-level + module-level. */
  connect: Record<ConnectPortalId, ConnectPortalEntitlement>;
  /** Whole apps — Careers, Admissions, Transport (not per-module). */
  apps: Record<PlatformAppId, AppEntitlement>;
  updatedAt?: string;
};

export type ConnectPortalEntitlement = {
  enabled: boolean;
  modules: Record<string, boolean>;
};

export type AppEntitlement = {
  enabled: boolean;
};

export const PLAN_ORDER: PlanTier[] = ["core", "plus", "max"];

export const PLAN_CATALOG: PlanDef[] = [
  {
    id: "core",
    label: "Core",
    description: "People, attendance, and essential communications.",
    suggestedYearlyInr: 99999,
    suggestedMonthlyInr: 9999,
  },
  {
    id: "plus",
    label: "Plus",
    description: "Academics, ops, and broader communications.",
    suggestedYearlyInr: 179999,
    suggestedMonthlyInr: 17999,
  },
  {
    id: "max",
    label: "Max",
    description: "Full module entitlement including intelligence & infrastructure.",
    suggestedYearlyInr: 299999,
    suggestedMonthlyInr: 29999,
  },
];

export const REMINDER_DAY_OPTIONS = [30, 14, 7, 3, 1] as const;

export const NEXUS_MODULE_CATALOG: NexusModuleDef[] = [
  // IDs align with Admin MODULE_CATALOG so entitlement hides the same nav items.
  { id: "students", label: "Students", description: "Directory, admissions, 360 profiles", group: "Core", minPlan: "core" },
  { id: "teachers", label: "Teachers", description: "Faculty records, workload, ratings", group: "Core", minPlan: "core" },
  { id: "parents", label: "Parents", description: "Parent portal access (managed in Admin)", group: "Core", minPlan: "core" },
  { id: "classes", label: "Classes & Sections", description: "Class structure and section assignments", group: "Core", minPlan: "core" },
  { id: "academic-management", label: "Academic Management", description: "Years, promotion, graduation", group: "Core", minPlan: "core" },
  { id: "subjects", label: "Subjects", description: "Subject catalog and assignment", group: "Core", minPlan: "core" },
  { id: "student-attendance", label: "Student Attendance", description: "Central attendance workspace", group: "Operations", minPlan: "core" },
  { id: "attendance", label: "Attendance Reports", description: "Monitor, reports, analytics", group: "Operations", minPlan: "core" },
  { id: "teacher-attendance", label: "Staff Attendance", description: "Teacher attendance", group: "Operations", minPlan: "core" },
  { id: "timetable", label: "Timetable", description: "Conflict-aware schedule builder", group: "Operations", minPlan: "plus" },
  { id: "exams", label: "Exams", description: "Exam scheduling", group: "Operations", minPlan: "plus" },
  { id: "marks", label: "Marks", description: "Marks entry and publication", group: "Operations", minPlan: "plus" },
  { id: "homework", label: "Homework", description: "Homework workflows", group: "Operations", minPlan: "plus" },
  { id: "diary", label: "Diary", description: "Class diary", group: "Operations", minPlan: "plus" },
  { id: "complaints", label: "Complaints", description: "Case management with SLAs", group: "Operations", minPlan: "plus" },
  { id: "notifications", label: "Notifications", description: "Push/email/SMS triggered messages", group: "Communications", minPlan: "core" },
  { id: "announcements", label: "Announcements", description: "Long-form notices with pinning", group: "Communications", minPlan: "plus" },
  { id: "events", label: "Events", description: "Calendar, RSVPs, audience targeting", group: "Communications", minPlan: "plus" },
  { id: "alerts", label: "Alerts", description: "Rule-based operational alerting", group: "Communications", minPlan: "plus" },
  { id: "analytics", label: "Analytics", description: "Cohort and performance intelligence", group: "Intelligence", minPlan: "plus" },
  { id: "reports", label: "Reports", description: "Institute reports export", group: "Intelligence", minPlan: "plus" },
  { id: "teacher-performance", label: "Teacher Performance", description: "Faculty ratings and trends", group: "Intelligence", minPlan: "max" },
  { id: "storage", label: "Storage", description: "Archive, quotas, cleanup", group: "Infrastructure", minPlan: "plus" },
  { id: "transport", label: "Transport", description: "Routes, fleet, students", group: "Services", minPlan: "plus" },
  { id: "leave", label: "Leave", description: "Teacher leave approval", group: "Services", minPlan: "plus" },
  { id: "fees", label: "Fees", description: "Fee structures and collection", group: "Services", minPlan: "plus" },
  { id: "admissions", label: "Admissions", description: "Application pipeline", group: "Services", minPlan: "plus" },
  { id: "careers", label: "Careers", description: "Hiring pipeline", group: "Services", minPlan: "max" },
  { id: "institute", label: "Institute Profile", description: "Public institute identity", group: "Institute", minPlan: "core" },
  { id: "templates", label: "Certificates / Templates", description: "Certificate templates", group: "Institute", minPlan: "plus" },
  { id: "documents", label: "Documents", description: "Document hub", group: "Institute", minPlan: "plus" },
  { id: "calendar", label: "Calendar", description: "Institute calendar", group: "Institute", minPlan: "core" },
];

export const SEED_INSTITUTES: InstituteSeed[] = [
  { id: "ins-delhi-riverside", name: "Delhi Riverside Academy", studentCount: 1840, city: "New Delhi" },
  { id: "ins-mumbai-harbor", name: "Harbor High School", studentCount: 920, city: "Mumbai" },
  { id: "ins-bengaluru-oak", name: "Oakridge Public School", studentCount: 2105, city: "Bengaluru" },
  { id: "ins-hyderabad-lotus", name: "Lotus International", studentCount: 640, city: "Hyderabad" },
  { id: "ins-chennai-shore", name: "Shoreline Senior Secondary", studentCount: 1180, city: "Chennai" },
];

const STORAGE_KEY = NEXUS_LICENSE_STORAGE_KEY;
const LEGACY_STORAGE_KEYS = NEXUS_LICENSE_LEGACY_STORAGE_KEYS;
const CHANGE_EVENT = NEXUS_LICENSE_CHANGED_EVENT;

function nowIso(): string {
  return new Date().toISOString();
}

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function planIndex(plan: PlanTier): number {
  return PLAN_ORDER.indexOf(plan);
}

export function planLabel(plan: PlanTier): string {
  return PLAN_CATALOG.find((p) => p.id === plan)?.label ?? plan;
}

export function planMeetsMin(current: PlanTier, minPlan: PlanTier): boolean {
  return planIndex(current) >= planIndex(minPlan);
}

export function nextPlan(plan: PlanTier): PlanTier | null {
  const i = planIndex(plan);
  return i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1]! : null;
}

export function prevPlan(plan: PlanTier): PlanTier | null {
  const i = planIndex(plan);
  return i > 0 ? PLAN_ORDER[i - 1]! : null;
}

export function getPlanDef(plan: PlanTier): PlanDef {
  return PLAN_CATALOG.find((p) => p.id === plan) ?? PLAN_CATALOG[0]!;
}

/** Default entitlements for a plan (all modules at or below the tier on). */
export function defaultModulesForPlan(plan: PlanTier): Record<string, boolean> {
  return Object.fromEntries(
    NEXUS_MODULE_CATALOG.map((m) => [m.id, planMeetsMin(plan, m.minPlan)]),
  );
}

export function defaultModulesOn(): Record<string, boolean> {
  return defaultModulesForPlan("max");
}

export function isModuleEntitledByPlan(moduleId: string, plan: PlanTier): boolean {
  const mod = NEXUS_MODULE_CATALOG.find((m) => m.id === moduleId);
  if (!mod) return false;
  return planMeetsMin(plan, mod.minPlan);
}

/**
 * After a plan change: keep existing grants that still fit; turn off modules
 * above the new plan; turn on newly entitled defaults on upgrade.
 */
export function reconcileModulesForPlan(
  plan: PlanTier,
  previous: Record<string, boolean>,
  mode: "upgrade" | "downgrade" | "assign",
): Record<string, boolean> {
  const defaults = defaultModulesForPlan(plan);
  const out: Record<string, boolean> = {};
  for (const m of NEXUS_MODULE_CATALOG) {
    const entitled = planMeetsMin(plan, m.minPlan);
    if (!entitled) {
      out[m.id] = false;
      continue;
    }
    if (mode === "assign") {
      out[m.id] = defaults[m.id] ?? false;
    } else if (mode === "upgrade") {
      // Keep prior ons; newly entitled modules follow plan defaults (on).
      out[m.id] = previous[m.id] === true ? true : (defaults[m.id] ?? false);
    } else {
      // Downgrade: keep prior preference among still-entitled modules.
      out[m.id] = previous[m.id] === true;
    }
  }
  return out;
}

export function billingModelLabel(model: BillingModel): string {
  if (model === "per_institute") return "Per institute";
  if (model === "per_student") return "Per student / head";
  return "Custom";
}

export function studentCountFor(instituteId: string, institutes: readonly InstituteSeed[] = SEED_INSTITUTES): number {
  return institutes.find((i) => i.id === instituteId)?.studentCount ?? 0;
}

/**
 * Calculate billed amount from model + rate.
 * Example: ₹10 × 500 students = ₹5,000
 */
export function calculateBilledAmount(input: {
  billingModel: BillingModel;
  rateInr: number;
  studentCount: number;
  /** Optional override used when model is custom (falls back to rateInr). */
  customAmountInr?: number;
}): number {
  const rate = Math.max(0, Number(input.rateInr) || 0);
  if (input.billingModel === "per_student") {
    return Math.round(rate * Math.max(0, input.studentCount));
  }
  if (input.billingModel === "custom") {
    const custom = input.customAmountInr;
    if (custom !== undefined && custom !== null && !Number.isNaN(Number(custom))) {
      return Math.max(0, Math.round(Number(custom)));
    }
    return Math.round(rate);
  }
  // per_institute — flat rate for the institute
  return Math.round(rate);
}

export function pendingAmountInr(license: InstituteLicense): number {
  return Math.max(0, Math.round(license.amountInr) - Math.round(license.paidAmountInr));
}

export function paymentStatusFor(
  license: InstituteLicense,
  now: Date = new Date(),
): PlatformPaymentStatus {
  const pending = pendingAmountInr(license);
  if (pending <= 0) return "paid";
  const due = nextRenewalDate(license, now) ?? parseStartAt(license.startAt);
  if (due && due.getTime() < now.getTime()) return "overdue";
  return "pending";
}

export function paymentStatusTone(
  status: PlatformPaymentStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

export function labelPaymentStatus(status: PlatformPaymentStatus): string {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  return "Overdue";
}

export function formatMoneyInr(amount: number): string {
  return formatInrOrDash(amount, { treatZeroAsEmpty: false });
}

export function defaultLicense(instituteId: string, plan: PlanTier = "core"): InstituteLicense {
  const def = getPlanDef(plan);
  const rateInr = def.suggestedYearlyInr;
  const apps = defaultAppEntitlements();
  const modules = syncAdminModulesWithApps(defaultModulesForPlan(plan), apps);
  return {
    instituteId,
    plan,
    cadence: "yearly",
    billingModel: "per_institute",
    rateInr,
    amountInr: rateInr,
    paidAmountInr: 0,
    payments: [],
    startAt: nowDateTimeLocal(),
    reminderDays: [7, 3, 1],
    modules,
    connect: defaultConnectEntitlements(),
    apps,
    updatedAt: nowIso(),
  };
}

/** Keep Admin admissions/careers/transport modules aligned with whole-app toggles. */
function syncAdminModulesWithApps(
  modules: Record<string, boolean>,
  apps: Record<PlatformAppId, AppEntitlement>,
): Record<string, boolean> {
  const next = { ...modules };
  for (const app of PLATFORM_APP_CATALOG) {
    if (app.adminModuleId) {
      next[app.adminModuleId] = apps[app.id]?.enabled !== false;
    }
  }
  return next;
}

function normalizeConnect(
  raw: InstituteLicense["connect"] | undefined,
): Record<ConnectPortalId, ConnectPortalEntitlement> {
  const base = defaultConnectEntitlements();
  if (!raw || typeof raw !== "object") return base;
  for (const portal of CONNECT_PORTAL_CATALOG) {
    const incoming = raw[portal.id];
    if (!incoming) continue;
    const modules = { ...defaultConnectPortalModules(portal.id), ...(incoming.modules ?? {}) };
    for (const f of portal.features) {
      if (f.toggleable === false) modules[f.id] = true;
    }
    base[portal.id] = {
      enabled: incoming.enabled !== false,
      modules,
    };
  }
  return base;
}

function normalizeApps(
  raw: InstituteLicense["apps"] | undefined,
  modules?: Record<string, boolean>,
): Record<PlatformAppId, AppEntitlement> {
  const base = defaultAppEntitlements();
  if (raw && typeof raw === "object") {
    for (const app of PLATFORM_APP_CATALOG) {
      if (raw[app.id]) {
        base[app.id] = { enabled: raw[app.id].enabled !== false };
      } else if (app.adminModuleId && modules && modules[app.adminModuleId] === false) {
        base[app.id] = { enabled: false };
      }
    }
  } else if (modules) {
    for (const app of PLATFORM_APP_CATALOG) {
      if (app.adminModuleId && modules[app.adminModuleId] === false) {
        base[app.id] = { enabled: false };
      }
    }
  }
  return base;
}

function ensureLicenseShape(lic: InstituteLicense): InstituteLicense {
  const apps = normalizeApps(lic.apps, lic.modules);
  const modules = syncAdminModulesWithApps(lic.modules ?? defaultModulesForPlan(lic.plan), apps);
  return {
    ...lic,
    connect: normalizeConnect(lic.connect),
    apps,
    modules,
  };
}

function seedLicenses(): Record<string, InstituteLicense> {
  const raw = seedLicensesRaw();
  return Object.fromEntries(
    Object.entries(raw).map(([id, lic]) => [id, ensureLicenseShape(lic)]),
  );
}

function seedLicensesRaw(): Record<string, InstituteLicense> {
  const out: Record<string, InstituteLicense> = {};
  for (const inst of SEED_INSTITUTES) {
    if (inst.id === "ins-delhi-riverside") {
      const rateInr = 249999;
      out[inst.id] = {
        ...defaultLicense(inst.id, "max"),
        cadence: "yearly",
        billingModel: "per_institute",
        rateInr,
        amountInr: rateInr,
        paidAmountInr: rateInr,
        payments: [
          {
            id: "pay-delhi-1",
            amountInr: rateInr,
            recordedAt: "2026-04-02T11:00:00.000Z",
            note: "Annual Max license",
            method: "bank_transfer",
          },
        ],
        startAt: "2026-04-01T09:00",
        reminderDays: [30, 7, 1],
        modules: {
          ...defaultModulesForPlan("max"),
          // Demo story: this institute does not use Transport — Admin / Transport app off.
          transport: false,
        },
        apps: {
          ...defaultAppEntitlements(),
          transport: { enabled: false },
        },
      };
    } else if (inst.id === "ins-mumbai-harbor") {
      const rateInr = 25;
      const amountInr = calculateBilledAmount({
        billingModel: "per_student",
        rateInr,
        studentCount: inst.studentCount,
      });
      out[inst.id] = {
        ...defaultLicense(inst.id, "plus"),
        cadence: "monthly",
        billingModel: "per_student",
        rateInr,
        amountInr,
        paidAmountInr: 15000,
        payments: [
          {
            id: "pay-mumbai-1",
            amountInr: 10000,
            recordedAt: "2026-06-26T10:00:00.000Z",
            note: "Partial — June",
            method: "upi",
          },
          {
            id: "pay-mumbai-2",
            amountInr: 5000,
            recordedAt: "2026-07-05T10:00:00.000Z",
            note: "Follow-up",
            method: "upi",
          },
        ],
        startAt: "2026-06-25T10:00",
        reminderDays: [7, 3, 1],
        modules: {
          ...defaultModulesForPlan("plus"),
          analytics: false,
        },
      };
    } else if (inst.id === "ins-bengaluru-oak") {
      const rateInr = 299999;
      out[inst.id] = {
        ...defaultLicense(inst.id, "max"),
        cadence: "yearly",
        billingModel: "per_institute",
        rateInr,
        amountInr: rateInr,
        paidAmountInr: 0,
        payments: [],
        startAt: "2025-07-28T11:00",
        reminderDays: [30, 14, 7, 1],
        modules: defaultModulesForPlan("max"),
      };
    } else if (inst.id === "ins-hyderabad-lotus") {
      const rateInr = 165000;
      out[inst.id] = {
        ...defaultLicense(inst.id, "plus"),
        billingModel: "custom",
        rateInr,
        amountInr: rateInr,
        paidAmountInr: 50000,
        payments: [
          {
            id: "pay-hyd-1",
            amountInr: 50000,
            recordedAt: "2026-08-05T09:00:00.000Z",
            note: "Custom contract deposit",
            method: "cheque",
          },
        ],
        startAt: "2026-08-01T09:00",
        modules: {
          ...defaultModulesForPlan("plus"),
          exams: false,
          complaints: false,
          analytics: false,
        },
      };
    } else if (inst.id === "ins-chennai-shore") {
      const rateInr = 10;
      const amountInr = calculateBilledAmount({
        billingModel: "per_student",
        rateInr,
        studentCount: inst.studentCount,
      }); // 10 × 1180 = 11,800
      out[inst.id] = {
        ...defaultLicense(inst.id, "core"),
        billingModel: "per_student",
        rateInr,
        amountInr,
        paidAmountInr: amountInr,
        payments: [
          {
            id: "pay-chennai-1",
            amountInr,
            recordedAt: "2026-03-16T10:00:00.000Z",
            note: "₹10 × 1,180 students",
            method: "bank_transfer",
          },
        ],
        startAt: "2026-03-15T10:00",
        modules: defaultModulesForPlan("core"),
      };
    } else {
      out[inst.id] = defaultLicense(inst.id, "core");
    }
  }
  return out;
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function normalizeLicense(raw: Partial<InstituteLicense> & { instituteId: string }): InstituteLicense {
  const plan: PlanTier =
    raw.plan === "core" || raw.plan === "plus" || raw.plan === "max" ? raw.plan : "core";
  const base = defaultLicense(raw.instituteId, plan);
  const modules = { ...defaultModulesForPlan(plan), ...raw.modules };
  for (const m of NEXUS_MODULE_CATALOG) {
    if (!planMeetsMin(plan, m.minPlan)) modules[m.id] = false;
  }

  const billingModel: BillingModel =
    raw.billingModel === "per_institute" ||
    raw.billingModel === "per_student" ||
    raw.billingModel === "custom"
      ? raw.billingModel
      : "per_institute";

  const rateInr =
    typeof raw.rateInr === "number" && !Number.isNaN(raw.rateInr)
      ? Math.max(0, raw.rateInr)
      : typeof raw.amountInr === "number"
        ? Math.max(0, raw.amountInr)
        : base.rateInr;

  const students = studentCountFor(raw.instituteId);
  const amountInr = calculateBilledAmount({
    billingModel,
    rateInr,
    studentCount: students,
    customAmountInr:
      billingModel === "custom"
        ? (typeof raw.amountInr === "number" ? raw.amountInr : rateInr)
        : undefined,
  });

  const payments = Array.isArray(raw.payments) ? raw.payments : [];
  const paidFromHistory = payments.reduce((sum, p) => sum + (Number(p.amountInr) || 0), 0);
  const paidAmountInr =
    typeof raw.paidAmountInr === "number" && !Number.isNaN(raw.paidAmountInr)
      ? Math.max(0, raw.paidAmountInr)
      : paidFromHistory;

  return ensureLicenseShape({
    ...base,
    ...raw,
    plan,
    billingModel,
    rateInr,
    amountInr,
    paidAmountInr,
    payments,
    modules,
    connect: normalizeConnect(raw.connect),
    apps: normalizeApps(raw.apps, modules),
    reminderDays: Array.isArray(raw.reminderDays) && raw.reminderDays.length > 0
      ? [...raw.reminderDays].sort((a, b) => b - a)
      : base.reminderDays,
    updatedAt: raw.updatedAt ?? nowIso(),
  });
}

export function loadLicenses(): Record<string, InstituteLicense> {
  if (typeof localStorage === "undefined") return seedLicenses();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let fromLegacy = false;
    if (!raw) {
      for (const key of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) {
          fromLegacy = true;
          break;
        }
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Partial<InstituteLicense>>;
      const merged: Record<string, InstituteLicense> = {};
      for (const [id, lic] of Object.entries(parsed)) {
        merged[id] = normalizeLicense({ ...lic, instituteId: id });
      }
      // Fill any seed institutes missing from stored data.
      const seeds = seedLicenses();
      for (const [id, seed] of Object.entries(seeds)) {
        if (!merged[id]) merged[id] = seed;
      }
      const needsWrite =
        fromLegacy ||
        Object.values(parsed).some((lic) => !lic?.connect || !lic?.apps) ||
        Object.keys(merged).length !== Object.keys(parsed).length;
      if (needsWrite) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        for (const key of LEGACY_STORAGE_KEYS) {
          try {
            localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        }
        void import("@/lib/nexus-license-directory-bridge").then((m) => {
          m.projectLicensesToDirectory(merged);
        });
      }
      return merged;
    }
  } catch {
    // fall through
  }
  const seed = seedLicenses();
  saveLicenses(seed);
  return seed;
}

export function saveLicenses(map: Record<string, InstituteLicense>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
  // Directory is a projection of licensing — keep portfolio UIs in sync.
  void import("@/lib/nexus-license-directory-bridge").then((m) => {
    m.projectLicensesToDirectory(map);
  });
}

export function saveLicense(license: InstituteLicense): Record<string, InstituteLicense> {
  const map = loadLicenses();
  map[license.instituteId] = normalizeLicense({ ...license, updatedAt: nowIso() });
  saveLicenses(map);
  return map;
}

export function getLicense(instituteId: string): InstituteLicense {
  const map = loadLicenses();
  const lic = map[instituteId] ?? defaultLicense(instituteId, "core");
  return ensureLicenseShape(lic);
}

/** Entitlement map for one institute — licensing SoT (not directory seed). */
export function resolveInstituteModules(instituteId: string): Record<string, boolean> {
  return { ...getLicense(instituteId).modules };
}

/**
 * Ensure every directory institute has a license row.
 * Licensing remains SoT; seeds fill gaps for directory-only institutes.
 */
export function ensureLicensesCoverDirectory(): void {
  if (typeof window === "undefined") return;
  void import("@/lib/institute-directory-store").then((dir) => {
    const map = { ...loadLicenses() };
    let changed = false;
    for (const i of dir.listPlatformInstitutes()) {
      if (map[i.id]) continue;
      map[i.id] = {
        ...defaultLicense(i.id, i.plan),
        cadence: i.billingCadence,
        amountInr: i.amountInr,
        rateInr: i.amountInr,
        paidAmountInr: i.paidAmountInr,
        startAt: i.billingStartAt,
        modules: { ...defaultModulesForPlan(i.plan), ...i.modules },
      };
      changed = true;
    }
    if (changed) saveLicenses(map);
  });
}

export function subscribeLicenses(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || LEGACY_STORAGE_KEYS.includes(e.key as typeof LEGACY_STORAGE_KEYS[number])) {
      listener();
    }
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export type AssignPlanOptions = {
  /** Reset modules to plan defaults (default true for assign). */
  resetModules?: boolean;
  /** Adjust amount to plan suggestion (default true). */
  applySuggestedAmount?: boolean;
};

function instituteLabel(instituteId: string): string {
  return SEED_INSTITUTES.find((i) => i.id === instituteId)?.name ?? instituteId;
}

function moduleLabel(moduleId: string): string {
  return NEXUS_MODULE_CATALOG.find((m) => m.id === moduleId)?.label ?? moduleId;
}

/** Assign or replace plan (Nexus plan truth). */
export function assignPlan(
  instituteId: string,
  plan: PlanTier,
  options: AssignPlanOptions = {},
): InstituteLicense {
  const current = getLicense(instituteId);
  const prevPlan = current.plan;
  const { resetModules = true, applySuggestedAmount = true } = options;
  const def = getPlanDef(plan);
  const mode =
    planIndex(plan) > planIndex(current.plan)
      ? "upgrade"
      : planIndex(plan) < planIndex(current.plan)
        ? "downgrade"
        : "assign";
  const modules = resetModules
    ? defaultModulesForPlan(plan)
    : reconcileModulesForPlan(plan, current.modules, mode === "assign" ? "assign" : mode);

  const amountInr = applySuggestedAmount
    ? current.billingModel === "per_student"
      ? calculateBilledAmount({
          billingModel: "per_student",
          rateInr: current.rateInr,
          studentCount: studentCountFor(instituteId),
        })
      : current.cadence === "monthly"
        ? def.suggestedMonthlyInr
        : def.suggestedYearlyInr
    : current.amountInr;

  const rateInr =
    applySuggestedAmount && current.billingModel === "per_institute"
      ? amountInr
      : current.rateInr;

  const next: InstituteLicense = {
    ...current,
    plan,
    modules,
    amountInr,
    rateInr,
    updatedAt: nowIso(),
  };
  saveLicense(next);
  if (prevPlan !== plan) {
    appendAuditEvent({
      action: "plan_changed",
      targetId: instituteId,
      targetLabel: instituteLabel(instituteId),
      targetKind: "license",
      before: planLabel(prevPlan),
      after: planLabel(plan),
      summary: mode === "upgrade" ? "Plan upgraded" : mode === "downgrade" ? "Plan downgraded" : "Plan assigned",
    });
  }
  return next;
}

export function changePlan(
  instituteId: string,
  plan: PlanTier,
  options?: AssignPlanOptions,
): InstituteLicense {
  return assignPlan(instituteId, plan, {
    resetModules: false,
    applySuggestedAmount: options?.applySuggestedAmount ?? true,
    ...options,
  });
}

export function upgradePlan(instituteId: string): InstituteLicense | null {
  const current = getLicense(instituteId);
  const up = nextPlan(current.plan);
  if (!up) return null;
  return changePlan(instituteId, up, { resetModules: false, applySuggestedAmount: true });
}

export function downgradePlan(instituteId: string): InstituteLicense | null {
  const current = getLicense(instituteId);
  const down = prevPlan(current.plan);
  if (!down) return null;
  return changePlan(instituteId, down, { resetModules: false, applySuggestedAmount: true });
}

export function enableModule(instituteId: string, moduleId: string): InstituteLicense | null {
  const current = getLicense(instituteId);
  if (!current) return null;
  if (current.modules[moduleId]) return current;
  const modules = { ...current.modules, [moduleId]: true };
  const apps = { ...current.apps };
  for (const app of PLATFORM_APP_CATALOG) {
    if (app.adminModuleId === moduleId) {
      apps[app.id] = { enabled: true };
    }
  }
  const next: InstituteLicense = {
    ...current,
    modules: syncAdminModulesWithApps(modules, apps),
    apps,
    updatedAt: nowIso(),
  };
  saveLicense(next);
  appendAuditEvent({
    action: "module_enabled",
    targetId: instituteId,
    targetLabel: `${instituteLabel(instituteId)} · ${moduleLabel(moduleId)}`,
    targetKind: "module",
    before: "Disabled",
    after: "Enabled",
    summary: "Module entitlement restored",
  });
  return next;
}

export function disableModule(instituteId: string, moduleId: string): InstituteLicense {
  const current = getLicense(instituteId);
  if (current.modules[moduleId] === false) return current;
  const modules = { ...current.modules, [moduleId]: false };
  const apps = { ...current.apps };
  for (const app of PLATFORM_APP_CATALOG) {
    if (app.adminModuleId === moduleId) {
      apps[app.id] = { enabled: false };
    }
  }
  const next: InstituteLicense = {
    ...current,
    modules: syncAdminModulesWithApps(modules, apps),
    apps,
    updatedAt: nowIso(),
  };
  saveLicense(next);
  appendAuditEvent({
    action: "module_disabled",
    targetId: instituteId,
    targetLabel: `${instituteLabel(instituteId)} · ${moduleLabel(moduleId)}`,
    targetKind: "module",
    before: "Enabled",
    after: "Disabled",
    summary: "Entitlement off · data retained",
  });
  return next;
}

export function setModuleEnabled(
  instituteId: string,
  moduleId: string,
  enabled: boolean,
): InstituteLicense | null {
  return enabled ? enableModule(instituteId, moduleId) : disableModule(instituteId, moduleId);
}

/** Enable multiple modules for one institute (à-la-carte — no plan gate). */
export function enableModules(
  instituteId: string,
  moduleIds: string[],
): InstituteLicense {
  const current = getLicense(instituteId);
  const modules = { ...current.modules };
  const enabled: string[] = [];
  for (const id of moduleIds) {
    if (!modules[id]) {
      modules[id] = true;
      enabled.push(id);
    }
  }
  const next: InstituteLicense = { ...current, modules, updatedAt: nowIso() };
  saveLicense(next);
  if (enabled.length > 0) {
    appendAuditEvent({
      action: "module_enabled",
      targetId: instituteId,
      targetLabel: `${instituteLabel(instituteId)} · ${enabled.map(moduleLabel).join(", ")}`,
      targetKind: "module",
      before: "Disabled",
      after: `Enabled (${enabled.length})`,
      summary: "Bulk module entitlement on",
    });
  }
  return next;
}

/** Disable multiple modules for one institute. Data/routes are preserved. */
export function disableModules(
  instituteId: string,
  moduleIds: string[],
): InstituteLicense {
  const current = getLicense(instituteId);
  const modules = { ...current.modules };
  const disabled: string[] = [];
  for (const id of moduleIds) {
    if (modules[id] !== false) {
      modules[id] = false;
      disabled.push(id);
    }
  }
  const next: InstituteLicense = { ...current, modules, updatedAt: nowIso() };
  saveLicense(next);
  if (disabled.length > 0) {
    appendAuditEvent({
      action: "module_disabled",
      targetId: instituteId,
      targetLabel: `${instituteLabel(instituteId)} · ${disabled.map(moduleLabel).join(", ")}`,
      targetKind: "module",
      before: "Enabled",
      after: `Disabled (${disabled.length})`,
      summary: "Bulk entitlement off · data retained",
    });
  }
  return next;
}

export function setModulesEnabled(
  instituteId: string,
  moduleIds: string[],
  enabled: boolean,
): InstituteLicense {
  return enabled ? enableModules(instituteId, moduleIds) : disableModules(instituteId, moduleIds);
}

/** Admin catalog entries shown in Modules UI (excludes whole-app surfaces). */
export function adminModulesForUi(): typeof NEXUS_MODULE_CATALOG {
  const moved = new Set<string>(ADMIN_MODULES_MOVED_TO_APPS);
  return NEXUS_MODULE_CATALOG.filter((m) => !moved.has(m.id));
}

export function setConnectPortalEnabled(
  instituteId: string,
  portalId: ConnectPortalId,
  enabled: boolean,
): InstituteLicense {
  const current = getLicense(instituteId);
  const connect = {
    ...current.connect,
    [portalId]: { ...current.connect[portalId], enabled },
  };
  const next: InstituteLicense = { ...current, connect, updatedAt: nowIso() };
  saveLicense(next);
  appendAuditEvent({
    action: enabled ? "module_enabled" : "module_disabled",
    targetId: instituteId,
    targetLabel: `${instituteLabel(instituteId)} · Connect ${connectPortalDef(portalId).label} portal`,
    targetKind: "module",
    before: enabled ? "Off" : "On",
    after: enabled ? "On" : "Off",
    summary: enabled ? "Connect portal enabled" : "Connect portal disabled · data retained",
  });
  return next;
}

export function setConnectPortalModuleEnabled(
  instituteId: string,
  portalId: ConnectPortalId,
  moduleId: string,
  enabled: boolean,
): InstituteLicense | null {
  const portal = connectPortalDef(portalId);
  const feature = portal.features.find((f) => f.id === moduleId);
  if (!feature || feature.toggleable === false) return null;

  const current = getLicense(instituteId);
  const modules = { ...current.connect[portalId].modules, [moduleId]: enabled };
  const connect = {
    ...current.connect,
    [portalId]: { ...current.connect[portalId], modules },
  };
  const next: InstituteLicense = { ...current, connect, updatedAt: nowIso() };
  saveLicense(next);
  appendAuditEvent({
    action: enabled ? "module_enabled" : "module_disabled",
    targetId: instituteId,
    targetLabel: `${instituteLabel(instituteId)} · Connect ${portal.label} · ${feature.label}`,
    targetKind: "module",
    before: enabled ? "Off" : "On",
    after: enabled ? "On" : "Off",
    summary: "Connect portal module entitlement",
  });
  return next;
}

export function setPlatformAppEnabled(
  instituteId: string,
  appId: PlatformAppId,
  enabled: boolean,
): InstituteLicense {
  const current = getLicense(instituteId);
  const apps = { ...current.apps, [appId]: { enabled } };
  const modules = syncAdminModulesWithApps(current.modules, apps);
  const next: InstituteLicense = { ...current, apps, modules, updatedAt: nowIso() };
  saveLicense(next);
  const app = PLATFORM_APP_CATALOG.find((a) => a.id === appId)!;
  appendAuditEvent({
    action: enabled ? "module_enabled" : "module_disabled",
    targetId: instituteId,
    targetLabel: `${instituteLabel(instituteId)} · ${app.label} app`,
    targetKind: "module",
    before: enabled ? "Off" : "On",
    after: enabled ? "On" : "Off",
    summary: enabled ? "Whole app enabled" : "Whole app disabled · data retained",
  });
  return next;
}

export type RenewalConfigInput = {
  cadence?: BillingCadence;
  amountInr?: number;
  startAt?: string;
  reminderDays?: number[];
};

export function configureRenewal(
  instituteId: string,
  config: RenewalConfigInput,
): InstituteLicense {
  const current = getLicense(instituteId);
  const next: InstituteLicense = {
    ...current,
    cadence: config.cadence ?? current.cadence,
    amountInr: config.amountInr ?? current.amountInr,
    startAt: config.startAt ?? current.startAt,
    reminderDays: config.reminderDays ?? current.reminderDays,
    updatedAt: nowIso(),
  };
  // Keep rate aligned for per-institute when amount is explicitly set
  if (config.amountInr !== undefined && current.billingModel === "per_institute") {
    next.rateInr = config.amountInr;
  }
  if (config.amountInr !== undefined && current.billingModel === "custom") {
    next.rateInr = config.amountInr;
  }
  saveLicense(next);
  return next;
}

export type BillingConfigInput = {
  billingModel: BillingModel;
  rateInr: number;
  /** For custom model, optional explicit amount (defaults to rateInr). */
  customAmountInr?: number;
  cadence?: BillingCadence;
  startAt?: string;
  reminderDays?: number[];
};

/** Configure LumenX → institute billing model and recalculate amount. */
export function configureBilling(
  instituteId: string,
  config: BillingConfigInput,
): InstituteLicense {
  const current = getLicense(instituteId);
  const students = studentCountFor(instituteId);
  const rateInr = Math.max(0, Number(config.rateInr) || 0);
  const amountInr = calculateBilledAmount({
    billingModel: config.billingModel,
    rateInr,
    studentCount: students,
    customAmountInr: config.customAmountInr,
  });
  const next: InstituteLicense = {
    ...current,
    billingModel: config.billingModel,
    rateInr,
    amountInr,
    cadence: config.cadence ?? current.cadence,
    startAt: config.startAt ?? current.startAt,
    reminderDays: config.reminderDays ?? current.reminderDays,
    // Cap paid to new amount so pending stays coherent
    paidAmountInr: Math.min(current.paidAmountInr, amountInr),
    updatedAt: nowIso(),
  };
  saveLicense(next);
  appendAuditEvent({
    action: "billing_changed",
    targetId: instituteId,
    targetLabel: instituteLabel(instituteId),
    targetKind: "license",
    before: `${current.billingModel} · ${formatMoneyInr(current.amountInr)}`,
    after: `${next.billingModel} · ${formatMoneyInr(next.amountInr)}`,
    summary: "Billing model or rate updated",
  });
  return next;
}

export function recordPayment(
  instituteId: string,
  input: {
    amountInr: number;
    note?: string;
    method?: LicensePaymentRecord["method"];
    recordedAt?: string;
  },
): InstituteLicense | null {
  const amount = Math.max(0, Math.round(Number(input.amountInr) || 0));
  if (amount <= 0) return null;
  const current = getLicense(instituteId);
  const payment: LicensePaymentRecord = {
    id: `pay-${Date.now().toString(36)}`,
    amountInr: amount,
    recordedAt: input.recordedAt ?? nowIso(),
    note: input.note?.trim() || undefined,
    method: input.method ?? "other",
  };
  const paidAmountInr = Math.min(
    current.amountInr,
    Math.round(current.paidAmountInr) + amount,
  );
  const next: InstituteLicense = {
    ...current,
    paidAmountInr,
    payments: [payment, ...current.payments],
    updatedAt: nowIso(),
  };
  saveLicense(next);
  return next;
}

export type InstituteBillingRow = {
  instituteId: string;
  instituteName: string;
  city: string;
  studentCount: number;
  plan: PlanTier;
  billingModel: BillingModel;
  rateInr: number;
  calculatedAmountInr: number;
  paidAmountInr: number;
  pendingAmountInr: number;
  paymentStatus: PlatformPaymentStatus;
  dueDate: Date | null;
  renewalDate: Date | null;
  cadence: BillingCadence;
  reminderDays: number[];
  payments: LicensePaymentRecord[];
  license: InstituteLicense;
};

export function listInstituteBillingRows(
  licenses: Record<string, InstituteLicense> = loadLicenses(),
  institutes: readonly InstituteSeed[] = SEED_INSTITUTES,
  now: Date = new Date(),
): InstituteBillingRow[] {
  return institutes.map((inst) => {
    const lic = licenses[inst.id] ?? defaultLicense(inst.id);
    const calculatedAmountInr = calculateBilledAmount({
      billingModel: lic.billingModel,
      rateInr: lic.rateInr,
      studentCount: inst.studentCount,
      customAmountInr: lic.billingModel === "custom" ? lic.amountInr : undefined,
    });
    // Prefer live calc for display; license.amountInr should match after configure
    const amount = calculatedAmountInr;
    const paid = Math.min(lic.paidAmountInr, amount);
    const pending = Math.max(0, amount - paid);
    const renewalDate = nextRenewalDate({ ...lic, amountInr: amount }, now);
    const dueDate = renewalDate;
    const statusLicense = { ...lic, amountInr: amount, paidAmountInr: paid };
    return {
      instituteId: inst.id,
      instituteName: inst.name,
      city: inst.city,
      studentCount: inst.studentCount,
      plan: lic.plan,
      billingModel: lic.billingModel,
      rateInr: lic.rateInr,
      calculatedAmountInr: amount,
      paidAmountInr: paid,
      pendingAmountInr: pending,
      paymentStatus: paymentStatusFor(statusLicense, now),
      dueDate,
      renewalDate,
      cadence: lic.cadence,
      reminderDays: lic.reminderDays,
      payments: lic.payments,
      license: lic,
    };
  });
}

export function billingPortfolioStats(rows: InstituteBillingRow[]) {
  return {
    institutes: rows.length,
    billed: rows.reduce((s, r) => s + r.calculatedAmountInr, 0),
    paid: rows.reduce((s, r) => s + r.paidAmountInr, 0),
    pending: rows.reduce((s, r) => s + r.pendingAmountInr, 0),
    overdue: rows.filter((r) => r.paymentStatus === "overdue").length,
    reminders: rows.filter((r) => {
      if (!r.renewalDate || r.pendingAmountInr <= 0) return false;
      const days = Math.ceil((r.renewalDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      const max = Math.max(0, ...(r.reminderDays.length ? r.reminderDays : [7]));
      return days <= max;
    }).length,
  };
}

export function parseStartAt(startAt: string): Date | null {
  if (!startAt.trim()) return null;
  const d = new Date(startAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Next renewal strictly after `from` (defaults to now), walking cadence from startAt. */
export function nextRenewalDate(license: InstituteLicense, from: Date = new Date()): Date | null {
  const start = parseStartAt(license.startAt);
  if (!start) return null;

  const cursor = new Date(start);
  if (cursor > from) return cursor;

  const months = license.cadence === "monthly" ? 1 : 12;
  for (let i = 0; i < 600; i++) {
    cursor.setMonth(cursor.getMonth() + months);
    if (cursor > from) return new Date(cursor);
  }
  return null;
}

export function formatInr(amount: number): string {
  return formatInrOrDash(amount, { treatZeroAsEmpty: true });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? parseStartAt(value) : value;
  if (!d) return "—";
  return formatDateTimeEnIn(d);
}

export type RenewalReminderItem = {
  instituteId: string;
  instituteName: string;
  studentCount: number;
  plan: PlanTier;
  cadence: BillingCadence;
  amountInr: number;
  renewalAt: Date;
  daysUntil: number;
  status: "overdue" | "due" | "upcoming";
  matchedReminderDays: number[];
};

export function listUpcomingReminders(
  licenses: Record<string, InstituteLicense>,
  institutes: readonly InstituteSeed[] = SEED_INSTITUTES,
  now: Date = new Date(),
): RenewalReminderItem[] {
  const byId = new Map(institutes.map((i) => [i.id, i]));
  const items: RenewalReminderItem[] = [];

  for (const lic of Object.values(licenses)) {
    const inst = byId.get(lic.instituteId);
    if (!inst) continue;
    if (!lic.amountInr || lic.amountInr <= 0) continue;

    const renewal = nextRenewalDate(lic, now);
    if (!renewal) continue;

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / msPerDay);
    const reminderDays = [...lic.reminderDays].sort((a, b) => b - a);
    const maxWindow = reminderDays[0] ?? 0;

    const matched = reminderDays.filter((d) => daysUntil <= d);
    const overdue = daysUntil < 0;
    const inWindow = daysUntil >= 0 && daysUntil <= maxWindow;

    if (!overdue && !inWindow) continue;

    items.push({
      instituteId: lic.instituteId,
      instituteName: inst.name,
      studentCount: inst.studentCount,
      plan: lic.plan,
      cadence: lic.cadence,
      amountInr: lic.amountInr,
      renewalAt: renewal,
      daysUntil,
      status: overdue ? "overdue" : daysUntil === 0 ? "due" : "upcoming",
      matchedReminderDays: matched.length > 0 ? matched : reminderDays,
    });
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function enabledModuleCount(license: InstituteLicense): number {
  return NEXUS_MODULE_CATALOG.filter((m) => license.modules[m.id]).length;
}

export function planDistribution(licenses: Record<string, InstituteLicense>): Record<PlanTier, number> {
  const out: Record<PlanTier, number> = { core: 0, plus: 0, max: 0 };
  for (const lic of Object.values(licenses)) {
    out[lic.plan] = (out[lic.plan] ?? 0) + 1;
  }
  return out;
}
