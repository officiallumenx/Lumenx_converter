import type { Goal, Streak } from "@lumenx/types";
import { clamp } from "@lumenx/utils";
import {
  goals as baseGoals,
  instituteAssignedGoals,
  streaks as baseStreaks,
} from "@/lib/mock-data";
import type { ParentPortalSnapshot } from "@/lib/parent-portal-data";
import type { StudentSnapshot } from "@/lib/student/types";

export type GrowthActivityKind =
  | "achievement"
  | "remark"
  | "notification"
  | "attendance"
  | "competition"
  | "marks";

export type GrowthActivity = {
  id: string;
  kind: GrowthActivityKind;
  title: string;
  description: string;
  time: string;
  tone?: "positive" | "warning" | "info";
};

const ASSIGNMENT_METRIC = /assignments?|submit.*(homework|assignment|lab)/i;

/** Hide online-submission streaks and goals — work is tracked at school only. */
export function filterGrowthStreaks(streaks: Streak[]): Streak[] {
  return streaks.filter(
    (s) => s.id !== "s-asg" && !/assignment.*on.?time|submit/i.test(s.label),
  );
}

export function filterGrowthGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => !ASSIGNMENT_METRIC.test(g.metric) && !ASSIGNMENT_METRIC.test(g.title));
}

function presentStreakFromDays(days: { status: string }[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const status = days[i].status;
    // Future days and non-working days (holidays/weekly-offs) neither count nor break the
    // streak; only an actual absence or leave ends the run of trailing present days.
    if (status === "future" || status === "holiday") continue;
    if (status === "present") streak += 1;
    else break;
  }
  return streak;
}

export function goalsFromProfile(attendance: number, avgScore: number): Goal[] {
  return filterGrowthGoals(
    baseGoals.map((g) => {
      if (g.metric === "attendance") {
        return { ...g, current: attendance, target: Math.max(attendance, 95) };
      }
      if (g.metric === "marks") {
        return { ...g, current: avgScore, target: Math.max(avgScore + 2, 88) };
      }
      return g;
    }),
  );
}

export function streaksFromAttendanceDays(
  days: { status: string }[],
  trend: { term: string; score: number }[],
): Streak[] {
  const current = presentStreakFromDays(days);
  const best = Math.max(current, baseStreaks.find((s) => s.id === "s-att")?.best ?? 24);
  const impBase = baseStreaks.find((s) => s.id === "s-imp");
  // Count consecutive terms of rising scores from the latest, instead of a synthetic bump.
  let improving = 0;
  for (let i = trend.length - 1; i > 0; i--) {
    if (trend[i].score > trend[i - 1].score) improving += 1;
    else break;
  }
  const impCurrent = clamp(improving, 0, impBase?.best ?? 5);

  return filterGrowthStreaks([
    {
      id: "s-att",
      label: "Attendance streak",
      current,
      best,
      unit: "days",
      tone: "success",
    },
    {
      id: "s-imp",
      label: "Improvement streak",
      current: impCurrent,
      best: impBase?.best ?? 5,
      unit: "weeks",
      tone: "warning",
    },
  ]);
}

export function buildParentGrowthActivities(snap: ParentPortalSnapshot): GrowthActivity[] {
  const items: GrowthActivity[] = [];

  for (const a of snap.achievements.filter((x) => !x.progress)) {
    items.push({
      id: `ach-${a.id}`,
      kind: "achievement",
      title: a.title,
      description: a.description,
      time: a.unlockedOn ?? "Recently",
      tone: "positive",
    });
  }

  snap.remarks.forEach((r, i) => {
    items.push({
      id: `rm-${i}-${r.teacher}`,
      kind: "remark",
      title: `${r.subject} · ${r.teacher}`,
      description: r.text,
      time: r.date,
      tone: r.tone === "positive" ? "positive" : r.tone === "warning" ? "warning" : "info",
    });
  });

  for (const n of snap.notifications.slice(0, 6)) {
    items.push({
      id: `nt-${n.id}`,
      kind: "notification",
      title: n.title,
      description: n.desc,
      time: n.time,
      tone: "info",
    });
  }

  const absent = snap.attendanceDays.filter((d) => d.status === "absent");
  if (absent.length > 0) {
    items.push({
      id: "att-absent",
      kind: "attendance",
      title: "Attendance update",
      description: `${snap.shortName} was marked absent on ${absent.length} day${absent.length > 1 ? "s" : ""} this month.`,
      time: "This month",
      tone: "warning",
    });
  } else {
    items.push({
      id: "att-perfect",
      kind: "attendance",
      title: "Strong attendance",
      description: `No absences recorded for ${snap.shortName} in the current month window.`,
      time: "This month",
      tone: "positive",
    });
  }

  const latestRc = snap.reportCards[0];
  if (latestRc) {
    items.push({
      id: `rc-${latestRc.term}`,
      kind: "marks",
      title: `${latestRc.term} report published`,
      description: `Aggregate ${latestRc.percentage}% · Grade ${latestRc.grade} · Rank #${latestRc.rank}`,
      time: latestRc.term,
      tone: "positive",
    });
  }

  return items.slice(0, 12);
}

export function buildStudentGrowthActivities(snap: StudentSnapshot): GrowthActivity[] {
  const items: GrowthActivity[] = [];

  for (const a of snap.achievements.filter((x) => !x.progress)) {
    items.push({
      id: `ach-${a.id}`,
      kind: "achievement",
      title: a.title,
      description: a.description,
      time: a.unlockedOn ?? "Recently",
      tone: "positive",
    });
  }

  for (const c of snap.competitions.slice(0, 3)) {
    items.push({
      id: `cmp-${c.id}`,
      kind: "competition",
      title: c.title,
      description: `${c.result}${c.rank ? ` · ${c.rank}` : ""} · ${c.category}`,
      time: c.date,
      tone: "positive",
    });
  }

  for (const n of snap.notifications.slice(0, 5)) {
    items.push({
      id: `nt-${n.id}`,
      kind: "notification",
      title: n.title,
      description: n.desc,
      time: n.time,
      tone: "info",
    });
  }

  const summary = snap.attendanceSummary;
  items.push({
    id: "att-summary",
    kind: "attendance",
    title: `${summary.monthLabel} attendance`,
    description: `${summary.attendancePct}% present · ${summary.present} of ${summary.workingDays} working days`,
    time: summary.monthLabel,
    tone: summary.attendancePct >= 90 ? "positive" : "warning",
  });

  const latestTerm = snap.academicTerms[0];
  if (latestTerm) {
    items.push({
      id: `term-${latestTerm.id}`,
      kind: "marks",
      title: `${latestTerm.label} summary`,
      description: `Average ${latestTerm.avgScore}% · Rank #${latestTerm.rank} of ${latestTerm.classSize}`,
      time: latestTerm.year,
      tone: "positive",
    });
  }

  return items.slice(0, 12);
}

export function parentGrowthGoals(snap: ParentPortalSnapshot): Goal[] {
  return [...filterGrowthGoals(snap.goals), ...filterGrowthGoals(snap.instituteGoals)];
}

export function studentGrowthGoals(snap: StudentSnapshot): Goal[] {
  const avg =
    snap.academicTerms[0]?.avgScore ??
    Math.round(snap.performance.reduce((s, p) => s + p.score, 0) / Math.max(snap.performance.length, 1));
  return [
    ...goalsFromProfile(snap.attendanceSummary.attendancePct, avg),
    ...filterGrowthGoals(instituteAssignedGoals),
  ];
}
