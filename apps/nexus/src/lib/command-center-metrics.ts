/**
 * Nexus Command Center — platform aggregates (demo only).
 * Institute-level and portfolio counts only. No person-level PII.
 */

import {
  directoryStats,
  formatCount,
  labelRisk,
  listPlatformInstitutes,
  locationLabel,
  riskTone,
  type PlatformInstitute,
  type RiskStatus,
} from "@/lib/institute-directory-store";
import {
  NEXUS_MODULE_CATALOG,
  billingPortfolioStats,
  formatMoneyInr,
  listInstituteBillingRows,
  listUpcomingReminders,
  loadLicenses,
  planLabel,
  type PlanTier,
} from "@/lib/institute-licensing-store";

export type MissionControlSnapshot = ReturnType<typeof buildMissionControlSnapshot>;

export type PlatformActivityKind =
  | "plan_changed"
  | "module_toggled"
  | "institute_created"
  | "payment_status"
  | "support_ticket";

export type PlatformActivityItem = {
  id: string;
  kind: PlatformActivityKind;
  title: string;
  detail: string;
  instituteName?: string;
  time: string;
};

/** Demo support / SLA / health signals (not institute ops). */
const PLATFORM_OPS_DEMO = {
  openTickets: 17,
  slaBreaches: 3,
  healthLabel: "Operational",
  healthTone: "success" as const,
  apiP99Ms: 164,
  ingestLagSec: 2.4,
  jobFailures24h: 1,
};

function liveInstitutes(all: PlatformInstitute[]): PlatformInstitute[] {
  return all.filter((i) => i.status !== "archived");
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

function trendDeclining(trend: number[]): boolean {
  if (trend.length < 2) return false;
  const last = trend[trend.length - 1]!;
  const prev = trend[trend.length - 2]!;
  const first = trend[0]!;
  return last < prev || last <= first - 5;
}

function studentDeclineEstimate(inst: PlatformInstitute): number {
  if (inst.usageTrend.length < 2) return 0;
  const last = inst.usageTrend[inst.usageTrend.length - 1]!;
  const prev = inst.usageTrend[inst.usageTrend.length - 2]!;
  const deltaPct = (last - prev) / Math.max(prev, 1);
  if (deltaPct >= 0) return 0;
  return Math.round(inst.studentCount * deltaPct);
}

function moduleAdoption(
  institutes: PlatformInstitute[],
  licenses: ReturnType<typeof loadLicenses>,
) {
  const pool = liveInstitutes(institutes);
  const total = pool.length || 1;
  return NEXUS_MODULE_CATALOG.map((m) => {
    const enabled = pool.filter((i) => {
      const mods = licenses[i.id]?.modules ?? i.modules;
      return mods[m.id] === true;
    }).length;
    return {
      id: m.id,
      label: m.label,
      group: m.group,
      enabled,
      total: pool.length,
      pct: Math.round((enabled / total) * 100),
    };
  }).sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label));
}

function planMixFromLicenses(
  institutes: PlatformInstitute[],
  licenses: ReturnType<typeof loadLicenses>,
): Record<PlanTier, number> {
  const out: Record<PlanTier, number> = { core: 0, plus: 0, max: 0 };
  for (const i of liveInstitutes(institutes)) {
    const plan = licenses[i.id]?.plan ?? i.plan;
    out[plan] = (out[plan] ?? 0) + 1;
  }
  return out;
}

function topRisky(
  institutes: PlatformInstitute[],
  licenses: ReturnType<typeof loadLicenses>,
) {
  const rank: Record<RiskStatus, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...liveInstitutes(institutes)]
    .filter((i) => i.riskStatus === "high" || i.riskStatus === "critical" || i.riskStatus === "medium")
    .sort((a, b) => rank[a.riskStatus] - rank[b.riskStatus] || b.studentCount - a.studentCount)
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      risk: i.riskStatus,
      riskLabel: labelRisk(i.riskStatus),
      riskTone: riskTone(i.riskStatus),
      usagePct: i.activeUsagePct,
      paymentStatus: i.paymentStatus,
      studentCount: i.studentCount,
      reasons: riskReasons(i, licenses),
    }));
}

