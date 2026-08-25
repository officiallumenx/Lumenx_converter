/**
 * Nexus Platform Settings — demo / localStorage.
 * Platform-wide defaults only. Institute academic/calendar/branch settings stay in Admin.
 */

import { appendAuditEvent } from "@/lib/audit-log-store";
import {
  NEXUS_MODULE_CATALOG,
  PLAN_CATALOG,
  type BillingCadence,
  type BillingModel,
  type PlanTier,
} from "@/lib/institute-licensing-store";

const STORAGE_KEY = "lumenx.nexus.platformSettings.v1";
const CHANGE_EVENT = "lumenx-nexus-platform-settings-changed";

export type AuditRetention = "90" | "365" | "forever";
export type OperatorDigest = "off" | "daily" | "weekly";
export type SessionTimeoutMin = 30 | 60 | 240;

export type PlatformSettings = {
  /** Platform information */
  platformName: string;
  platformTagline: string;
  legalEntity: string;
  supportEmail: string;
  supportPhone: string;
  primaryRegion: string;
  statusPageUrl: string;

  /** Default plans for new institutes */
  defaultPlanForNewInstitutes: PlanTier;
  defaultTrialDays: number;
  planSuggestedYearlyInr: Record<PlanTier, number>;
  planSuggestedMonthlyInr: Record<PlanTier, number>;

  /**
   * Default module catalog — minimum plan required for each module id.
   * Overlay on NEXUS_MODULE_CATALOG; missing ids fall back to catalog minPlan.
   */
  moduleMinPlans: Record<string, PlanTier>;

  /** Billing defaults (LumenX → institute) */
  defaultBillingModel: BillingModel;
  defaultBillingCadence: BillingCadence;
  defaultReminderDays: number[];
  currencyCode: "INR";
  gstPercent: number;
  invoicePrefix: string;

  /** Storage quota defaults (GB) — mirrored into storage-quota-store on save from UI */
  storageLimitGb: Record<PlanTier, number>;
  storageWarningPct: number;

  /** Platform notification settings (operator / institute ops — not student messages) */
  notifyOnCriticalAlert: boolean;
  notifyOnOverdueBilling: boolean;
  notifyOnSupportEscalation: boolean;
  notifyOnQuotaExceeded: boolean;
  operatorDigest: OperatorDigest;
  operatorNotifyEmail: string;

  /** Platform policy defaults */
  supportSlaHoursHigh: number;
  supportSlaHoursMedium: number;
  supportSlaHoursLow: number;
  autoEscalateOverdueDays: number;
  renewalWarningDays: number;

  /** Operator / security preferences */
  require2fa: boolean;
  sessionTimeoutMin: SessionTimeoutMin;
  auditRetention: AuditRetention;
  allowSelfServeInvite: boolean;
  showOperatorHandlesInAudit: boolean;
};

function catalogMinPlans(): Record<string, PlanTier> {
  return Object.fromEntries(NEXUS_MODULE_CATALOG.map((m) => [m.id, m.minPlan]));
}

function catalogSuggestedYearly(): Record<PlanTier, number> {
  return {
    core: PLAN_CATALOG.find((p) => p.id === "core")!.suggestedYearlyInr,
    plus: PLAN_CATALOG.find((p) => p.id === "plus")!.suggestedYearlyInr,
    max: PLAN_CATALOG.find((p) => p.id === "max")!.suggestedYearlyInr,
  };
}

function catalogSuggestedMonthly(): Record<PlanTier, number> {
  return {
    core: PLAN_CATALOG.find((p) => p.id === "core")!.suggestedMonthlyInr,
    plus: PLAN_CATALOG.find((p) => p.id === "plus")!.suggestedMonthlyInr,
    max: PLAN_CATALOG.find((p) => p.id === "max")!.suggestedMonthlyInr,
  };
}

