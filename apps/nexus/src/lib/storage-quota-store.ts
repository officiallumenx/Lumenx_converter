/**
 * Nexus platform storage quotas — demo / localStorage.
 * Nexus configures plan limits and monitors institute usage %.
 * Admin manages actual files (homework, documents) — not here.
 */

import {
  listPlatformInstitutes,
  locationLabel,
  type PlatformInstitute,
  type PlanTier,
} from "@/lib/institute-directory-store";
import { getLicense, planLabel, type PlanTier as LicensePlan } from "@/lib/institute-licensing-store";
import { appendAuditEvent } from "@/lib/audit-log-store";

export type PlanStorageLimits = Record<PlanTier, number>;

export type QuotaStatus = "ok" | "warning" | "exceeded";

export type InstituteStorageQuota = {
  instituteId: string;
  instituteName: string;
  location: string;
  status: PlatformInstitute["status"];
  plan: PlanTier;
  planLabel: string;
  /** Used storage in GB (demo aggregate) */
  usedGb: number;
  /** Plan limit in GB */
  limitGb: number;
  pctUsed: number;
  remainingGb: number;
  quotaStatus: QuotaStatus;
};

const LIMITS_KEY = "lumenx.nexus.storagePlanLimits.v1";
const CHANGE_EVENT = "lumenx-nexus-storage-quotas-changed";

/** Default plan ceilings (GB). */
export const DEFAULT_PLAN_STORAGE_LIMITS: PlanStorageLimits = {
  core: 50,
  plus: 200,
  max: 500,
};

/** Warn when usage reaches this share of the plan limit. */
export const QUOTA_WARNING_PCT = 80;

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeStorageQuotas(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === LIMITS_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function loadPlanStorageLimits(): PlanStorageLimits {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PLAN_STORAGE_LIMITS };
  try {
    const raw = localStorage.getItem(LIMITS_KEY);
    if (!raw) {
      const seeded = { ...DEFAULT_PLAN_STORAGE_LIMITS };
      localStorage.setItem(LIMITS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<PlanStorageLimits>;
    return {
      core: Math.max(1, Number(parsed.core) || DEFAULT_PLAN_STORAGE_LIMITS.core),
      plus: Math.max(1, Number(parsed.plus) || DEFAULT_PLAN_STORAGE_LIMITS.plus),
      max: Math.max(1, Number(parsed.max) || DEFAULT_PLAN_STORAGE_LIMITS.max),
    };
  } catch {
    return { ...DEFAULT_PLAN_STORAGE_LIMITS };
  }
}

export function savePlanStorageLimits(next: PlanStorageLimits, previous?: PlanStorageLimits): PlanStorageLimits {
  const normalized: PlanStorageLimits = {
    core: Math.max(1, Math.round(Number(next.core) || 1)),
    plus: Math.max(1, Math.round(Number(next.plus) || 1)),
    max: Math.max(1, Math.round(Number(next.max) || 1)),
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LIMITS_KEY, JSON.stringify(normalized));
    notify();
  }
  const prev = previous ?? loadPlanStorageLimits();
  for (const tier of ["core", "plus", "max"] as const) {
    if (prev[tier] !== normalized[tier]) {
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: `setting.storage_limit_${tier}`,
        targetLabel: `${planLabel(tier)} storage limit`,
        targetKind: "settings",
        before: `${prev[tier]} GB`,
        after: `${normalized[tier]} GB`,
        summary: "Plan storage quota updated",
      });
    }
  }
  return normalized;
}

/**
 * Demo usage estimate from institute size + engagement — not file inventory.
 * Stable per institute so the UI does not jitter.
 */
export function estimateInstituteUsedGb(inst: PlatformInstitute): number {
  const headcount = Math.max(0, inst.studentCount + inst.facultyCount);
  const base = headcount * 0.045; // ~45 MB per person equivalent → GB
  const engagement = 0.55 + (inst.activeUsagePct / 100) * 0.7;
  // Slight plan bias so Max institutes can show higher absolute usage
  const planBias = inst.plan === "max" ? 1.15 : inst.plan === "plus" ? 1.0 : 0.85;
  const raw = base * engagement * planBias;
  // Deterministic fraction from id hash
  let hash = 0;
  for (let i = 0; i < inst.id.length; i++) hash = (hash + inst.id.charCodeAt(i) * (i + 1)) % 97;
  const jitter = 0.88 + (hash / 97) * 0.24;
  return Math.round(raw * jitter * 10) / 10;
}

function resolvePlan(inst: PlatformInstitute): PlanTier {
  try {
    const lic = getLicense(inst.id);
    return (lic.plan as PlanTier) ?? inst.plan;
  } catch {
    return inst.plan;
  }
}

export function quotaStatusFor(pctUsed: number): QuotaStatus {
  if (pctUsed >= 100) return "exceeded";
  if (pctUsed >= QUOTA_WARNING_PCT) return "warning";
  return "ok";
}

export function listInstituteStorageQuotas(
  limits: PlanStorageLimits = loadPlanStorageLimits(),
): InstituteStorageQuota[] {
  return listPlatformInstitutes()
    .filter((i) => i.status !== "archived")
    .map((inst) => {
      const plan = resolvePlan(inst);
      const limitGb = limits[plan];
      const usedGb = estimateInstituteUsedGb(inst);
      const pctUsed = limitGb > 0 ? Math.round((usedGb / limitGb) * 1000) / 10 : 0;
      const remainingGb = Math.max(0, Math.round((limitGb - usedGb) * 10) / 10);
      return {
        instituteId: inst.id,
        instituteName: inst.name,
        location: locationLabel(inst),
        status: inst.status,
        plan,
        planLabel: planLabel(plan as LicensePlan),
        usedGb,
        limitGb,
        pctUsed,
        remainingGb,
        quotaStatus: quotaStatusFor(pctUsed),
      };
    })
    .sort((a, b) => b.pctUsed - a.pctUsed || a.instituteName.localeCompare(b.instituteName));
}

export function storageQuotaStats(rows: InstituteStorageQuota[]) {
  const totalUsed = rows.reduce((s, r) => s + r.usedGb, 0);
  const totalLimit = rows.reduce((s, r) => s + r.limitGb, 0);
  return {
    institutes: rows.length,
    totalUsedGb: Math.round(totalUsed * 10) / 10,
    totalLimitGb: Math.round(totalLimit * 10) / 10,
    warning: rows.filter((r) => r.quotaStatus === "warning").length,
    exceeded: rows.filter((r) => r.quotaStatus === "exceeded").length,
    ok: rows.filter((r) => r.quotaStatus === "ok").length,
  };
}

export function formatGb(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} TB`;
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB`;
}

export function labelQuotaStatus(s: QuotaStatus): string {
  if (s === "exceeded") return "Quota exceeded";
  if (s === "warning") return "Quota warning";
  return "Within quota";
}

export function quotaStatusTone(s: QuotaStatus): "success" | "warning" | "danger" {
  if (s === "exceeded") return "danger";
  if (s === "warning") return "warning";
  return "success";
}