function riskReasons(
  i: PlatformInstitute,
  licenses: ReturnType<typeof loadLicenses>,
): string[] {
  const reasons: string[] = [];
  const mods = licenses[i.id]?.modules ?? i.modules;
  if (i.paymentStatus === "overdue" || i.pendingAmountInr > 0) reasons.push("Payment");
  if (trendDeclining(i.usageTrend) || i.usageStatus === "low" || i.usageStatus === "inactive") {
    reasons.push("Usage");
  }
  if (studentDeclineEstimate(i) < 0) reasons.push("Enrollment");
  if (mods.storage && i.activeUsagePct > 85) reasons.push("Storage");
  if (i.riskStatus === "critical" || i.riskStatus === "high") reasons.push("Support");
  if (reasons.length === 0) reasons.push("Watchlist");
  return reasons;
}

/** Fixed demo activity feed — institute / platform events only. */
export const PLATFORM_ACTIVITY_SEED: PlatformActivityItem[] = [
  {
    id: "act-1",
    kind: "plan_changed",
    title: "Plan changed",
    detail: "Plus → Max",
    instituteName: "Test1School",
    time: "12m ago",
  },
  {
    id: "act-2",
    kind: "module_toggled",
    title: "Module disabled",
    detail: "Transport entitlement off",
    instituteName: "Test1School",
    time: "18m ago",
  },
  {
    id: "act-3",
    kind: "payment_status",
    title: "Payment status changed",
    detail: "Marked overdue · renewal window",
    instituteName: "Test1School",
    time: "41m ago",
  },
  {
    id: "act-4",
    kind: "institute_created",
    title: "Institute created",
    detail: "Trial · Plus plan",
    instituteName: "Test1School",
    time: "2h ago",
  },
  {
    id: "act-5",
    kind: "module_toggled",
    title: "Module enabled",
    detail: "Analytics entitlement on",
    instituteName: "Test1School",
    time: "3h ago",
  },
  {
    id: "act-6",
    kind: "support_ticket",
    title: "Support ticket updated",
    detail: "SLA clock running · P1 billing",
    instituteName: "Test1School",
    time: "4h ago",
  },
  {
    id: "act-7",
    kind: "payment_status",
    title: "Payment status changed",
    detail: "Partial → pending balance",
    instituteName: "Test1School",
    time: "6h ago",
  },
  {
    id: "act-8",
    kind: "plan_changed",
    title: "Plan changed",
    detail: "Core assigned on create",
    instituteName: "Test1School",
    time: "1d ago",
  },
];

