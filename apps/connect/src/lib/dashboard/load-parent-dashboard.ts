/**
 * Parent home dashboard — scoped snapshot for one linked learner.
 */
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
import {
  reportCardsToPerformance,
  reportCardsToTrend,
  weeklyTimetableToStudentRecord,
} from "./map";

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

  const dto = await getStudent(studentId);

  const [cardsResult, homeworkResult, attendanceResult, inbox, timetableResult] =
    await Promise.all([
      loadStudentReportCards({ instituteId, studentId }),
      loadStudentHomeworkItems({
        instituteId,
        studentId,
        classLabel: dto.classLabel?.trim() || "Class",
      }),
      loadLearnerAttendancePortal({ instituteId, studentId }),
      loadConnectPortalInbox(instituteId),
      loadLearnerTimetable({ instituteId, studentId }),
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
    remarks: [],
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
