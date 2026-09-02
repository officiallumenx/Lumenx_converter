import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import { assertPlatformOperator } from "../../authorization/index.js";
import { listInstitutes } from "../identity/repository.js";
import { listAllThreadsForPlatform } from "../support/repository.js";
import {
  listAllPeriods,
  listEntitlementsForLicenses,
  listLicenses,
} from "./repository.js";

export type NetworkAnalyticsRange = "30d" | "90d" | "6m" | "12m";

export type NetworkAnalyticsDto = {
  range: NetworkAnalyticsRange;
  generatedAt: string;
  instituteOptions: Array<{ id: string; name: string }>;
  kpis: {
    institutes: number;
    activeInstitutes: number;
    inactiveInstitutes: number;
    students: number;
    faculty: number;
    parents: number;
    platformUsers: number;
    billedInr: number;
    paidInr: number;
    pendingInr: number;
    renewalsInWindow: number;
    supportOpen: number;
    supportResolved: number;
  };
  series: {
    labels: string[];
    instituteGrowth: number[];
    studentGrowth: number[];
    facultyGrowth: number[];
    parentGrowth: number[];
    userGrowth: number[];
    billedInr: number[];
    paidInr: number[];
    renewals: number[];
    supportOpen: number[];
    supportResolved: number[];
  };
  planMix: { core: number; plus: number; max: number };
  moduleAdoption: Array<{
    id: string;
    label: string;
    enabled: number;
    total: number;
    pct: number;
  }>;
};

type MonthBucket = {
  label: string;
  startMs: number;
  endMs: number;
};

function monthsForRange(range: NetworkAnalyticsRange): number {
  if (range === "30d") return 1;
  if (range === "90d") return 3;
  if (range === "6m") return 6;
  return 12;
}

function buildMonthBuckets(range: NetworkAnalyticsRange): MonthBucket[] {
  const count = monthsForRange(range);
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    buckets.push({
      label: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      startMs: start.getTime(),
      endMs: end.getTime(),
    });
  }
  return buckets;
}

