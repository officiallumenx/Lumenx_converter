/**
 * Teacher home dashboard — composed from existing teacher portal APIs.
 */
import { ApiClientError } from "@/lib/api";
import type { DashboardSnapshot, TeacherClass } from "@/lib/teacher/types";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { loadConnectEvents, pickUpcomingEvents } from "@/lib/events";
import { loadTeacherExamPapers, pickUpcomingExamPapers } from "@/lib/exams";
import { loadTeacherHomeworkList } from "@/lib/homework";
import { listMarkEntries } from "@/lib/marks/api";
import { listAttendanceRegisters } from "@/lib/attendance/api";
import {
  connectEventToTeacherEvent,
  localYmd,
  notificationsToTeacherFeed,
  teacherExamPaperToTeacherExam,
} from "./map";

async function optionalList<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (err) {
    if (
      err instanceof ApiClientError &&
      (err.status === 401 || err.status === 403 || err.code === "UNAUTHENTICATED")
    ) {
      throw err;
    }
    return [];
  }
}

export async function enrichTeacherDashboardSnapshot(input: {
  instituteId: string;
  teacherId: string;
  classes: TeacherClass[];
  base: DashboardSnapshot;
}): Promise<DashboardSnapshot> {
  const { instituteId, teacherId, classes, base } = input;
  const today = localYmd();
  const sectionIds = new Set(classes.map((c) => c.id));

  const classLabels = new Map(
    classes.map((c) => [c.id, `${c.className}-${c.section}`] as const),
  );

  const [
    homeworkResult,
    examsResult,
    eventsResult,
    inbox,
    markEntries,
    attendanceRegisters,
  ] = await Promise.all([
    loadTeacherHomeworkList({ instituteId, teacherId }),
    loadTeacherExamPapers({
      instituteId,
      defaultClassId: classes[0]?.id,
      teacherId,
      classLabels,
    }),
    loadConnectEvents({ instituteId }),
    loadConnectPortalInbox(instituteId),
    optionalList(listMarkEntries({ instituteId, teacherId, status: "submitted" })),
    optionalList(listAttendanceRegisters({ instituteId, attendanceDate: today })),
  ]);

  const homeworkItems =
    homeworkResult.status === "ready" || homeworkResult.status === "empty"
      ? homeworkResult.items
      : [];

  // Avoid N+1 sheet fetches on Home — list payload + roster class rates are enough
  // for dashboard widgets. Detailed sheet counts load on the Homework module.
  const dueSoon = homeworkItems
    .filter((item) => item.status === "published" && item.dueDate >= today)
    .slice(0, 8);
  const pendingHomework = dueSoon.map((item) => ({
    assignmentId: item.id,
    label: item.title,
    pendingCount: 1,
  }));

  const homeworkOverview = classes.map((teacherClass) => ({
    classId: teacherClass.id,
    label: `${teacherClass.className}-${teacherClass.section}`,
    submissionPct: teacherClass.homeworkSubmissionRate,
  }));

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
