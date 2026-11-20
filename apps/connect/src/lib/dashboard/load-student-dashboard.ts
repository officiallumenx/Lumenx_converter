/**
 * Student home dashboard — composed from existing learner portal APIs.
 */
import type { StudentSnapshot } from "@/lib/student/types";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { loadConnectEvents, pickUpcomingEvents } from "@/lib/events";
import { loadLearnerExamSchedules } from "@/lib/exams";
import { loadStudentReportCards } from "@/lib/marks";
import { loadLearnerAttendancePortal } from "@/lib/attendance/load";
import { loadLearnerTimetable } from "@/lib/timetable";
import type { AppNotification } from "@lumenx/types";
import {
  connectEventsToSchoolEvents,
  learnerSchedulesToStudentExams,
  portalAttendanceToStudentSummary,
  reportCardsToAcademicTerms,
  reportCardsToExamHistory,
  reportCardsToPerformance,
  reportCardsToTrend,
  upcomingExamsToHistory,
  weeklyTimetableToStudentRecord,
} from "./map";

export async function enrichStudentDashboardSnapshot(input: {
  instituteId: string;
  snapshot: StudentSnapshot;
  /** Shared inbox (value or in-flight Promise) — avoids a second `/notifications` GET. */
  inbox?: AppNotification[] | Promise<AppNotification[]>;
}): Promise<StudentSnapshot> {
  const { instituteId, snapshot } = input;
  const studentId = snapshot.profile.id;
  const rawClass = snapshot.profile.class?.trim() ?? "";
  // Placeholder "—" from missing labels must not be sent as a class filter.
  const classGrade =
    rawClass && rawClass !== "—" ? rawClass : undefined;

  const inboxPromise =
    input.inbox != null
      ? Promise.resolve(input.inbox)
      : loadConnectPortalInbox(instituteId);

  const [
    reportCardsResult,
    examsResult,
    eventsResult,
    timetableResult,
    inbox,
    attendanceResult,
  ] = await Promise.all([
    loadStudentReportCards({ instituteId, studentId }),
    loadLearnerExamSchedules({ instituteId, classGrade }),
    loadConnectEvents({ instituteId }),
    loadLearnerTimetable({ instituteId, studentId }),
    inboxPromise,
    loadLearnerAttendancePortal({ instituteId, studentId }),
  ]);

  const reportCards =
    reportCardsResult.status === "ready" || reportCardsResult.status === "empty"
      ? reportCardsResult.reportCards
      : [];
  const exams =
    examsResult.status === "ready" || examsResult.status === "empty"
      ? learnerSchedulesToStudentExams(examsResult.schedules)
      : [];
  const schoolEvents =
    eventsResult.status === "ready" || eventsResult.status === "empty"
      ? connectEventsToSchoolEvents(pickUpcomingEvents(eventsResult.items, 8))
      : [];
  const timetable =
    timetableResult.status === "ready" || timetableResult.status === "empty"
      ? weeklyTimetableToStudentRecord(timetableResult.schedule)
      : snapshot.timetable;

  let next = {
    ...snapshot,
    reportCards,
    performance: reportCardsToPerformance(reportCards),
    trend: reportCardsToTrend(reportCards),
    exams,
    schoolEvents,
    timetable,
    notifications: inbox,
  };

  if (attendanceResult.portal) {
    const attendancePatch = portalAttendanceToStudentSummary({
      portal: attendanceResult.portal,
      profile: next.profile,
    });
    next = { ...next, ...attendancePatch };
  }

  const attendancePct = next.attendanceSummary?.attendancePct ?? 0;
  next = {
    ...next,
    academicTerms: reportCardsToAcademicTerms(reportCards, attendancePct),
    examHistory: [
      ...reportCardsToExamHistory(reportCards),
      ...upcomingExamsToHistory(exams),
    ],
  };

  return next;
}
