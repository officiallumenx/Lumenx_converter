/**
 * Parent portal: strictly scoped mock data per linked child.
 * Replace `buildParentPortalSnapshot` with API calls when backend is ready.
 */
import type { AppNotification, Child, Goal, ReportCard, SubjectMark } from "@lumenx/types";
import {
  achievements as baseAchievements,
  assignments as allAssignments,
  children,
  goals as baseGoals,
  instituteAssignedGoals,
  performance as basePerformance,
  remarks as baseRemarks,
  reportCards as baseReportCards,
  streaks as baseStreaks,
  studentTimetable,
  trend as baseTrend,
} from "@/lib/mock-data";

export const LINKED_CHILD_IDS = new Set(children.map((c) => c.id));

export function assertLinkedChildId(childId: string): Child {
  const c = children.find((x) => x.id === childId);
  if (!c) throw new Error(`Invalid child id: ${childId}`);
  return c;
}

export function resolveLinkedChildId(childId: string | null | undefined): string {
  if (childId && LINKED_CHILD_IDS.has(childId)) return childId;
  return children[0]?.id ?? "C1";
}

/** "Class 10" + section "B" → "10-B" */
export function childClassTag(c: Child): string {
  const m = c.className.match(/(\d+)/);
  const num = m?.[1] ?? "?";
  return `${num}-${c.section}`;
}

function seedFromId(id: string): number {
  return id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function jitterPerformance(rows: { subject: string; score: number; prev: number }[], seed: number) {
  const d = (seed % 5) - 2;
  return rows.map((r) => ({
    ...r,
    score: clamp(r.score + d, 40, 100),
    prev: clamp(r.prev + (d > 0 ? -1 : 1), 35, 98),
  }));
}

function jitterTrend(rows: { term: string; score: number }[], base: number, seed: number) {
  const d = (seed % 4) - 1;
  return rows.map((r, i) => ({
    ...r,
    score: clamp(base - 10 + i * 3 + d, 55, 98),
  }));
}

function cloneReportCards(seed: number, avgHint: number): ReportCard[] {
  const adjustMarks = (marks: SubjectMark[]): SubjectMark[] =>
    marks.map((m) => {
      const bump = (seed + m.subject.length) % 5;
      const exam = clamp(m.exam + bump - 2, 35, 80);
      const internal = clamp(m.internal + (seed % 3) - 1, 10, 20);
      const total = internal + exam;
      const grade =
        total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : "C";
      return { ...m, internal, exam, total, grade };
    });

  return baseReportCards.map((rc, idx) => {
    const marks = adjustMarks(rc.marks);
    const pct = Math.round(marks.reduce((s, m) => s + m.total, 0) / marks.length);
    const blended = Math.round((pct + avgHint) / 2 + (seed % 3) - 1);
    const percentage = clamp(blended, 55, 97);
    const rank = clamp(12 - (seed % 8) + idx, 1, 18);
    return {
      ...rc,
      marks,
      percentage,
      grade: percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : "B",
      rank,
    };
  });
}

function buildAttendanceDays(seed: number) {
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const absent = (day + seed) % 13 === 0;
    const leave = !absent && (day + seed * 2) % 19 === 0;
    const status = absent ? "absent" : leave ? "leave" : "present";
    return { day, status: status as "present" | "absent" | "leave" };
  });
}

function assignmentsForClass(classTag: string, childId: string) {
  const matched = allAssignments.filter((a) => a.class === classTag);
  if (matched.length > 0) return matched;
  return [
    {
      id: `A-X-${childId}-1`,
      title: "Weekly reading log",
      subject: "English",
      due: "Friday",
      dueDate: "2026-06-06",
      status: "pending" as const,
      class: classTag,
      type: "homework" as const,
    },
    {
      id: `A-X-${childId}-2`,
      title: "Number skills worksheet",
      subject: "Mathematics",
      due: "Next week",
      dueDate: "2026-06-08",
      status: "pending" as const,
      class: classTag,
      type: "assignment" as const,
    },
    {
      id: `A-X-${childId}-3`,
      title: "Science observation journal",
      subject: "Physics",
      due: "Submitted",
      dueDate: "2026-05-29",
      status: "submitted" as const,
      class: classTag,
      type: "homework" as const,
    },
    {
      id: `A-X-${childId}-4`,
      title: "Lab report draft",
      subject: "Chemistry",
      due: "May 27",
      dueDate: "2026-05-27",
      status: "pending" as const,
      class: classTag,
      type: "assignment" as const,
    },
  ].map((a, i) => ({
    ...a,
    status: i === 2 ? ("submitted" as const) : ("pending" as const),
    due: i === 2 ? "Submitted" : a.due,
  }));
}

