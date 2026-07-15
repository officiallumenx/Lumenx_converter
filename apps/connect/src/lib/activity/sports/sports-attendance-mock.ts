import type { ParticipantStudentOption } from "@/activity-workspace/shared/lib/participant-mock-data";
import { PARTICIPANT_STUDENT_OPTIONS } from "@/activity-workspace/shared/lib/participant-mock-data";
import type { SportsAttendanceRecord, SportsAttendanceInput } from "./sports-attendance-types";
import { isoDate } from "@/activity-workspace/hub/calendar";

export function cloneAttendanceRecord(r: SportsAttendanceRecord): SportsAttendanceRecord {
  return { ...r };
}

export function studentClassLabel(student: ParticipantStudentOption): string {
  return `${student.className}-${student.section}`;
}

export function createAttendanceFromInput(
  input: SportsAttendanceInput,
  meta: {
    practiceSessionTitle: string;
    teamId: string;
    teamName: string;
    sessionDate: string;
    studentName: string;
    studentClassLabel: string;
  },
  id?: string,
): SportsAttendanceRecord {
  const now = isoDate(new Date());
  return {
    id: id ?? `satt-${Date.now()}`,
    practiceSessionId: input.practiceSessionId,
    practiceSessionTitle: meta.practiceSessionTitle,
    teamId: meta.teamId,
    teamName: meta.teamName,
    sessionDate: meta.sessionDate,
    studentId: input.studentId,
    studentName: meta.studentName,
    studentClassLabel: meta.studentClassLabel,
    status: input.status,
    checkInTime: input.checkInTime?.trim() || undefined,
    remarks: input.remarks.trim(),
    performanceRating: input.performanceRating,
    coachNotes: input.coachNotes.trim(),
    improvementAreas: input.improvementAreas.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export const sportsAttendanceSeed: SportsAttendanceRecord[] = [
  {
    id: "satt-1",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    studentClassLabel: "9-A",
    status: "present",
    checkInTime: "06:55",
    remarks: "",
    performanceRating: "excellent",
    coachNotes: "Strong leadership in drills.",
    improvementAreas: "Weak-foot passing",
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "satt-2",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-2",
    studentName: "Priya Nair",
    studentClassLabel: "9-A",
    status: "present",
    checkInTime: "07:02",
    remarks: "",
    performanceRating: "good",
    coachNotes: "Consistent effort throughout.",
    improvementAreas: "Defensive positioning",
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "satt-3",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-3",
    studentName: "Rohan Das",
    studentClassLabel: "9-B",
    status: "late",
    checkInTime: "07:18",
    remarks: "Arrived after warm-up",
    performanceRating: "average",
    coachNotes: "Caught up quickly once on pitch.",
    improvementAreas: "Punctuality",
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "satt-4",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-14",
    studentName: "Isha Kulkarni",
    studentClassLabel: "9-A",
    status: "absent",
    remarks: "Medical leave",
    performanceRating: "average",
    coachNotes: "",
    improvementAreas: "",
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "satt-5",
    practiceSessionId: "psess-3",
    practiceSessionTitle: "Batting Nets — Top Order",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-4",
    studentName: "Sneha Patel",
    studentClassLabel: "10-A",
    status: "present",
    checkInTime: "13:58",
    remarks: "",
    performanceRating: "excellent",
    coachNotes: "Solid front-foot technique.",
    improvementAreas: "Running between wickets",
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
  {
    id: "satt-6",
    practiceSessionId: "psess-3",
    practiceSessionTitle: "Batting Nets — Top Order",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-5",
    studentName: "Kiran Joshi",
    studentClassLabel: "10-B",
    status: "excused",
    remarks: "School council duty",
    performanceRating: "good",
    coachNotes: "Will make up nets on Thursday.",
    improvementAreas: "",
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
  {
    id: "satt-7",
    practiceSessionId: "psess-3",
    practiceSessionTitle: "Batting Nets — Top Order",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-11",
    studentName: "Harish Varma",
    studentClassLabel: "10-C",
    status: "present",
    checkInTime: "14:00",
    remarks: "",
    performanceRating: "good",
    coachNotes: "Improved leave judgment.",
    improvementAreas: "Back-foot play",
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
];

export { PARTICIPANT_STUDENT_OPTIONS };
