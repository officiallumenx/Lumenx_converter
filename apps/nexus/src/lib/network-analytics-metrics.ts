/**
 * Nexus Network Analytics — cross-institute platform metrics (demo).
 * Answers "How is the LumenX platform performing?" — not one-school ops.
 * Aggregates only. No student / teacher / parent personal records.
 */

import {
  formatCount,
  listPlatformInstitutes,
  usageTrendLabels,
  type InstituteStatus,
  type PlatformInstitute,
  type PlanTier,
} from "@/lib/institute-directory-store";
import {
  NEXUS_MODULE_CATALOG,
  billingPortfolioStats,
  formatMoneyInr,
  listInstituteBillingRows,
  listUpcomingReminders,
  loadLicenses,
  planLabel,
} from "@/lib/institute-licensing-store";
import { listSupportThreads, supportStats } from "@/lib/support-center-store";

export type DateRangeKey = "30d" | "90d" | "6m" | "12m";

export type NetworkAnalyticsFilters = {
  dateRange: DateRangeKey;
  instituteId: "all" | string;
  plan: "all" | PlanTier;
  moduleId: "all" | string;
  status: "all" | InstituteStatus;
};

export const DATE_RANGE_OPTIONS: { id: DateRangeKey; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
];

const MONTH_LABELS_12 = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"] as const;

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function monthsForRange(range: DateRangeKey): number {
  if (range === "30d") return 1;
  if (range === "90d") return 3;
  if (range === "6m") return 6;
  return 12;
}

function sliceLabels(count: number): string[] {
  const base = [...MONTH_LABELS_12];
  if (count >= base.length) return base;
  return base.slice(base.length - count);
}

/** Deterministic growth curve ending at `end` over `n` points. */
function growTo(end: number, n: number, startRatio = 0.62): number[] {
  const start = Math.max(0, Math.round(end * startRatio));
  if (n <= 1) return [end];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const eased = start + (end - start) * (0.15 + 0.85 * t * t);
    out.push(Math.round(eased));
  }
  out[out.length - 1] = end;
  return out;
}

function filterInstitutes(
  all: PlatformInstitute[],
  filters: NetworkAnalyticsFilters,
  licenses: ReturnType<typeof loadLicenses>,
): PlatformInstitute[] {
  return all.filter((i) => {
    if (filters.instituteId !== "all" && i.id !== filters.instituteId) return false;
    const plan = licenses[i.id]?.plan ?? i.plan;
    if (filters.plan !== "all" && plan !== filters.plan) return false;
    if (filters.status !== "all" && i.status !== filters.status) return false;
    if (filters.moduleId !== "all") {
      const modules = licenses[i.id]?.modules ?? i.modules;
      if (modules[filters.moduleId] !== true) return false;
    }
    return true;
  });
}

function activePool(institutes: PlatformInstitute[]): PlatformInstitute[] {
  return institutes.filter((i) => i.status === "active" || i.status === "trial");
}

function inactivePool(institutes: PlatformInstitute[]): PlatformInstitute[] {
  return institutes.filter(
    (i) =>
      i.status === "suspended" ||
      i.usageStatus === "inactive" ||
      i.activeUsagePct < 25,
  );
}

export function defaultNetworkAnalyticsFilters(): NetworkAnalyticsFilters {
  return {
    dateRange: "6m",
    instituteId: "all",
    plan: "all",
    moduleId: "all",
    status: "all",
  };
}

