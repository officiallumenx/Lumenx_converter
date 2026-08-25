/**
 * Nexus platform institute directory — demo/localStorage only.
 * Aggregates and institute-level fields only. No person-level PII.
 * Lifecycle: create · activate · suspend · archive · restore.
 */

import {
  NEXUS_MODULE_CATALOG,
  defaultLicense,
  defaultModulesForPlan,
  defaultModulesOn,
  formatInr,
  formatDateTime,
  nextRenewalDate,
  resolveInstituteModules,
  saveLicense,
  type BillingCadence,
  type PlanTier as LicensePlanTier,
} from "@/lib/institute-licensing-store";
import { appendAuditEvent } from "@/lib/audit-log-store";
import { loadPlatformSettings } from "@/lib/platform-settings-store";
import { buildInstituteMonogramLogoUrl, startInstituteTrial } from "@lumenx/utils";

export type InstituteStatus = "trial" | "active" | "suspended" | "archived";
export type PlanTier = LicensePlanTier;
export type PaymentStatus = "paid" | "partial" | "pending" | "overdue";
export type RenewalStatus = "current" | "due_soon" | "due_today" | "overdue" | "trial";
export type UsageStatus = "healthy" | "moderate" | "low" | "inactive";
export type RiskStatus = "low" | "medium" | "high" | "critical";

export type PlatformInstitute = {
  id: string;
  name: string;
  /** Short mark for logo tile (2–3 letters). No personal names. */
  logoMark: string;
  logoHue: number;
  /** Uploaded or monogram image (data URL / https). Shown in directory cards. */
  logoUrl?: string;
  city: string;
  state: string;
  country: string;
  addressLine: string;
  pincode: string;
  board: string;
  instituteType: string;
  establishedYear: number;
  contactEmail: string;
  contactPhone: string;
  status: InstituteStatus;
  /** Status before archive — used by restore. */
  statusBeforeArchive?: Exclude<InstituteStatus, "archived">;
  plan: PlanTier;
  billingCadence: BillingCadence;
  amountInr: number;
  paidAmountInr: number;
  pendingAmountInr: number;
  /** datetime-local for billing/renewal basis */
  billingStartAt: string;
  paymentStatus: PaymentStatus;
  renewalStatus: RenewalStatus;
  studentCount: number;
  facultyCount: number;
  parentCount: number;
  adminCount: number;
  activeUsagePct: number;
  usageStatus: UsageStatus;
  riskStatus: RiskStatus;
  usageTrend: number[];
  modules: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

export type CreateInstituteInput = {
  name: string;
  city: string;
  state: string;
  country: string;
  addressLine: string;
  pincode: string;
  board: string;
  instituteType: string;
  contactEmail: string;
  contactPhone: string;
  /** Optional institute logo (data URL). Compressed thumbs preferred. */
  logoUrl?: string;
  /** New institutes start as trial or active only. */
  initialStatus: "trial" | "active";
  plan: PlanTier;
  billingCadence: BillingCadence;
  amountInr: number;
  billingStartAt: string;
  modules: Record<string, boolean>;
};

const STORAGE_KEY = "lumenx.nexus.instituteDirectory.v2";
const CHANGE_EVENT = "lumenx-nexus-institute-directory-changed";

const TREND_MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"] as const;

export function usageTrendLabels(): readonly string[] {
  return TREND_MONTHS;
}

function modulesFor(overrides: Partial<Record<string, boolean>> = {}): Record<string, boolean> {
  return { ...defaultModulesOn(), ...overrides } as Record<string, boolean>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function logoMarkFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "LX";
}

function slugId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return `ins-${base || "institute"}-${Date.now().toString(36)}`;
}

