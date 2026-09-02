/**
 * Teacher home dashboard — composed from existing teacher portal APIs.
 */
import type { DashboardSnapshot, TeacherClass } from "@/lib/teacher/types";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { loadConnectEvents, pickUpcomingEvents } from "@/lib/events";
import { loadTeacherExamPapers, pickUpcomingExamPapers } from "@/lib/exams";
import { getTeacherHomeworkSheet, loadTeacherHomeworkClassOverview, loadTeacherHomeworkList } from "@/lib/homework";
import { listMarkEntries } from "@/lib/marks/api";
import { listAttendanceRegisters } from "@/lib/attendance/api";
import {
  connectEventToTeacherEvent,
  localYmd,
  notificationsToTeacherFeed,
  teacherExamPaperToTeacherExam,
} from "./map";

export async function enrichTeacherDashboardSnapshot(input: {
  instituteId: string;
  teacherId: string;
  classes: TeacherClass[];
  base: DashboardSnapshot;
}): Promise<DashboardSnapshot> {
  const { instituteId, teacherId, classes, base } = input;
  const today = localYmd();
  const sectionIds = new Set(classes.map((c) => c.id));

  const [
    homeworkResult,
    examsResult,
    eventsResult,
    inbox,
    markEntries,
    attendanceRegisters,
  ] = await Promise.all([
    loadTeacherHomeworkList({ instituteId, teacherId }),
    loadTeacherExamPapers({ instituteId, defaultClassId: classes[0]?.id }),
    loadConnectEvents({ instituteId }),
    loadConnectPortalInbox(instituteId),
    listMarkEntries({ instituteId, teacherId, status: "submitted" }).catch(() => []),
    listAttendanceRegisters({ instituteId, attendanceDate: today }).catch(() => []),
  ]);

  const homeworkItems =
    homeworkResult.status === "ready" || homeworkResult.status === "empty"
      ? homeworkResult.items
      : [];

  const dueSoon = homeworkItems
    .filter((item) => item.status === "published" && item.dueDate >= today)
    .slice(0, 8);
  const homeworkSheets = await Promise.all(
    dueSoon.map((item) =>
      getTeacherHomeworkSheet({ instituteId, homeworkId: item.id }).catch(() => null),
    ),
  );
  const pendingHomework = dueSoon
    .map((item, index) => {
      const sheet = homeworkSheets[index];
      const pendingCount = sheet
        ? Math.max(0, sheet.totalCount - sheet.submittedCount)
        : 1;
      return {
        assignmentId: item.id,
        label: item.title,
        pendingCount,
      };
    })
    .filter((row) => row.pendingCount > 0);

  const overviewResults = await Promise.all(
    classes.map((teacherClass) =>
      loadTeacherHomeworkClassOverview({
        instituteId,
        sectionId: teacherClass.id,
        kind: "homework",
        homeworkItems,
      }),
    ),
  );
  const homeworkOverview = classes.map((teacherClass, index) => {
    const overview = overviewResults[index];
    const students = overview?.students ?? [];
    const submissionPct =
      students.length === 0
        ? 0
        : Math.round(
            students.reduce((sum, row) => {
              const pct = row.total > 0 ? (row.submitted / row.total) * 100 : 0;
              return sum + pct;
            }, 0) / students.length,
          );
    return {
      classId: teacherClass.id,
      label: `${teacherClass.className}-${teacherClass.section}`,
      submissionPct,
    };
  });

  const pendingMarksByExam = new Map<string, { label: string; count: number }>();
  for (const entry of markEntries) {
    const bucket = pendingMarksByExam.get(entry.examId) ?? {
      label: `Exam ${entry.examId.slice(0, 8)}`,
      count: 0,
    };
    bucket.count += 1;
    pendingMarksByExam.set(entry.examId, bucket);
  }

  const teacherRegisters = attendanceRegisters.filter((register) =>
    sectionIds.has(register.sectionId),
  );
  const pendingSections = new Set<string>();
  const completedSections = new Set<string>();
  for (const register of teacherRegisters) {
    if (register.status === "draft") pendingSections.add(register.sectionId);
    if (register.status === "submitted") completedSections.add(register.sectionId);
  }

  const classLabelById = new Map(
    classes.map((c) => [c.id, `${c.className}-${c.section}`] as const),
  );

  const attendancePending = [...pendingSections].map((sectionId) => ({
    classId: sectionId,
    label: classLabelById.get(sectionId) ?? "Class",
    count: 1,
  }));
  const attendanceCompleted = [...completedSections]
    .filter((id) => !pendingSections.has(id))
    .map((sectionId) => ({
      classId: sectionId,
      label: classLabelById.get(sectionId) ?? "Class",
      count: 1,
    }));

  const examPapers =
    examsResult.status === "ready" || examsResult.status === "empty"
      ? pickUpcomingExamPapers(examsResult.papers, 6)
      : [];
  const upcomingEvents =
    eventsResult.status === "ready" || eventsResult.status === "empty"
      ? pickUpcomingEvents(eventsResult.items, 6).map(connectEventToTeacherEvent)
      : [];

  const feed = notificationsToTeacherFeed(inbox);

  return {
    ...base,
    attendancePending,
    attendanceCompleted,
    classesRemaining: attendancePending.length,
    pendingMarks: [...pendingMarksByExam.entries()].map(([examId, row]) => ({
      examId,
      label: row.label,
      count: row.count,
    })),
    pendingHomework,
    homeworkOverview,
    upcomingExams: examPapers.map(teacherExamPaperToTeacherExam),
    upcomingEvents,
    recentNotifications: feed.recentNotifications,
    announcements: feed.announcements,
    unreadMessages: inbox.filter((n) => n.unread).length,
    classPerformance: classes.map((teacherClass) => ({
      classId: teacherClass.id,
      label: `${teacherClass.className}-${teacherClass.section}`,
      attendance: teacherClass.attendanceRate,
      homework: teacherClass.homeworkSubmissionRate,
      avgScore: teacherClass.avgScore,
    })),
  };
}
