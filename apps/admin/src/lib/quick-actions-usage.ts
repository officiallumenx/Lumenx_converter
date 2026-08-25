/**
 * Rank Admin Home Quick Actions "Top" tab.
 * Usage counts win; missing counts fall back to a default daily-ops order.
 */

export const QUICK_ACTIONS_USAGE_KEY = "lumenx.admin.quick-actions.usage.v1";
export const QUICK_ACTIONS_TOP_LIMIT = 12;

/** Default Top 12 until the admin's own usage ranks modules. */
export const DEFAULT_QUICK_ACTION_PATHS = [
  "/students",
  "/teachers",
  "/student-attendance",
  "/marks",
  "/timetable",
  "/announcements",
  "/complaints",
  "/fees",
  "/admissions",
  "/leave",
  "/templates",
  "/notifications",
] as const;

export function loadQuickActionUsage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(QUICK_ACTIONS_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordQuickActionUse(path: string): void {
  try {
    const counts = loadQuickActionUsage();
    counts[path] = (counts[path] ?? 0) + 1;
    localStorage.setItem(QUICK_ACTIONS_USAGE_KEY, JSON.stringify(counts));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function rankTopQuickActions<T extends { to: string }>(
  items: readonly T[],
  counts: Record<string, number>,
  defaults: readonly string[] = DEFAULT_QUICK_ACTION_PATHS,
  limit = QUICK_ACTIONS_TOP_LIMIT,
): T[] {
  const defaultRank = new Map(defaults.map((to, index) => [to, index]));
  return [...items]
    .sort((a, b) => {
      const countA = counts[a.to] ?? 0;
      const countB = counts[b.to] ?? 0;
      if (countA !== countB) return countB - countA;
      const rankA = defaultRank.get(a.to) ?? Number.POSITIVE_INFINITY;
      const rankB = defaultRank.get(b.to) ?? Number.POSITIVE_INFINITY;
      return rankA - rankB;
    })
    .slice(0, limit);
}
