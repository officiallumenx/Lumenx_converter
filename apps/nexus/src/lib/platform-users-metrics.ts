/**
 * Nexus Platform Users — aggregate counts only (demo).
 * No individual student / parent / teacher / admin profiles.
 * Nexus operators are platform-scoped, not institute staff.
 */

import {
  formatCount,
  listPlatformInstitutes,
  usageTrendLabels,
  type PlatformInstitute,
} from "@/lib/institute-directory-store";

/** Fixed demo count of Nexus platform operators (not institute Admin accounts). */
export const NEXUS_OPERATOR_COUNT = 6;

const TREND_LABELS = usageTrendLabels();

export type PlatformUsersFilter = "all" | string;

export type PlatformUsersSnapshot = {
  filterId: PlatformUsersFilter;
  filterLabel: string;
  institutes: { id: string; name: string; city: string }[];
  /** Role breakdown — institute-scoped when filtered. */
  students: number;
  faculty: number;
  parents: number;
  adminAccounts: number;
  /** Always platform-wide; not tied to one institute. */
  nexusOperators: number;
  /** Students + faculty + parents + admin accounts (+ operators when unfiltered). */
  totalUsers: number;
  activeUsers: number;
  recentlyActiveUsers: number;
  inactiveUsers: number;
  avgUsagePct: number;
  /** Absolute active-user estimates over recent months (demo). */
  usageTrend: { label: string; activeUsers: number; usagePct: number }[];
  /** Per-institute contribution rows (aggregates only). */
  byInstitute: {
    id: string;
    name: string;
    city: string;
    students: number;
    faculty: number;
    parents: number;
    admins: number;
    total: number;
    active: number;
    recentlyActive: number;
    inactive: number;
    usagePct: number;
  }[];
};

function liveInstitutes(all: PlatformInstitute[]): PlatformInstitute[] {
  return all.filter((i) => i.status !== "archived");
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

function instituteUserTotal(i: PlatformInstitute): number {
  return i.studentCount + i.facultyCount + i.parentCount + i.adminCount;
}

/**
 * Demo activity split from usage % — counts only, no identities.
 * - Active: currently engaged (usage%)
 * - Recently active: engaged in last window but not in “active” band
 * - Inactive: remainder
 */
function activitySplit(total: number, usagePct: number) {
  const clamped = Math.max(0, Math.min(100, usagePct));
  const active = Math.round((total * clamped) / 100);
  const recentPct = Math.max(0, Math.min(20, Math.round((100 - clamped) * 0.35)));
  const recentlyActive = Math.min(total - active, Math.round((total * recentPct) / 100));
  const inactive = Math.max(0, total - active - recentlyActive);
  return { active, recentlyActive, inactive };
}

function avgUsage(pool: PlatformInstitute[]): number {
  if (pool.length === 0) return 0;
  return Math.round(sum(pool.map((i) => i.activeUsagePct)) / pool.length);
}

function blendedTrend(pool: PlatformInstitute[], baseTotal: number) {
  if (pool.length === 0) {
    return TREND_LABELS.map((label) => ({ label, activeUsers: 0, usagePct: 0 }));
  }
  const len = Math.max(...pool.map((i) => i.usageTrend.length), TREND_LABELS.length);
  return Array.from({ length: Math.min(len, TREND_LABELS.length) }, (_, idx) => {
    const pts = pool.map((i) => i.usageTrend[idx] ?? i.activeUsagePct);
    const usagePct = Math.round(sum(pts) / pts.length);
    const activeUsers = Math.round((baseTotal * usagePct) / 100);
    return {
      label: TREND_LABELS[idx] ?? `M${idx + 1}`,
      activeUsers,
      usagePct,
    };
  });
}

export function buildPlatformUsersSnapshot(
  filterId: PlatformUsersFilter = "all",
): PlatformUsersSnapshot {
  const all = listPlatformInstitutes();
  const live = liveInstitutes(all);
  const institutes = live
    .map((i) => ({ id: i.id, name: i.name, city: i.city }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pool =
    filterId === "all" ? live : live.filter((i) => i.id === filterId);

  const selected = filterId === "all" ? null : pool[0] ?? null;
  const filterLabel =
    filterId === "all" ? "All institutes" : selected?.name ?? "Unknown institute";

  const students = sum(pool.map((i) => i.studentCount));
  const faculty = sum(pool.map((i) => i.facultyCount));
  const parents = sum(pool.map((i) => i.parentCount));
  const adminAccounts = sum(pool.map((i) => i.adminCount));
  const nexusOperators = NEXUS_OPERATOR_COUNT;

  const instituteScoped = students + faculty + parents + adminAccounts;
  const totalUsers =
    filterId === "all" ? instituteScoped + nexusOperators : instituteScoped;

  const usagePct = avgUsage(pool);
  const split = activitySplit(instituteScoped, usagePct);
  // Operators count as active when viewing platform-wide.
  const activeUsers = filterId === "all" ? split.active + nexusOperators : split.active;
  const recentlyActiveUsers = split.recentlyActive;
  const inactiveUsers = split.inactive;

  const byInstitute = pool
    .map((i) => {
      const total = instituteUserTotal(i);
      const a = activitySplit(total, i.activeUsagePct);
      return {
        id: i.id,
        name: i.name,
        city: i.city,
        students: i.studentCount,
        faculty: i.facultyCount,
        parents: i.parentCount,
        admins: i.adminCount,
        total,
        active: a.active,
        recentlyActive: a.recentlyActive,
        inactive: a.inactive,
        usagePct: i.activeUsagePct,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    filterId,
    filterLabel,
    institutes,
    students,
    faculty,
    parents,
    adminAccounts,
    nexusOperators,
    totalUsers,
    activeUsers,
    recentlyActiveUsers,
    inactiveUsers,
    avgUsagePct: usagePct,
    usageTrend: blendedTrend(pool, instituteScoped),
    byInstitute,
  };
}

export { formatCount };
