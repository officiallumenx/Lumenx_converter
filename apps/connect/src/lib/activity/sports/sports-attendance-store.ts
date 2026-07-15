import { getPracticeSessionByIdFromStore, listPracticeSessionsFromStore } from "./practice-sessions-store";
import {
  cloneAttendanceRecord,
  createAttendanceFromInput,
  sportsAttendanceSeed,
  studentClassLabel,
} from "./sports-attendance-mock";
import { PARTICIPANT_STUDENT_OPTIONS } from "@/activity-workspace/shared/lib/participant-mock-data";
import type {
  SportsAttendanceRecord,
  SportsAttendanceInput,
  SportsAttendanceListFilters,
} from "./sports-attendance-types";

let attendanceStore: SportsAttendanceRecord[] = sportsAttendanceSeed.map(cloneAttendanceRecord);
/** Sessions where attendance has been finalized and notifications sent (mock). */
let completedSessionIds = new Set<string>(["psess-1"]);

function resolvePracticeSession(sessionId: string) {
  const session = getPracticeSessionByIdFromStore(sessionId);
  if (!session) {
    throw new Error(
      "Parent practice session not found — attendance requires an existing practice session.",
    );
  }
  return session;
}

function resolveStudent(studentId: string) {
  const student = PARTICIPANT_STUDENT_OPTIONS.find((s) => s.id === studentId);
  if (!student) throw new Error("Student not found");
  return student;
}

function assertUniqueStudentSession(sessionId: string, studentId: string, excludeId?: string) {
  const clash = attendanceStore.find(
    (r) =>
      r.practiceSessionId === sessionId &&
      r.studentId === studentId &&
      r.id !== excludeId,
  );
  if (clash) {
    throw new Error("Attendance already recorded for this student in this practice session.");
  }
}

function applyAttendanceFilters(
  items: SportsAttendanceRecord[],
  filters?: SportsAttendanceListFilters,
): SportsAttendanceRecord[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.practiceSessionId && f.practiceSessionId !== "all") {
    result = result.filter((r) => r.practiceSessionId === f.practiceSessionId);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((r) => r.teamId === f.teamId);
  }
  if (f.studentId && f.studentId !== "all") {
    result = result.filter((r) => r.studentId === f.studentId);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((r) => r.status === f.status);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((r) => r.sessionDate === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.practiceSessionTitle.toLowerCase().includes(q) ||
        r.teamName.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q) ||
        r.coachNotes.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "student") {
      return dir * a.studentName.localeCompare(b.studentName);
    }
    return (
      dir *
      `${a.sessionDate}${a.checkInTime ?? ""}${a.studentName}`.localeCompare(
        `${b.sessionDate}${b.checkInTime ?? ""}${b.studentName}`,
      )
    );
  });

  return result;
}

export function resetSportsAttendanceStore() {
  attendanceStore = sportsAttendanceSeed.map(cloneAttendanceRecord);
  completedSessionIds = new Set(["psess-1"]);
}

export function listAttendanceFromStore(
  filters?: SportsAttendanceListFilters,
): SportsAttendanceRecord[] {
  return applyAttendanceFilters(attendanceStore, filters);
}

export function getAttendanceByIdFromStore(id: string): SportsAttendanceRecord | null {
  const found = attendanceStore.find((r) => r.id === id);
  return found ? cloneAttendanceRecord(found) : null;
}

export function isSessionAttendanceCompleted(sessionId: string): boolean {
  return completedSessionIds.has(sessionId);
}

export function createAttendanceInStore(input: SportsAttendanceInput): SportsAttendanceRecord {
  const session = resolvePracticeSession(input.practiceSessionId);
  assertUniqueStudentSession(input.practiceSessionId, input.studentId);
  const student = resolveStudent(input.studentId);
  const record = createAttendanceFromInput(input, {
    practiceSessionTitle: session.title,
    teamId: session.teamId,
    teamName: session.teamName,
    sessionDate: session.date,
    studentName: student.name,
    studentClassLabel: studentClassLabel(student),
  });
  attendanceStore = [record, ...attendanceStore];
  return cloneAttendanceRecord(record);
}

export function updateAttendanceInStore(
  id: string,
  patch: Partial<SportsAttendanceInput>,
): SportsAttendanceRecord {
  const idx = attendanceStore.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Attendance record not found");

  const prev = attendanceStore[idx];
  const sessionId = patch.practiceSessionId ?? prev.practiceSessionId;
  const studentId = patch.studentId ?? prev.studentId;
  assertUniqueStudentSession(sessionId, studentId, id);

  const session = resolvePracticeSession(sessionId);
  const student = resolveStudent(studentId);

  const updated = cloneAttendanceRecord({
    ...prev,
    ...patch,
    practiceSessionId: sessionId,
    practiceSessionTitle: session.title,
    teamId: session.teamId,
    teamName: session.teamName,
    sessionDate: session.date,
    studentId,
    studentName: student.name,
    studentClassLabel: studentClassLabel(student),
    checkInTime: patch.checkInTime?.trim() || prev.checkInTime,
    remarks: patch.remarks?.trim() ?? prev.remarks,
    coachNotes: patch.coachNotes?.trim() ?? prev.coachNotes,
    improvementAreas: patch.improvementAreas?.trim() ?? prev.improvementAreas,
    performanceRating: patch.performanceRating ?? prev.performanceRating,
    status: patch.status ?? prev.status,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  attendanceStore = attendanceStore.map((r) => (r.id === id ? updated : r));
  return cloneAttendanceRecord(updated);
}

export function completeSessionAttendanceInStore(
  sessionId: string,
): { sessionId: string; recordCount: number } {
  resolvePracticeSession(sessionId);
  const records = attendanceStore.filter((r) => r.practiceSessionId === sessionId);
  if (records.length === 0) {
    throw new Error("No attendance records for this practice session.");
  }
  completedSessionIds.add(sessionId);
  return { sessionId, recordCount: records.length };
}

export function listAttendanceSessionOptions(): {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  date: string;
}[] {
  const seen = new Map<string, ReturnType<typeof listAttendanceSessionOptions>[number]>();
  for (const r of attendanceStore) {
    if (!seen.has(r.practiceSessionId)) {
      seen.set(r.practiceSessionId, {
        id: r.practiceSessionId,
        title: r.practiceSessionTitle,
        teamId: r.teamId,
        teamName: r.teamName,
        date: r.sessionDate,
      });
    }
  }
  return [...seen.values()];
}

export function listEligiblePracticeSessionOptions(): {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  date: string;
}[] {
  return listPracticeSessionsFromStore()
    .filter((s) => s.status !== "archived" && s.status !== "cancelled")
    .map((s) => ({
      id: s.id,
      title: s.title,
      teamId: s.teamId,
      teamName: s.teamName,
      date: s.date,
    }));
}