export function buildMissionControlSnapshot() {
  const institutes = listPlatformInstitutes();
  const live = liveInstitutes(institutes);
  const stats = directoryStats(institutes);

  const students = sum(live.map((i) => i.studentCount));
  const faculty = sum(live.map((i) => i.facultyCount));
  const parents = sum(live.map((i) => i.parentCount));
  const admins = sum(live.map((i) => i.adminCount));
  const platformUsers = students + faculty + parents + admins;

  const licenses = loadLicenses();
  const instituteSeeds = live.map((i) => ({
    id: i.id,
    name: i.name,
    studentCount: i.studentCount,
    city: i.city,
  }));
  const billingRows = listInstituteBillingRows(licenses, instituteSeeds);
  const billing = billingPortfolioStats(billingRows);
  const reminders = listUpcomingReminders(licenses, instituteSeeds);

  const planMix = planMixFromLicenses(institutes, licenses);

  const activePlans = liveInstitutes(institutes).filter((i) => i.status === "active" || i.status === "trial").length;

  const adoption = moduleAdoption(institutes, licenses);
  const avgUsage =
    live.length === 0 ? 0 : Math.round(sum(live.map((i) => i.activeUsagePct)) / live.length);

  const inactive = live.filter(
    (i) => i.usageStatus === "inactive" || i.status === "suspended" || i.activeUsagePct < 25,
  );

  const usageDecline = live
    .filter((i) => trendDeclining(i.usageTrend) || i.usageStatus === "low" || i.usageStatus === "inactive")
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      usagePct: i.activeUsagePct,
      deltaPts: i.usageTrend.length >= 2
        ? i.usageTrend[i.usageTrend.length - 1]! - i.usageTrend[i.usageTrend.length - 2]!
        : 0,
    }))
    .sort((a, b) => a.deltaPts - b.deltaPts)
    .slice(0, 5);

  const studentDecline = live
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      studentCount: i.studentCount,
      delta: studentDeclineEstimate(i),
    }))
    .filter((r) => r.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);

  const paymentRisk = live
    .filter((i) => i.paymentStatus === "overdue" || i.paymentStatus === "partial" || i.pendingAmountInr > 0)
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      paymentStatus: i.paymentStatus,
      pendingInr: i.pendingAmountInr,
    }))
    .sort((a, b) => b.pendingInr - a.pendingInr)
    .slice(0, 5);

  const storageRisk = live
    .filter((i) => (licenses[i.id]?.modules ?? i.modules).storage !== false)
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      /** Demo proxy: high usage + storage module ≈ quota pressure */
      pressurePct: Math.min(98, Math.round(i.activeUsagePct * 0.9 + (i.riskStatus === "high" || i.riskStatus === "critical" ? 12 : 0))),
    }))
    .filter((r) => r.pressurePct >= 70)
    .sort((a, b) => b.pressurePct - a.pressurePct)
    .slice(0, 5);

  const supportRisk = live
    .filter((i) => i.riskStatus === "high" || i.riskStatus === "critical")
    .map((i) => ({
      id: i.id,
      name: i.name,
      location: locationLabel(i),
      risk: i.riskStatus,
      openTicketsDemo: i.riskStatus === "critical" ? 4 : 2,
    }))
    .slice(0, 5);

  const overdueInstitutes = live.filter(
    (i) => i.paymentStatus === "overdue" || i.renewalStatus === "overdue",
  );

  return {
    kpis: {
      totalInstitutes: stats.total,
      activeInstitutes: stats.active,
      trialInstitutes: stats.trial,
      suspendedInstitutes: stats.suspended,
      overdueInstitutes: overdueInstitutes.length,
      totalStudents: students,
      totalFaculty: faculty,
      totalParents: parents,
      totalPlatformUsers: platformUsers,
    },
    business: {
      activePlans,
      planMix,
      planLabels: {
        core: planLabel("core"),
        plus: planLabel("plus"),
        max: planLabel("max"),
      },
      revenuePaidInr: billing.paid,
      revenueBilledInr: billing.billed,
      pendingInr: billing.pending,
      overdueCount: billing.overdue,
      upcomingRenewals: reminders.slice(0, 6).map((r) => ({
        instituteId: r.instituteId,
        instituteName: r.instituteName,
        daysUntil: r.daysUntil,
        status: r.status,
        amountInr: r.amountInr,
        plan: r.plan,
      })),
    },
    platform: {
      moduleAdoption: adoption.slice(0, 10),
      avgActiveUsagePct: avgUsage,
      activeUsageHealthy: live.filter((i) => i.usageStatus === "healthy").length,
      activeUsageModerate: live.filter((i) => i.usageStatus === "moderate").length,
      activeUsageLow: live.filter((i) => i.usageStatus === "low" || i.usageStatus === "inactive").length,
      inactiveInstitutes: inactive.map((i) => ({
        id: i.id,
        name: i.name,
        location: locationLabel(i),
        status: i.status,
        usagePct: i.activeUsagePct,
      })),
      health: PLATFORM_OPS_DEMO,
      openTickets: PLATFORM_OPS_DEMO.openTickets,
      slaBreaches: PLATFORM_OPS_DEMO.slaBreaches,
    },
    risk: {
      topRisky: topRisky(institutes, licenses),
      usageDecline,
      studentDecline,
      paymentRisk,
      storageRisk,
      supportRisk,
    },
    activity: PLATFORM_ACTIVITY_SEED,
    format: {
      count: formatCount,
      money: formatMoneyInr,
    },
  };
}
