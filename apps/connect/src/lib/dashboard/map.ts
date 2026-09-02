import type { ReportCard } from "@lumenx/types";
import type { LearnerExamSchedule } from "@lumenx/module-exams";
import type { ConnectEventItem } from "@/lib/events/types";
import type { AppNotification } from "@lumenx/types";
import type {
  PerformanceRow,
  StudentSnapshot,
  TimetablePeriod,
  TrendRow,
} from "@/lib/student/types";
import type {
  DashboardSnapshot,
  TeacherEvent,
  TeacherExam,
  TeacherNotification,
} from "@/lib/teacher/types";
import type { WeeklyTimetable } from "@/lib/timetable/types";
import type { PortalLearnerAttendanceDto } from "@/lib/attendance/types";
import type { TeacherExamPaperItem } from "@/lib/exams/map";
import { appNotificationToTeacherNotification } from "@/lib/connect-inbox/map-teacher";
import {
  buildLearnerMonthAttendanceSummary,
  isoFromParts,
  monthLabel,
} from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import type { AttendanceDayStatus } from "@/lib/student/mock-data";

export function reportCardsToPerformance(reportCards: ReportCard[]): PerformanceRow[] {
  const latest = reportCards.filter((c) => c.status === "published").at(-1);
  if (!latest) return [];
  return latest.marks.map((mark, index) => {
    const prevMark = latest.marks[index];
    return {
      subject: mark.subject,
      score: mark.total,
      prev: prevMark?.total ?? mark.total,
    };
  });
}

export function reportCardsToTrend(reportCards: ReportCard[]): TrendRow[] {
  return reportCards
    .filter((c) => c.status === "published")
    .map((c) => ({ term: c.term, score: c.percentage }));
}

export function weeklyTimetableToStudentRecord(
  schedule: WeeklyTimetable,
): Record<string, TimetablePeriod[]> {
  const record: Record<string, TimetablePeriod[]> = {};
  for (const [day, periods] of Object.entries(schedule)) {
    record[day] = periods.map((p) => ({
      time: p.time,
      subject: p.subject,
      teacher: p.teacher ?? "—",
    }));
  }
  return record;
}

export function learnerSchedulesToStudentExams(
  schedules: LearnerExamSchedule[],
): StudentSnapshot["exams"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows: StudentSnapshot["exams"] = [];
  for (const schedule of schedules) {
    if (new Date(schedule.endDate) < today) continue;
    for (const [index, slot] of schedule.slots.entries()) {
      rows.push({
        id: `${schedule.examId}:${index}`,
        title: schedule.examName,
        subject: slot.subject,
        date: slot.date,
        duration: `${slot.startTime} – ${slot.endTime}`,
        room: slot.room ?? "—",
      });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function connectEventsToSchoolEvents(
  items: ConnectEventItem[],
): StudentSnapshot["schoolEvents"] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    kind: item.kind,
    date: item.date,
    venue: item.venue,
  }));
}

export function portalAttendanceToStudentSummary(input: {
  portal: PortalLearnerAttendanceDto;
  profile: StudentSnapshot["profile"];
}): Pick<
  StudentSnapshot,
  "attendanceSummary" | "attendanceDays" | "attendanceLog" | "profile"
> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const sectionKey = attendanceSectionKey(input.profile.class, input.profile.section);
  const studentId = toAttendanceStudentId({
    id: input.profile.id,
    classLabel: input.profile.class,
    section: input.profile.section,
    rollNo: input.profile.rollNo,
  });

  const monthSummary = buildLearnerMonthAttendanceSummary({
    studentId,
    sectionKey,
    year,
    month,
  });

  const attendanceDays = input.portal.days
    .filter((day) => {
      const d = new Date(`${day.date}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .map((day) => ({
      day: Number(day.date.slice(8, 10)),
      status: day.status as AttendanceDayStatus,
    }));

  const attendanceLog = input.portal.days
    .filter((day) => day.status !== "unknown")
    .slice(-14)
    .reverse()
    .map((day) => ({
      date: day.date,
      status:
        day.status === "unknown"
          ? ("present" as const)
          : (day.status as "present" | "absent" | "leave"),
      note: "",
    }));

  return {
    profile: {
      ...input.profile,
      attendance: Math.round(input.portal.summary.attendancePct),
    },
    attendanceSummary: {
      monthLabel: monthLabel(year, month),
      year,
      month,
      attendancePct: Math.round(input.portal.summary.attendancePct),
      classAvgPct: Math.round(monthSummary.attendancePct),
      present: input.portal.summary.present,
      absent: input.portal.summary.absent,
      leave: input.portal.summary.leave,
      workingDays: monthSummary.workingDays,
      monthDelta: 0,
    },
    attendanceDays,
    attendanceLog,
  };
}

export function connectEventToTeacherEvent(item: ConnectEventItem): TeacherEvent {
  const category =
    item.kind === "holiday" || item.backendKind === "holiday"
      ? ("holiday" as const)
      : item.kind === "sports"
        ? ("sports" as const)
        : item.kind === "exam-holiday"
          ? ("academic" as const)
          : ("program" as const);
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    category,
    date: item.date,
    time: item.time ?? "—",
    location: item.venue ?? "—",
    createdBy: "Institute",
  };
}

export function teacherExamPaperToTeacherExam(paper: TeacherExamPaperItem): TeacherExam {
  return {
    id: paper.id,
    name: paper.name,
    subject: paper.subject,
    classId: paper.classId,
    classLabel: paper.classLabel,
    startDate: paper.startDate,
    endDate: paper.endDate,
    date: paper.date,
    description: paper.description,
    room: paper.room,
    duration: paper.duration,
    status: paper.status,
    publishStatus: paper.publishStatus,
    marksStatus: paper.marksStatus,
  };
}

export function notificationsToTeacherFeed(notifications: AppNotification[]): {
  recentNotifications: TeacherNotification[];
  announcements: DashboardSnapshot["announcements"];
} {
  const recentNotifications = notifications
    .slice(0, 8)
    .map(appNotificationToTeacherNotification);
  const announcements = notifications
    .filter((n) => n.category === "circulars" || n.category === "announcements")
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.desc,
      date: n.time,
    }));
  return { recentNotifications, announcements };
}

export function localYmd(date: Date = new Date()): string {
  return isoFromParts(date.getFullYear(), date.getMonth(), date.getDate());
}