/** Seed catalog — institute-level metadata and counts only. */
export const PLATFORM_INSTITUTES_SEED: PlatformInstitute[] = [
  {
    id: "ins-delhi-riverside",
    name: "Delhi Riverside Academy",
    logoMark: "DR",
    logoHue: 195,
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    addressLine: "12 Ring Road, Defence Colony",
    pincode: "110024",
    board: "CBSE",
    instituteType: "Senior Secondary",
    establishedYear: 1998,
    contactEmail: "ops@delhiriverside.edu.in",
    contactPhone: "+91 11 4567 8900",
    status: "active",
    plan: "max",
    billingCadence: "yearly",
    amountInr: 249999,
    paidAmountInr: 249999,
    pendingAmountInr: 0,
    billingStartAt: "2026-04-01T09:00",
    paymentStatus: "paid",
    renewalStatus: "current",
    studentCount: 1840,
    facultyCount: 112,
    parentCount: 1520,
    adminCount: 14,
    activeUsagePct: 88,
    usageStatus: "healthy",
    riskStatus: "low",
    usageTrend: [72, 76, 79, 84, 86, 88],
    modules: modulesFor({ transport: false }),
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "ins-mumbai-harbor",
    name: "Harbor High School",
    logoMark: "HH",
    logoHue: 250,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    addressLine: "88 Marine Drive, Churchgate",
    pincode: "400020",
    board: "ICSE",
    instituteType: "High School",
    establishedYear: 2005,
    contactEmail: "admin@harborhigh.edu.in",
    contactPhone: "+91 22 2288 1100",
    status: "active",
    plan: "plus",
    billingCadence: "monthly",
    amountInr: 24999,
    paidAmountInr: 14999,
    pendingAmountInr: 10000,
    billingStartAt: "2026-06-25T10:00",
    paymentStatus: "partial",
    renewalStatus: "due_soon",
    studentCount: 920,
    facultyCount: 64,
    parentCount: 780,
    adminCount: 8,
    activeUsagePct: 71,
    usageStatus: "moderate",
    riskStatus: "medium",
    usageTrend: [68, 70, 69, 72, 70, 71],
    modules: modulesFor({ analytics: false, storage: true }),
    createdAt: "2024-03-12T09:00:00.000Z",
    updatedAt: "2026-07-15T09:00:00.000Z",
  },
  {
    id: "ins-bengaluru-oak",
    name: "Oakridge Public School",
    logoMark: "OP",
    logoHue: 145,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    addressLine: "41 Whitefield Main Road",
    pincode: "560066",
    board: "CBSE",
    instituteType: "Public School",
    establishedYear: 1992,
    contactEmail: "platform@oakridge.edu.in",
    contactPhone: "+91 80 4123 5600",
    status: "active",
    plan: "max",
    billingCadence: "yearly",
    amountInr: 299999,
    paidAmountInr: 0,
    pendingAmountInr: 299999,
    billingStartAt: "2025-07-28T11:00",
    paymentStatus: "overdue",
    renewalStatus: "overdue",
    studentCount: 2105,
    facultyCount: 148,
    parentCount: 1890,
    adminCount: 18,
    activeUsagePct: 92,
    usageStatus: "healthy",
    riskStatus: "high",
    usageTrend: [80, 83, 86, 88, 90, 92],
    modules: modulesFor(),
    createdAt: "2023-08-01T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
  },
  {
    id: "ins-hyderabad-lotus",
    name: "Lotus International",
    logoMark: "LI",
    logoHue: 310,
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    addressLine: "Plot 7, Gachibowli Financial District",
    pincode: "500032",
    board: "IB / CBSE",
    instituteType: "International",
    establishedYear: 2012,
    contactEmail: "nexus@lotusintl.edu.in",
    contactPhone: "+91 40 2988 2200",
    status: "trial",
    plan: "plus",
    billingCadence: "yearly",
    amountInr: 179999,
    paidAmountInr: 0,
    pendingAmountInr: 179999,
    billingStartAt: "2026-08-01T09:00",
    paymentStatus: "pending",
    renewalStatus: "trial",
    studentCount: 640,
    facultyCount: 52,
    parentCount: 510,
    adminCount: 6,
    activeUsagePct: 54,
    usageStatus: "moderate",
    riskStatus: "medium",
    usageTrend: [30, 38, 44, 48, 51, 54],
    modules: modulesFor({
      exams: false,
      complaints: false,
      analytics: false,
      storage: false,
    }),
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "ins-chennai-shore",
    name: "Shoreline Senior Secondary",
    logoMark: "SS",
    logoHue: 40,
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    addressLine: "22 ECR, Neelankarai",
    pincode: "600115",
    board: "State Board / CBSE",
    instituteType: "Senior Secondary",
    establishedYear: 1987,
    contactEmail: "office@shoreline.edu.in",
    contactPhone: "+91 44 2449 3300",
    status: "active",
    plan: "core",
    billingCadence: "yearly",
    amountInr: 99999,
    paidAmountInr: 99999,
    pendingAmountInr: 0,
    billingStartAt: "2026-03-15T10:00",
    paymentStatus: "paid",
    renewalStatus: "current",
    studentCount: 1180,
    facultyCount: 78,
    parentCount: 960,
    adminCount: 9,
    activeUsagePct: 63,
    usageStatus: "moderate",
    riskStatus: "low",
    usageTrend: [55, 58, 60, 61, 62, 63],
    modules: modulesFor({
      timetable: false,
      exams: false,
      analytics: false,
      alerts: false,
      storage: false,
    }),
    createdAt: "2024-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "ins-pune-summit",
    name: "Summit Valley School",
    logoMark: "SV",
    logoHue: 220,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    addressLine: "5 Baner Road, Baner",
    pincode: "411045",
    board: "CBSE",
    instituteType: "K–12",
    establishedYear: 2016,
    contactEmail: "ops@summitvalley.edu.in",
    contactPhone: "+91 20 6721 4400",
    status: "trial",
    plan: "core",
    billingCadence: "monthly",
    amountInr: 12999,
    paidAmountInr: 12999,
    pendingAmountInr: 0,
    billingStartAt: "2026-08-10T09:00",
    paymentStatus: "paid",
    renewalStatus: "trial",
    studentCount: 210,
    facultyCount: 24,
    parentCount: 180,
    adminCount: 3,
    activeUsagePct: 28,
    usageStatus: "low",
    riskStatus: "low",
    usageTrend: [8, 12, 16, 20, 24, 28],
    modules: modulesFor({
      timetable: false,
      exams: false,
      complaints: false,
      announcements: false,
      events: false,
      alerts: false,
      analytics: false,
      storage: false,
    }),
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-12T09:00:00.000Z",
  },
  {
    id: "ins-jaipur-heritage",
    name: "Heritage Academy Jaipur",
    logoMark: "HA",
    logoHue: 25,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    addressLine: "C-19, Malviya Nagar",
    pincode: "302017",
    board: "RBSE / CBSE",
    instituteType: "Academy",
    establishedYear: 2001,
    contactEmail: "desk@heritagejp.edu.in",
    contactPhone: "+91 141 2550 880",
    status: "suspended",
    plan: "plus",
    billingCadence: "yearly",
    amountInr: 159999,
    paidAmountInr: 0,
    pendingAmountInr: 159999,
    billingStartAt: "2025-05-01T09:00",
    paymentStatus: "overdue",
    renewalStatus: "overdue",
    studentCount: 740,
    facultyCount: 48,
    parentCount: 610,
    adminCount: 5,
    activeUsagePct: 12,
    usageStatus: "inactive",
    riskStatus: "critical",
    usageTrend: [58, 45, 32, 22, 15, 12],
    modules: modulesFor({ analytics: false }),
    createdAt: "2023-11-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z",
  },
  {
    id: "ins-kochi-lagoon",
    name: "Lagoon International School",
    logoMark: "LG",
    logoHue: 175,
    city: "Kochi",
    state: "Kerala",
    country: "India",
    addressLine: "Infopark Phase II, Kakkanad",
    pincode: "682042",
    board: "CBSE",
    instituteType: "International",
    establishedYear: 2010,
    contactEmail: "platform@lagoon.edu.in",
    contactPhone: "+91 484 4012 900",
    status: "active",
    plan: "plus",
    billingCadence: "yearly",
    amountInr: 189999,
    paidAmountInr: 189999,
    pendingAmountInr: 0,
    billingStartAt: "2026-01-12T09:00",
    paymentStatus: "paid",
    renewalStatus: "due_today",
    studentCount: 1050,
    facultyCount: 71,
    parentCount: 890,
    adminCount: 11,
    activeUsagePct: 81,
    usageStatus: "healthy",
    riskStatus: "medium",
    usageTrend: [70, 73, 76, 78, 80, 81],
    modules: modulesFor({ storage: false }),
    createdAt: "2024-09-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "ins-ahmedabad-north",
    name: "Northgate Academy",
    logoMark: "NA",
    logoHue: 280,
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    addressLine: "SG Highway, Bodakdev",
    pincode: "380054",
    board: "GSEB / CBSE",
    instituteType: "Academy",
    establishedYear: 2008,
    contactEmail: "ops@northgate.edu.in",
    contactPhone: "+91 79 4001 2200",
    status: "archived",
    statusBeforeArchive: "suspended",
    plan: "core",
    billingCadence: "yearly",
    amountInr: 79999,
    paidAmountInr: 0,
    pendingAmountInr: 79999,
    billingStartAt: "2024-04-01T09:00",
    paymentStatus: "overdue",
    renewalStatus: "overdue",
    studentCount: 420,
    facultyCount: 28,
    parentCount: 350,
    adminCount: 4,
    activeUsagePct: 0,
    usageStatus: "inactive",
    riskStatus: "critical",
    usageTrend: [40, 28, 18, 8, 2, 0],
    modules: modulesFor({
      timetable: false,
      exams: false,
      analytics: false,
      storage: false,
    }),
    createdAt: "2022-01-01T09:00:00.000Z",
    updatedAt: "2025-12-01T09:00:00.000Z",
  },
];