export function buildNetworkAnalytics(filters: NetworkAnalyticsFilters) {
  const all = listPlatformInstitutes();
  const licenses = loadLicenses();
  const institutes = filterInstitutes(all, filters, licenses);
  const live = institutes.filter((i) => i.status !== "archived");
  const n = monthsForRange(filters.dateRange);
  const labels = sliceLabels(n);

  const students = sum(live.map((i) => i.studentCount));
  const faculty = sum(live.map((i) => i.facultyCount));
  const parents = sum(live.map((i) => i.parentCount));
  const admins = sum(live.map((i) => i.adminCount));
  const platformUsers = students + faculty + parents + admins;

  const active = activePool(live);
  const inactive = inactivePool(live);

  const instituteGrowth = growTo(live.length, n, 0.45);
  const studentGrowth = growTo(students, n, 0.7);
  const facultyGrowth = growTo(faculty, n, 0.72);
  const parentGrowth = growTo(parents, n, 0.68);
  const userGrowth = growTo(platformUsers, n, 0.69);

  const planMix = { core: 0, plus: 0, max: 0 } as Record<PlanTier, number>;
  for (const i of live) {
    const plan = licenses[i.id]?.plan ?? i.plan;
    planMix[plan] = (planMix[plan] ?? 0) + 1;
  }

  const moduleAdoption = NEXUS_MODULE_CATALOG.map((m) => {
    const enabled = live.filter((i) => (licenses[i.id]?.modules ?? i.modules)[m.id] === true).length;
    const total = live.length || 1;
    return {
      id: m.id,
      label: m.label,
      enabled,
      total: live.length,
      pct: Math.round((enabled / total) * 100),
    };
  })
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label))
    .slice(0, 12);

  const seeds = live.map((i) => ({
    id: i.id,
    name: i.name,
    studentCount: i.studentCount,
    city: i.city,
  }));
  const billingRows = listInstituteBillingRows(licenses, seeds);
  const billing = billingPortfolioStats(billingRows);
  const reminders = listUpcomingReminders(licenses, seeds);

  const billedSeries = growTo(billing.billed, n, 0.55);
  const paidSeries = growTo(billing.paid, n, 0.5);
  const renewalSeries = growTo(Math.max(reminders.length, 1) * 3, n, 0.4).map((v, i) =>
    i === n - 1 ? reminders.length : Math.max(0, Math.round(v / 3)),
  );

  const usageLabels = [...usageTrendLabels()];
  const usageLen = Math.min(n, usageLabels.length);
  const usageTrend = Array.from({ length: usageLen }, (_, idx) => {
    const pts = live.map((i) => i.usageTrend[i.usageTrend.length - usageLen + idx] ?? i.activeUsagePct);
    const avg = live.length ? Math.round(sum(pts) / live.length) : 0;
    return {
      label: usageLabels[usageLabels.length - usageLen + idx] ?? labels[idx]!,
      avgUsagePct: clamp(avg, 0, 100),
    };
  });

  const threads = listSupportThreads().filter((t) => {
    if (filters.instituteId !== "all" && t.instituteId !== filters.instituteId) return false;
    return true;
  });
  const support = supportStats(threads);
  const supportOpenSeries = growTo(support.open + support.inProgress + support.waiting, n, 0.5);
  const supportResolvedSeries = growTo(support.resolved, n, 0.35);

  const instituteOptions = listPlatformInstitutes()
    .filter((i) => i.status !== "archived")
    .map((i) => ({ id: i.id, name: i.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const moduleOptions = NEXUS_MODULE_CATALOG.map((m) => ({ id: m.id, label: m.label }));

  return {
    filters,
    instituteOptions,
    moduleOptions,
    kpis: {
      institutes: live.length,
      activeInstitutes: active.length,
      inactiveInstitutes: inactive.length,
      students,
      faculty,
      parents,
      platformUsers,
      billedInr: billing.billed,
      paidInr: billing.paid,
      pendingInr: billing.pending,
      renewalsInWindow: reminders.length,
      supportOpen: support.open + support.inProgress + support.waiting,
      supportResolved: support.resolved,
      avgUsagePct:
        live.length === 0 ? 0 : Math.round(sum(live.map((i) => i.activeUsagePct)) / live.length),
    },
    series: {
      labels,
      instituteGrowth,
      studentGrowth,
      facultyGrowth,
      parentGrowth,
      userGrowth,
      billedInr: billedSeries,
      paidInr: paidSeries,
      renewals: renewalSeries,
      supportOpen: supportOpenSeries,
      supportResolved: supportResolvedSeries,
    },
    planMix,
    planLabels: {
      core: planLabel("core"),
      plus: planLabel("plus"),
      max: planLabel("max"),
    },
    moduleAdoption,
    usageTrend,
    format: {
      count: formatCount,
      money: formatMoneyInr,
    },
  };
}

export type NetworkAnalyticsSnapshot = ReturnType<typeof buildNetworkAnalytics>;

export function polylinePoints(values: number[], maxOverride?: number): string {
  if (values.length === 0) return "";
  const max = maxOverride ?? Math.max(1, ...values);
  const w = values.length <= 1 ? 100 : 100 / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * w;
      const y = 100 - (v / max) * 92 - 4;
      return `${x},${y}`;
    })
    .join(" ");
}

export function barHeights(values: number[]): number[] {
  const max = Math.max(1, ...values);
  return values.map((v) => Math.max(4, (v / max) * 100));
}