export function defaultPlatformSettings(): PlatformSettings {
  return {
    platformName: "LumenX Nexus",
    platformTagline: "Multi-institute platform command",
    legalEntity: "LumenX Technologies Pvt. Ltd.",
    supportEmail: "platform@lumenx.app",
    supportPhone: "+91 80 4000 1200",
    primaryRegion: "India · APAC",
    statusPageUrl: "https://status.lumenx.app",

    defaultPlanForNewInstitutes: "core",
    defaultTrialDays: 60,
    planSuggestedYearlyInr: catalogSuggestedYearly(),
    planSuggestedMonthlyInr: catalogSuggestedMonthly(),

    moduleMinPlans: catalogMinPlans(),

    defaultBillingModel: "per_institute",
    defaultBillingCadence: "yearly",
    defaultReminderDays: [30, 14, 7],
    currencyCode: "INR",
    gstPercent: 18,
    invoicePrefix: "LX-INV",

    storageLimitGb: { core: 50, plus: 200, max: 500 },
    storageWarningPct: 80,

    notifyOnCriticalAlert: true,
    notifyOnOverdueBilling: true,
    notifyOnSupportEscalation: true,
    notifyOnQuotaExceeded: true,
    operatorDigest: "daily",
    operatorNotifyEmail: "ops@lumenx.app",

    supportSlaHoursHigh: 4,
    supportSlaHoursMedium: 24,
    supportSlaHoursLow: 72,
    autoEscalateOverdueDays: 3,
    renewalWarningDays: 30,

    require2fa: true,
    sessionTimeoutMin: 30,
    auditRetention: "365",
    allowSelfServeInvite: false,
    showOperatorHandlesInAudit: true,
  };
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function mergeSettings(raw: Partial<PlatformSettings> | null): PlatformSettings {
  const base = defaultPlatformSettings();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    planSuggestedYearlyInr: { ...base.planSuggestedYearlyInr, ...raw.planSuggestedYearlyInr },
    planSuggestedMonthlyInr: { ...base.planSuggestedMonthlyInr, ...raw.planSuggestedMonthlyInr },
    moduleMinPlans: { ...base.moduleMinPlans, ...raw.moduleMinPlans },
    storageLimitGb: { ...base.storageLimitGb, ...raw.storageLimitGb },
    defaultReminderDays: Array.isArray(raw.defaultReminderDays)
      ? raw.defaultReminderDays.map(Number).filter((n) => n > 0)
      : base.defaultReminderDays,
  };
}

export function loadPlatformSettings(): PlatformSettings {
  if (typeof localStorage === "undefined") return defaultPlatformSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = defaultPlatformSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return mergeSettings(JSON.parse(raw) as Partial<PlatformSettings>);
  } catch {
    return defaultPlatformSettings();
  }
}