function normalizeInstitute(raw: PlatformInstitute): PlatformInstitute {
  const status =
    raw.status === "trial" ||
    raw.status === "active" ||
    raw.status === "suspended" ||
    raw.status === "archived"
      ? raw.status
      : "trial";
  const logoMark = raw.logoMark || logoMarkFromName(raw.name);
  const logoHue = typeof raw.logoHue === "number" ? raw.logoHue : 200;
  const logoUrl =
    (typeof raw.logoUrl === "string" && raw.logoUrl.trim()) ||
    buildInstituteMonogramLogoUrl(logoMark, logoHue);
  return {
    ...raw,
    status,
    logoMark,
    logoHue,
    logoUrl,
    modules: { ...defaultModulesOn(), ...raw.modules },
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || nowIso(),
  };
}

function seedCopy(): PlatformInstitute[] {
  return PLATFORM_INSTITUTES_SEED.map((i) => normalizeInstitute({ ...i, modules: { ...i.modules } }));
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function persist(list: PlatformInstitute[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notify();
}

export function loadPlatformInstitutes(): PlatformInstitute[] {
  if (typeof localStorage === "undefined") return seedCopy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedCopy();
      persist(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as PlatformInstitute[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = seedCopy();
      persist(seed);
      return seed;
    }
    return parsed.map(normalizeInstitute);
  } catch {
    return seedCopy();
  }
}

export function listPlatformInstitutes(): PlatformInstitute[] {
  return loadPlatformInstitutes();
}

export function getPlatformInstitute(id: string): PlatformInstitute | undefined {
  return loadPlatformInstitutes().find((i) => i.id === id);
}

export function subscribeInstituteDirectory(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateInstitute(
  id: string,
  patch: Partial<PlatformInstitute>,
): PlatformInstitute | undefined {
  const list = loadPlatformInstitutes();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return undefined;
  const next = normalizeInstitute({
    ...list[idx]!,
    ...patch,
    updatedAt: nowIso(),
  });
  list[idx] = next;
  persist(list);
  return next;
}

/** Platform onboarding only — no Admin operational records. */
export function createPlatformInstitute(input: CreateInstituteInput): PlatformInstitute {
  const amount = Math.max(0, Number(input.amountInr) || 0);
  const logoMark = logoMarkFromName(input.name);
  const logoHue = 120 + Math.floor(Math.random() * 200);
  const logoUrl =
    (input.logoUrl && input.logoUrl.trim()) ||
    buildInstituteMonogramLogoUrl(logoMark, logoHue);
  const created: PlatformInstitute = {
    id: slugId(input.name),
    name: input.name.trim(),
    logoMark,
    logoHue,
    logoUrl,
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country.trim() || "India",
    addressLine: input.addressLine.trim(),
    pincode: input.pincode.trim(),
    board: input.board.trim() || "—",
    instituteType: input.instituteType.trim() || "Institute",
    establishedYear: new Date().getFullYear(),
    contactEmail: input.contactEmail.trim(),
    contactPhone: input.contactPhone.trim(),
    status: input.initialStatus,
    plan: input.plan,
    billingCadence: input.billingCadence,
    amountInr: amount,
    paidAmountInr: 0,
    pendingAmountInr: amount,
    billingStartAt: input.billingStartAt || nowDateTimeLocal(),
    paymentStatus: amount > 0 ? "pending" : "paid",
    renewalStatus: input.initialStatus === "trial" ? "trial" : "current",
    studentCount: 0,
    facultyCount: 0,
    parentCount: 0,
    adminCount: 0,
    activeUsagePct: 0,
    usageStatus: "inactive",
    riskStatus: "low",
    usageTrend: [0, 0, 0, 0, 0, 0],
    modules: { ...defaultModulesOn(), ...input.modules },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const list = loadPlatformInstitutes();
  list.unshift(created);
  persist(list);
  // Unified subscription SoT — 60-day trial clock (independent of Core/Plus/Max modules).
  if (created.status === "trial" || input.initialStatus === "trial") {
    startInstituteTrial({
      instituteId: created.id,
      instituteName: created.name,
      assignedRateInr: 12,
      activeStudentCount: 0,
    });
  }
  // Keep licensing store as module entitlement truth for new institutes.
  saveLicense({
    ...defaultLicense(created.id, created.plan),
    cadence: created.billingCadence,
    amountInr: amount,
    rateInr: amount,
    paidAmountInr: 0,
    startAt: created.billingStartAt,
    reminderDays: [30, 14, 7],
    modules: { ...defaultModulesForPlan(created.plan), ...input.modules },
  });
  appendAuditEvent({
    action: "institute_created",
    targetId: created.id,
    targetLabel: created.name,
    targetKind: "institute",
    before: "—",
    after: `${created.status} · ${created.plan}`,
    summary: "Institute onboarded on platform",
  });
  return created;
}

export function activateInstitute(id: string): PlatformInstitute | undefined {
  const current = getPlatformInstitute(id);
  if (!current) return undefined;
  if (current.status === "archived") return undefined;
  if (current.status === "active") return current;
  return updateInstitute(id, {
    status: "active",
    renewalStatus: current.renewalStatus === "trial" ? "current" : current.renewalStatus,
    usageStatus: current.activeUsagePct >= 70 ? "healthy" : current.usageStatus === "inactive" ? "low" : current.usageStatus,
  });
}

export function suspendInstitute(id: string): PlatformInstitute | undefined {
  const current = getPlatformInstitute(id);
  if (!current) return undefined;
  if (current.status === "archived") return undefined;
  if (current.status === "suspended") return current;
  const next = updateInstitute(id, {
    status: "suspended",
    usageStatus: "inactive",
    riskStatus: current.riskStatus === "low" ? "medium" : current.riskStatus,
  });
  if (next) {
    appendAuditEvent({
      action: "institute_suspended",
      targetId: next.id,
      targetLabel: next.name,
      targetKind: "institute",
      before: current.status,
      after: "suspended",
      summary: "Institute suspended from platform access",
    });
  }
  return next;
}

export function archiveInstitute(id: string): PlatformInstitute | undefined {
  const current = getPlatformInstitute(id);
  if (!current) return undefined;
  if (current.status === "archived") return current;
  const before = current.status;
  const next = updateInstitute(id, {
    status: "archived",
    statusBeforeArchive: before,
    usageStatus: "inactive",
    activeUsagePct: 0,
    riskStatus: "critical",
  });
  if (next) {
    appendAuditEvent({
      action: "institute_archived",
      targetId: next.id,
      targetLabel: next.name,
      targetKind: "institute",
      before,
      after: "archived",
      summary: "Institute archived",
    });
  }
  return next;
}

export function restoreInstitute(id: string): PlatformInstitute | undefined {
  const current = getPlatformInstitute(id);
  if (!current || current.status !== "archived") return undefined;
  const restored = current.statusBeforeArchive ?? "trial";
  return updateInstitute(id, {
    status: restored,
    statusBeforeArchive: undefined,
    usageStatus: restored === "suspended" ? "inactive" : "low",
    riskStatus: restored === "suspended" ? "high" : "low",
    renewalStatus: restored === "trial" ? "trial" : current.renewalStatus === "overdue" ? "overdue" : "current",
  });
}

/**
 * Mirror Nexus licensing truth onto a directory institute (if present).
 * Does not create Admin operational records.
 * Licensing remains SoT — directory modules/plan/billing are projections.
 */
export function syncDirectoryFromLicense(license: {
  instituteId: string;
  plan: PlanTier;
  billingCadence: BillingCadence;
  amountInr: number;
  paidAmountInr?: number;
  billingStartAt: string;
  modules: Record<string, boolean>;
  paymentStatus?: PaymentStatus;
}): PlatformInstitute | undefined {
  const current = getPlatformInstitute(license.instituteId);
  if (!current) return undefined;
  const paid = Math.max(0, license.paidAmountInr ?? current.paidAmountInr);
  const amount = Math.max(0, license.amountInr);
  const pending = Math.max(0, amount - paid);
  let paymentStatus: PaymentStatus = license.paymentStatus ?? current.paymentStatus;
  if (!license.paymentStatus) {
    if (pending <= 0) paymentStatus = "paid";
    else if (paid <= 0) paymentStatus = "pending";
    else paymentStatus = "partial";
  }
  const modules = { ...license.modules };
  const unchanged =
    current.plan === license.plan &&
    current.billingCadence === license.billingCadence &&
    current.amountInr === amount &&
    current.paidAmountInr === paid &&
    current.pendingAmountInr === pending &&
    current.paymentStatus === paymentStatus &&
    current.billingStartAt === license.billingStartAt &&
    JSON.stringify(current.modules) === JSON.stringify(modules);
  if (unchanged) return current;
  return updateInstitute(license.instituteId, {
    plan: license.plan,
    billingCadence: license.billingCadence,
    amountInr: amount,
    paidAmountInr: paid,
    pendingAmountInr: pending,
    paymentStatus,
    billingStartAt: license.billingStartAt,
    modules,
  });
}

export function defaultCreateModules(): Record<string, boolean> {
  // Core modules on by default for platform onboarding; advanced off.
  return modulesFor({
    timetable: false,
    exams: false,
    complaints: false,
    analytics: false,
    alerts: false,
    storage: false,
  });
}

export function defaultCreateForm(): CreateInstituteInput {
  const s = loadPlatformSettings();
  const plan = s.defaultPlanForNewInstitutes;
  const amountInr =
    s.defaultBillingCadence === "monthly"
      ? s.planSuggestedMonthlyInr[plan]
      : s.planSuggestedYearlyInr[plan];
  return {
    name: "",
    city: "",
    state: "",
    country: "India",
    addressLine: "",
    pincode: "",
    board: "CBSE",
    instituteType: "School",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    initialStatus: s.defaultTrialDays > 0 ? "trial" : "active",
    plan,
    billingCadence: s.defaultBillingCadence,
    amountInr,
    billingStartAt: nowDateTimeLocal(),
    modules: defaultCreateModules(),
  };
}

export function locationLabel(inst: PlatformInstitute): string {
  return `${inst.city}, ${inst.state}`;
}

export function fullAddress(inst: PlatformInstitute): string {
  return `${inst.addressLine}, ${inst.city}, ${inst.state} ${inst.pincode}, ${inst.country}`;
}

export function planLabel(plan: PlanTier): string {
  if (plan === "core") return "Core";
  if (plan === "plus") return "Plus";
  return "Max";
}

export function statusTone(
  status: InstituteStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "active") return "success";
  if (status === "trial") return "info";
  if (status === "suspended") return "warning";
  return "neutral";
}

export function paymentTone(
  status: PaymentStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  if (status === "pending") return "info";
  return "danger";
}

export function renewalTone(
  status: RenewalStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "current") return "success";
  if (status === "due_soon" || status === "trial") return "warning";
  if (status === "due_today") return "info";
  return "danger";
}

export function usageTone(
  status: UsageStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "healthy") return "success";
  if (status === "moderate") return "info";
  if (status === "low") return "warning";
  return "danger";
}

export function riskTone(
  status: RiskStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "low") return "success";
  if (status === "medium") return "warning";
  if (status === "high") return "danger";
  return "danger";
}

