/**
 * Parent home dashboard — scoped snapshot for one linked learner.
 */
import { ApiClientError } from "@/lib/api";
import type { ParentPortalSnapshot } from "@/lib/parent-portal-data";
import { childClassTag } from "@/lib/parent-portal-data";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { loadLearnerAttendancePortal } from "@/lib/attendance/load";
import type { AttendanceDay } from "@/lib/attendance/types";
import { loadStudentHomeworkItems } from "@/lib/homework";
import { loadStudentReportCards } from "@/lib/marks";
import { getStudent } from "@/lib/students/api";
import { loadLearnerTimetable } from "@/lib/timetable";
import { reportCardsToChildMetrics, studentDtoToChild } from "@/lib/parents/map";
import { listStudentRemarks, mapRemarkDtoToParentCard } from "@/lib/remarks";
import {
  reportCardsToPerformance,
  reportCardsToTrend,
  weeklyTimetableToStudentRecord,
} from "./map";

/** Secondary enrichment may soft-empty; auth/forbidden must surface. */
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

function portalDaysToAttendanceDays(
  days: Array<{ date: string; status: string }>,
  year: number,
  month: number,
): AttendanceDay[] {
  return days
    .filter((day) => {
      const d = new Date(`${day.date}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .map((day) => ({
      day: Number(day.date.slice(8, 10)),
      status:
        day.status === "unknown"
          ? "future"
          : (day.status as AttendanceDay["status"]),
    }));
}

export async function loadParentPortalSnapshotFromApi(input: {
  instituteId: string;
  studentId: string;
}): Promise<ParentPortalSnapshot> {
  const { instituteId, studentId } = input;
  const now = new Date();

  // Start student + independent module loads together; homework waits only on student.
  const studentPromise = getStudent(studentId);
  const [dto, cardsResult, homeworkResult, attendanceResult, inbox, timetableResult, remarkDtos] =
    await Promise.all([
      studentPromise,
      loadStudentReportCards({ instituteId, studentId }),
      studentPromise.then((student) =>
        loadStudentHomeworkItems({
          instituteId,
          studentId,
          classLabel: student.classLabel?.trim() || "Class",
        }),
      ),
      loadLearnerAttendancePortal({ instituteId, studentId }),
      loadConnectPortalInbox(instituteId),
      loadLearnerTimetable({ instituteId, studentId }),
      optionalList(listStudentRemarks({ instituteId, studentId })),
    ]);

  const reportCards =
    cardsResult.status === "ready" || cardsResult.status === "empty"
      ? cardsResult.reportCards
      : [];
  const cardMetrics = reportCardsToChildMetrics(reportCards);
  const attendancePct = attendanceResult.portal?.summary.attendancePct ?? 0;
  const child = studentDtoToChild(dto, 0, {
    attendancePct,
    avgScore: cardMetrics.avgScore,
    trend: cardMetrics.trend,
  });
  const classTag = childClassTag(child);

  const assignments =
    homeworkResult.status === "ready" || homeworkResult.status === "empty"
      ? homeworkResult.assignments
      : [];
  const timetable =
    timetableResult.status === "ready" || timetableResult.status === "empty"
      ? weeklyTimetableToStudentRecord(timetableResult.schedule)
      : {};

  return {
    instituteId,
    child,
    classTag,
    performance: reportCardsToPerformance(reportCards),
    trend: reportCardsToTrend(reportCards),
    remarks: remarkDtos.map(mapRemarkDtoToParentCard),
    achievements: [],
    streaks: [],
    goals: [],
    instituteGoals: [],
    reportCards,
    attendanceDays: attendanceResult.portal
      ? portalDaysToAttendanceDays(
          attendanceResult.portal.days,
          now.getFullYear(),
          now.getMonth(),
        )
      : [],
    assignments,
    notifications: inbox,
    timetable,
    shortName: child.name.split(" ")[0] ?? child.name,
  };
}