export function subscribePlatformSettings(listener: () => void): () => void {
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

function summarizeDiff(before: PlatformSettings, after: PlatformSettings): Array<{
  key: string;
  label: string;
  from: string;
  to: string;
}> {
  const diffs: Array<{ key: string; label: string; from: string; to: string }> = [];
  const check = (key: string, label: string, a: unknown, b: unknown) => {
    const from = typeof a === "object" ? JSON.stringify(a) : String(a);
    const to = typeof b === "object" ? JSON.stringify(b) : String(b);
    if (from !== to) diffs.push({ key, label, from, to });
  };

  check("platformName", "Platform name", before.platformName, after.platformName);
  check("platformTagline", "Platform tagline", before.platformTagline, after.platformTagline);
  check("legalEntity", "Legal entity", before.legalEntity, after.legalEntity);
  check("supportEmail", "Support email", before.supportEmail, after.supportEmail);
  check("supportPhone", "Support phone", before.supportPhone, after.supportPhone);
  check("primaryRegion", "Primary region", before.primaryRegion, after.primaryRegion);
  check("statusPageUrl", "Status page", before.statusPageUrl, after.statusPageUrl);

  check(
    "defaultPlanForNewInstitutes",
    "Default plan for new institutes",
    before.defaultPlanForNewInstitutes,
    after.defaultPlanForNewInstitutes,
  );
  check("defaultTrialDays", "Default trial days", before.defaultTrialDays, after.defaultTrialDays);
  check("planSuggestedYearlyInr", "Suggested yearly prices", before.planSuggestedYearlyInr, after.planSuggestedYearlyInr);
  check("planSuggestedMonthlyInr", "Suggested monthly prices", before.planSuggestedMonthlyInr, after.planSuggestedMonthlyInr);
  check("moduleMinPlans", "Module catalog min plans", before.moduleMinPlans, after.moduleMinPlans);

  check("defaultBillingModel", "Default billing model", before.defaultBillingModel, after.defaultBillingModel);
  check("defaultBillingCadence", "Default billing cadence", before.defaultBillingCadence, after.defaultBillingCadence);
  check("defaultReminderDays", "Renewal reminder days", before.defaultReminderDays, after.defaultReminderDays);
  check("gstPercent", "GST percent", before.gstPercent, after.gstPercent);
  check("invoicePrefix", "Invoice prefix", before.invoicePrefix, after.invoicePrefix);

  // storageLimitGb audited by storage-quota-store.savePlanStorageLimits
  check("storageWarningPct", "Storage warning %", before.storageWarningPct, after.storageWarningPct);

  check("notifyOnCriticalAlert", "Notify on critical alert", before.notifyOnCriticalAlert, after.notifyOnCriticalAlert);
  check("notifyOnOverdueBilling", "Notify on overdue billing", before.notifyOnOverdueBilling, after.notifyOnOverdueBilling);
  check("notifyOnSupportEscalation", "Notify on support escalation", before.notifyOnSupportEscalation, after.notifyOnSupportEscalation);
  check("notifyOnQuotaExceeded", "Notify on quota exceeded", before.notifyOnQuotaExceeded, after.notifyOnQuotaExceeded);
  check("operatorDigest", "Operator digest", before.operatorDigest, after.operatorDigest);
  check("operatorNotifyEmail", "Operator notify email", before.operatorNotifyEmail, after.operatorNotifyEmail);

  check("supportSlaHoursHigh", "Support SLA (high)", before.supportSlaHoursHigh, after.supportSlaHoursHigh);
  check("supportSlaHoursMedium", "Support SLA (medium)", before.supportSlaHoursMedium, after.supportSlaHoursMedium);
  check("supportSlaHoursLow", "Support SLA (low)", before.supportSlaHoursLow, after.supportSlaHoursLow);
  check("autoEscalateOverdueDays", "Auto-escalate overdue days", before.autoEscalateOverdueDays, after.autoEscalateOverdueDays);
  check("renewalWarningDays", "Renewal warning days", before.renewalWarningDays, after.renewalWarningDays);

  check("require2fa", "Require 2FA", before.require2fa, after.require2fa);
  check("sessionTimeoutMin", "Session timeout", before.sessionTimeoutMin, after.sessionTimeoutMin);
  check("auditRetention", "Audit retention", before.auditRetention, after.auditRetention);
  check("allowSelfServeInvite", "Allow self-serve invite", before.allowSelfServeInvite, after.allowSelfServeInvite);
  check(
    "showOperatorHandlesInAudit",
    "Show operator handles in audit",
    before.showOperatorHandlesInAudit,
    after.showOperatorHandlesInAudit,
  );

  return diffs;
}

export function savePlatformSettings(
  next: PlatformSettings,
  previous?: PlatformSettings,
): PlatformSettings {
  const normalized = mergeSettings(next);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    notify();
  }
  const prev = previous ?? loadPlatformSettings();
  for (const diff of summarizeDiff(prev, normalized)) {
    appendAuditEvent({
      action: "platform_setting_changed",
      targetId: `setting.${diff.key}`,
      targetLabel: diff.label,
      targetKind: "settings",
      before: diff.from.slice(0, 120),
      after: diff.to.slice(0, 120),
      summary: "Platform default updated",
    });
  }
  return normalized;
}

export function moduleMinPlanFor(settings: PlatformSettings, moduleId: string): PlanTier {
  return settings.moduleMinPlans[moduleId] ?? NEXUS_MODULE_CATALOG.find((m) => m.id === moduleId)?.minPlan ?? "core";
}

export function labelSessionTimeout(min: SessionTimeoutMin): string {
  if (min === 30) return "30 min";
  if (min === 60) return "1 hour";
  return "4 hours";
}

export function labelAuditRetention(v: AuditRetention): string {
  if (v === "90") return "90 days";
  if (v === "365") return "1 year";
  return "Forever";
}

export function labelOperatorDigest(v: OperatorDigest): string {
  if (v === "off") return "Off";
  if (v === "daily") return "Daily";
  return "Weekly";
}

export function labelBillingModel(m: BillingModel): string {
  if (m === "per_institute") return "Per institute";
  if (m === "per_student") return "Per student";
  return "Custom";
}

export function labelBillingCadence(c: BillingCadence): string {
  return c === "monthly" ? "Monthly" : "Yearly";
}

export function toggleReminderDay(days: number[], day: number): number[] {
  const set = new Set(days);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return [...set].sort((a, b) => b - a);
}