function buildNotifications(child: Child): AppNotification[] {
  const first = child.name.split(" ")[0] ?? child.name;
  const tag = childClassTag(child);
  return [
    {
      id: `pn-${child.id}-a`,
      title: `${first} was marked present`,
      desc: `Mathematics • ${tag}`,
      time: "9:12 AM",
      type: "info" as const,
      category: "attendance" as const,
      unread: true,
      priority: "normal" as const,
    },
    {
      id: `pn-${child.id}-b`,
      title: `Update for ${first}`,
      desc: `Class teacher note · ${tag}`,
      time: "Today",
      type: "positive" as const,
      category: "academic" as const,
      unread: true,
      priority: "high" as const,
    },
    {
      id: `pn-${child.id}-c`,
      title: "Fee reminder",
      desc: `Outstanding items for your linked account (${first})`,
      time: "Yesterday",
      type: "warning" as const,
      category: "fees" as const,
      unread: false,
      priority: "normal" as const,
    },
    {
      id: `pn-${child.id}-hw`,
      title: `${first} has pending homework`,
      desc: "Grammar exercises due tonight · check Assignments",
      time: "Today",
      type: "warning" as const,
      category: "assignments" as const,
      unread: true,
      priority: "high" as const,
    },
    {
      id: `pn-${child.id}-d`,
      title: "Sports practice",
      desc: `${first}'s squad · check timings`,
      time: "2 days ago",
      type: "info" as const,
      category: "sports" as const,
      unread: false,
      priority: "low" as const,
    },
    {
      id: `pn-${child.id}-e`,
      title: "PTM scheduled",
      desc: "Parent-Teacher Meet · confirm slot in office",
      time: "3 days ago",
      type: "info" as const,
      category: "events" as const,
      unread: false,
      priority: "normal" as const,
    },
  ];
}

function goalsForChild(child: Child, seed: number): Goal[] {
  return baseGoals.map((g, i) => {
    if (g.metric === "attendance") {
      return { ...g, current: child.attendance, target: Math.max(child.attendance, 95) };
    }
    if (g.metric === "marks") {
      return { ...g, current: child.avgScore, target: Math.max(child.avgScore + 2, 88) };
    }
    return {
      ...g,
      current: clamp(g.current + (seed % 3) + i - 1, 0, g.target),
    };
  });
}

export interface ParentPortalSnapshot {
  instituteId: string | null;
  child: Child;
  classTag: string;
  performance: { subject: string; score: number; prev: number }[];
  trend: { term: string; score: number }[];
  remarks: typeof baseRemarks;
  achievements: typeof baseAchievements;
  streaks: typeof baseStreaks;
  goals: Goal[];
  instituteGoals: typeof instituteAssignedGoals;
  reportCards: ReportCard[];
  attendanceDays: { day: number; status: "present" | "absent" | "leave" }[];
  assignments: ReturnType<typeof assignmentsForClass>;
  notifications: AppNotification[];
  /** Timetable rows mirror student layout; keyed per day. */
  timetable: typeof studentTimetable;
  shortName: string;
}

export function buildParentPortalSnapshot(
  instituteId: string | null,
  childId: string,
): ParentPortalSnapshot {
  const child = assertLinkedChildId(resolveLinkedChildId(childId));
  const seed = seedFromId(child.id);
  const classTag = childClassTag(child);
  const idx = children.findIndex((c) => c.id === child.id);

  const remarks = [
    ...baseRemarks.slice(idx % 2),
    ...baseRemarks.slice(0, Math.max(1, 3 - (idx % 2))),
  ].slice(0, 3);

  const streaks = baseStreaks.map((s, i) => ({
    ...s,
    current: clamp(s.current + (seed % 4) - 2 + i, 0, s.best + 6),
  }));

  return {
    instituteId,
    child,
    classTag,
    performance: jitterPerformance(basePerformance, seed),
    trend: jitterTrend(baseTrend, child.avgScore, seed),
    remarks,
    achievements: baseAchievements,
    streaks,
    goals: goalsForChild(child, seed),
    instituteGoals: instituteAssignedGoals,
    reportCards: cloneReportCards(seed, child.avgScore),
    attendanceDays: buildAttendanceDays(seed),
    assignments: assignmentsForClass(classTag, child.id),
    notifications: buildNotifications(child),
    timetable: studentTimetable,
    shortName: child.name.split(" ")[0] ?? child.name,
  };
}