function num(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function cumulativeByCreatedAt(
  rows: Array<{ created_at: string }>,
  buckets: MonthBucket[],
): number[] {
  const times = rows
    .map((r) => Date.parse(r.created_at))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  let idx = 0;
  let running = 0;
  return buckets.map((b) => {
    while (idx < times.length && times[idx]! < b.endMs) {
      running += 1;
      idx += 1;
    }
    return running;
  });
}

function sumInBucket(
  rows: Array<{ at: number; amount: number }>,
  buckets: MonthBucket[],
): number[] {
  return buckets.map((b) =>
    rows
      .filter((r) => r.at >= b.startMs && r.at < b.endMs)
      .reduce((acc, r) => acc + r.amount, 0),
  );
}

function countInBucket(times: number[], buckets: MonthBucket[]): number[] {
  return buckets.map(
    (b) => times.filter((t) => t >= b.startMs && t < b.endMs).length,
  );
}

async function listCreatedAts(
  admin: SupabaseClient,
  table: string,
  instituteIds: string[],
): Promise<Array<{ created_at: string }>> {
  if (instituteIds.length === 0) return [];
  const result = await admin
    .from(table)
    .select("created_at")
    .in("institute_id", instituteIds)
    .is("deleted_at", null);
  if (result.error || !result.data) return [];
  return result.data as Array<{ created_at: string }>;
}

/**
 * Cross-institute platform analytics for Nexus operators.
 * Aggregates only — no student/teacher personal records.
 */
export async function getNetworkAnalyticsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input?: {
    range?: NetworkAnalyticsRange;
    instituteId?: string | null;
    plan?: "all" | "core" | "plus" | "max";
  },
): Promise<NetworkAnalyticsDto> {
  assertPlatformOperator(actor);
  const range = input?.range ?? "6m";
  const buckets = buildMonthBuckets(range);

  const [institutes, licenses, periods, threads] = await Promise.all([
    listInstitutes(admin),
    listLicenses(admin),
    listAllPeriods(admin),
    listAllThreadsForPlatform(admin, { limit: 500 }),
  ]);

  const licenseByInstitute = new Map(licenses.map((l) => [l.institute_id, l]));
  const live = institutes.filter((i) => {
    if (i.status === "archived") return false;
    if (input?.instituteId && i.id !== input.instituteId) return false;
    const plan = licenseByInstitute.get(i.id)?.plan;
    if (input?.plan && input.plan !== "all" && plan !== input.plan) return false;
    return true;
  });
  const liveIds = new Set(live.map((i) => i.id));
  const liveIdList = [...liveIds];

  const entitlements = await listEntitlementsForLicenses(
    admin,
    licenses.filter((l) => liveIds.has(l.institute_id)).map((l) => l.id),
  );

  const [studentRows, teacherRows, parentRows] = await Promise.all([
    listCreatedAts(admin, "student", liveIdList),
    listCreatedAts(admin, "teacher", liveIdList),
    listCreatedAts(admin, "parent", liveIdList),
  ]);

  const students = studentRows.length;
  const faculty = teacherRows.length;
  const parents = parentRows.length;

  const activeInstitutes = live.filter((i) => i.status === "active").length;
  const inactiveInstitutes = live.filter(
    (i) => i.status === "inactive" || i.status === "suspended",
  ).length;

  const filteredPeriods = periods.filter((p) => liveIds.has(p.institute_id));
  const billedInr = filteredPeriods.reduce(
    (acc, p) => acc + num(p.payable_amount_inr),
    0,
  );
  const paidInr = filteredPeriods.reduce(
    (acc, p) => acc + num(p.amount_paid_inr),
    0,
  );
  const pendingInr = Math.max(0, billedInr - paidInr);

  const now = Date.now();
  const windowMs =
    range === "30d"
      ? 30 * 864e5
      : range === "90d"
        ? 90 * 864e5
        : range === "6m"
          ? 182 * 864e5
          : 365 * 864e5;
  const renewalsInWindow = filteredPeriods.filter((p) => {
    const ends = Date.parse(p.ends_at);
    return Number.isFinite(ends) && ends >= now && ends <= now + windowMs;
  }).length;

  const filteredThreads = threads.filter((t) => liveIds.has(t.institute_id));
  const supportOpen = filteredThreads.filter(
    (t) =>
      t.status === "open" ||
      t.status === "in_progress" ||
      t.status === "waiting",
  ).length;
  const supportResolved = filteredThreads.filter(
    (t) => t.status === "resolved",
  ).length;

  const planMix = { core: 0, plus: 0, max: 0 };
  for (const institute of live) {
    const plan = licenseByInstitute.get(institute.id)?.plan ?? "core";
    planMix[plan] = (planMix[plan] ?? 0) + 1;
  }

  const moduleCounts = new Map<string, number>();
  for (const e of entitlements) {
    if (!e.enabled || e.scope !== "admin_module") continue;
    if (!liveIds.has(e.institute_id)) continue;
    moduleCounts.set(e.target_id, (moduleCounts.get(e.target_id) ?? 0) + 1);
  }
  const totalLive = live.length || 1;
  const moduleAdoption = [...moduleCounts.entries()]
    .map(([id, enabled]) => ({
      id,
      label: id.replace(/^lumenx\.module\./, "").replace(/_/g, " "),
      enabled,
      total: live.length,
      pct: Math.round((enabled / totalLive) * 100),
    }))
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label))
    .slice(0, 12);

  const instituteGrowth = cumulativeByCreatedAt(live, buckets);
  const studentGrowth = cumulativeByCreatedAt(studentRows, buckets);
  const facultyGrowth = cumulativeByCreatedAt(teacherRows, buckets);
  const parentGrowth = cumulativeByCreatedAt(parentRows, buckets);
  const userGrowth = buckets.map(
    (_, i) =>
      (studentGrowth[i] ?? 0) + (facultyGrowth[i] ?? 0) + (parentGrowth[i] ?? 0),
  );

  const billedSeries = sumInBucket(
    filteredPeriods.map((p) => ({
      at: Date.parse(p.starts_at),
      amount: num(p.payable_amount_inr),
    })),
    buckets,
  );
  const paidSeries = sumInBucket(
    filteredPeriods
      .filter((p) => p.paid_at)
      .map((p) => ({
        at: Date.parse(p.paid_at!),
        amount: num(p.amount_paid_inr),
      })),
    buckets,
  );
  const renewalSeries = countInBucket(
    filteredPeriods
      .map((p) => Date.parse(p.ends_at))
      .filter((t) => Number.isFinite(t)),
    buckets,
  );
  const supportOpenSeries = countInBucket(
    filteredThreads
      .filter((t) => t.status !== "resolved")
      .map((t) => Date.parse(t.created_at))
      .filter((t) => Number.isFinite(t)),
    buckets,
  );
  const supportResolvedSeries = countInBucket(
    filteredThreads
      .filter((t) => t.status === "resolved")
      .map((t) => Date.parse(t.updated_at))
      .filter((t) => Number.isFinite(t)),
    buckets,
  );

  return {
    range,
    generatedAt: new Date().toISOString(),
    instituteOptions: institutes
      .filter((i) => i.status !== "archived")
      .map((i) => ({ id: i.id, name: i.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    kpis: {
      institutes: live.length,
      activeInstitutes,
      inactiveInstitutes,
      students,
      faculty,
      parents,
      platformUsers: students + faculty + parents,
      billedInr,
      paidInr,
      pendingInr,
      renewalsInWindow,
      supportOpen,
      supportResolved,
    },
    series: {
      labels: buckets.map((b) => b.label),
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
    moduleAdoption,
  };
}
