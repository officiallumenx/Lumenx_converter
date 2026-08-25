/**
 * Parent portal: strictly scoped mock data per linked child.
 * Replace `buildParentPortalSnapshot` with API calls when backend is ready.
 */
import type { AppNotification, Child, Goal, ReportCard, SubjectMark } from "@lumenx/types";
import { clamp } from "@lumenx/utils";
import { buildLearnerAttendanceDays, buildLearnerMonthAttendanceSummary } from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import type { AttendanceDay } from "@/lib/attendance/types";
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
import { toLocalIsoDate } from "@/lib/leave-utils";
import { gradeFor } from "@/lib/marks-utils";
import { loadStudentAssignmentOverlays } from "@/lib/assignment-details";

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

function cloneReportCards(seed: number): ReportCard[] {
  const adjustMarks = (marks: SubjectMark[]): SubjectMark[] =>
    marks.map((m) => {
      const bump = (seed + m.subject.length) % 5;
      const exam = clamp(m.exam + bump - 2, 35, 80);
      const internal = clamp(m.internal + (seed % 3) - 1, 10, 20);
      const total = internal + exam;
      return { ...m, internal, exam, total, grade: gradeFor(total) };
    });

  return baseReportCards.map((rc, idx) => {
    const marks = adjustMarks(rc.marks);
    // Aggregate = average of the subject totals actually shown, so header % and grade
    // never disagree with the marks table (shared gradeFor policy).
    const percentage = Math.round(marks.reduce((s, m) => s + m.total, 0) / marks.length);
    const rank = clamp(12 - (seed % 8) + idx, 1, 18);
    return {
      ...rc,
      marks,
      percentage,
      grade: gradeFor(percentage),
      rank,
    };
  });
}

export function assignmentsForClass(classTag: string, childId: string) {
  const overlays = loadStudentAssignmentOverlays().filter((a) => a.class === classTag);
  const matched = [
    ...overlays,
    ...allAssignments.filter((a) => a.class === classTag && !overlays.some((o) => o.id === a.id)),
  ];
  if (matched.length > 0) return matched;
  const today = toLocalIsoDate(new Date());
  const offset = (days: number) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + days);
    return toLocalIsoDate(d);
  };
  return [
    {
      id: `A-X-${childId}-today-a`,
      title: "Class worksheet",
      subject: "Mathematics",
      due: "Today",
      dueDate: today,
      status: "pending" as const,
      class: classTag,
      type: "assignment" as const,
    },
    {
      id: `A-X-${childId}-today-h`,
      title: "Daily practice",
      subject: "English",
      due: "Today",
      dueDate: today,
      status: "pending" as const,
      class: classTag,
      type: "homework" as const,
    },
    {
      id: `A-X-${childId}-1`,
      title: "Weekly reading log",
      subject: "English",
      due: "Friday",
      dueDate: offset(3),
      status: "pending" as const,
      class: classTag,
      type: "homework" as const,
    },
    {
      id: `A-X-${childId}-2`,
      title: "Number skills worksheet",
      subject: "Mathematics",
      due: "Next week",
      dueDate: offset(7),
      status: "pending" as const,
      class: classTag,
      type: "assignment" as const,
    },
    {
      id: `A-X-${childId}-3`,
      title: "Science observation journal",
      subject: "Physics",
      due: "May 29",
      dueDate: offset(-10),
      status: "pending" as const,
      class: classTag,
      type: "homework" as const,
    },
    {
      id: `A-X-${childId}-4`,
      title: "Lab report draft",
      subject: "Chemistry",
      due: "May 27",
      dueDate: offset(-14),
      status: "pending" as const,
      class: classTag,
      type: "assignment" as const,
    },
  ];
}

function buildNotifications(child: Child): AppNotification[] {
  const first = child.name.split(" ")[0] ?? child.name;
  const tag = childClassTag(child);
  return [
    // Attendance rows come from Attendance Notification Inbox (merged in /notifications).
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
    {
      id: `pn-${child.id}-f`,
      title: "Mid-Term exam schedule",
      desc: `${first}'s exam timetable published · ${tag}`,
      time: "4 days ago",
      type: "info" as const,
      category: "exams" as const,
      unread: true,
      priority: "high" as const,
    },
    {
      id: `pn-${child.id}-g`,
      title: "Diwali break announced",
      desc: "School closed 1–5 Nov",
      time: "5 days ago",
      type: "info" as const,
      category: "holidays" as const,
      unread: false,
      priority: "normal" as const,
    },
    {
      id: `pn-${child.id}-h`,
      title: "Bus route update",
      desc: "Pickup time shifted by 10 minutes on Route 4",
      time: "1 week ago",
      type: "info" as const,
      category: "circulars" as const,
      unread: false,
      priority: "low" as const,
    },
  ];
}

function goalsForChild(child: Child, seed: number): Goal[] {
  const now = new Date();
  const attendancePct = buildLearnerMonthAttendanceSummary({
    studentId: toAttendanceStudentId({
      id: child.id,
      classLabel: child.className,
      section: child.section,
      rollNo: child.rollNo,
    }),
    sectionKey: attendanceSectionKey(child.className, child.section),
    year: now.getFullYear(),
    month: now.getMonth(),
  }).attendancePct;
  return baseGoals.map((g, i) => {
    if (g.metric === "attendance") {
      return { ...g, current: attendancePct, target: Math.max(attendancePct, 95) };
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
  attendanceDays: AttendanceDay[];
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
    reportCards: cloneReportCards(seed),
    // Registers only — matches Parent Attendance Overview for this child.
    attendanceDays: (() => {
      const now = new Date();
      return buildLearnerAttendanceDays({
        year: now.getFullYear(),
        month: now.getMonth(),
        studentId: toAttendanceStudentId({
          id: child.id,
          classLabel: child.className,
          section: child.section,
          rollNo: child.rollNo,
        }),
        sectionKey: attendanceSectionKey(child.className, child.section),
      });
    })(),
    assignments: assignmentsForClass(classTag, child.id),
    notifications: buildNotifications(child),
    timetable: studentTimetable,
    shortName: child.name.split(" ")[0] ?? child.name,
  };
}