export function labelStatus(status: InstituteStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function labelPayment(status: PaymentStatus): string {
  if (status === "partial") return "Partial";
  if (status === "overdue") return "Overdue";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function labelRenewal(status: RenewalStatus): string {
  if (status === "due_soon") return "Due soon";
  if (status === "due_today") return "Due today";
  if (status === "overdue") return "Overdue";
  if (status === "trial") return "Trial";
  return "Current";
}

export function labelUsage(status: UsageStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function labelRisk(status: RiskStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatMoney(n: number): string {
  return formatInr(n);
}

export function renewalDateLabel(inst: PlatformInstitute): string {
  const license = {
    ...defaultLicense(inst.id),
    cadence: inst.billingCadence,
    amountInr: inst.amountInr,
    startAt: inst.billingStartAt,
    reminderDays: [30, 7, 1],
    modules: inst.modules,
  };
  const next = nextRenewalDate(license);
  if (!next) return formatDateTime(inst.billingStartAt);
  return formatDateTime(next);
}

export function enabledModules(inst: PlatformInstitute) {
  const modules = resolveInstituteModules(inst.id);
  return NEXUS_MODULE_CATALOG.filter((m) => modules[m.id]);
}

export function disabledModules(inst: PlatformInstitute) {
  const modules = resolveInstituteModules(inst.id);
  return NEXUS_MODULE_CATALOG.filter((m) => !modules[m.id]);
}

export function directoryStats(institutes: PlatformInstitute[]) {
  return {
    total: institutes.length,
    active: institutes.filter((i) => i.status === "active").length,
    trial: institutes.filter((i) => i.status === "trial").length,
    suspended: institutes.filter((i) => i.status === "suspended").length,
    archived: institutes.filter((i) => i.status === "archived").length,
    atRisk: institutes.filter((i) => i.riskStatus === "high" || i.riskStatus === "critical").length,
    overduePay: institutes.filter((i) => i.paymentStatus === "overdue").length,
  };
}

export { NEXUS_MODULE_CATALOG };
