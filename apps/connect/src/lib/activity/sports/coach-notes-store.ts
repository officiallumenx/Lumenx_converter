import { getPracticeSessionByIdFromStore } from "./practice-sessions-store";
import { getAttendanceByIdFromStore, listAttendanceFromStore } from "./sports-attendance-store";
import {
  cloneCoachNote,
  createCoachNoteFromInput,
  coachNotesSeed,
} from "./coach-notes-mock";
import type {
  CoachNoteRecord,
  CoachNoteInput,
  CoachNoteListFilters,
} from "./coach-notes-types";

let coachNotesStore: CoachNoteRecord[] = coachNotesSeed.map(cloneCoachNote);

function resolveAttendanceRecord(attendanceId: string) {
  const attendance = getAttendanceByIdFromStore(attendanceId);
  if (!attendance) {
    throw new Error(
      "Parent attendance record not found — coach notes require an existing attendance record.",
    );
  }
  return attendance;
}

function resolveCoachFromSession(practiceSessionId: string, fallback: string): string {
  const session = getPracticeSessionByIdFromStore(practiceSessionId);
  return session?.coach ?? fallback;
}

function assertUniqueAttendanceNote(attendanceId: string, excludeId?: string) {
  const clash = coachNotesStore.find(
    (n) => n.attendanceRecordId === attendanceId && n.id !== excludeId,
  );
  if (clash) {
    throw new Error("A coach note already exists for this attendance record.");
  }
}

const RATING_ORDER = { excellent: 0, good: 1, average: 2, needs_improvement: 3 } as const;

function applyCoachNoteFilters(
  items: CoachNoteRecord[],
  filters?: CoachNoteListFilters,
): CoachNoteRecord[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.practiceSessionId && f.practiceSessionId !== "all") {
    result = result.filter((n) => n.practiceSessionId === f.practiceSessionId);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((n) => n.teamId === f.teamId);
  }
  if (f.studentId && f.studentId !== "all") {
    result = result.filter((n) => n.studentId === f.studentId);
  }
  if (f.coach && f.coach !== "all") {
    result = result.filter((n) => n.coach === f.coach);
  }
  if (f.rating && f.rating !== "all") {
    result = result.filter((n) => n.performanceRating === f.rating);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((n) => n.sessionDate === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (n) =>
        n.studentName.toLowerCase().includes(q) ||
        n.coach.toLowerCase().includes(q) ||
        n.practiceSessionTitle.toLowerCase().includes(q) ||
        n.teamName.toLowerCase().includes(q) ||
        n.skillsObserved.toLowerCase().includes(q) ||
        n.coachNotes.toLowerCase().includes(q) ||
        n.strengths.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "updatedAt";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    switch (sortBy) {
      case "student":
        return dir * a.studentName.localeCompare(b.studentName);
      case "rating":
        return (
          dir *
          (RATING_ORDER[a.performanceRating] - RATING_ORDER[b.performanceRating])
        );
      default:
        return dir * a.updatedAt.localeCompare(b.updatedAt);
    }
  });

  return result;
}

export function resetCoachNotesStore() {
  coachNotesStore = coachNotesSeed.map(cloneCoachNote);
}

export function listCoachNotesFromStore(filters?: CoachNoteListFilters): CoachNoteRecord[] {
  return applyCoachNoteFilters(coachNotesStore, filters);
}

export function getCoachNoteByIdFromStore(id: string): CoachNoteRecord | null {
  const found = coachNotesStore.find((n) => n.id === id);
  return found ? cloneCoachNote(found) : null;
}

export function createCoachNoteInStore(input: CoachNoteInput): CoachNoteRecord {
  const attendance = resolveAttendanceRecord(input.attendanceRecordId);
  assertUniqueAttendanceNote(input.attendanceRecordId);
  const coach =
    input.coach.trim() ||
    resolveCoachFromSession(attendance.practiceSessionId, "Coach");
  const note = createCoachNoteFromInput(
    { ...input, coach },
    {
      practiceSessionId: attendance.practiceSessionId,
      practiceSessionTitle: attendance.practiceSessionTitle,
      teamId: attendance.teamId,
      teamName: attendance.teamName,
      sessionDate: attendance.sessionDate,
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      studentClassLabel: attendance.studentClassLabel,
    },
  );
  coachNotesStore = [note, ...coachNotesStore];
  return cloneCoachNote(note);
}

export function updateCoachNoteInStore(
  id: string,
  patch: Partial<CoachNoteInput>,
): CoachNoteRecord {
  const idx = coachNotesStore.findIndex((n) => n.id === id);
  if (idx < 0) throw new Error("Coach note not found");

  const prev = coachNotesStore[idx];
  const attendanceId = patch.attendanceRecordId ?? prev.attendanceRecordId;
  assertUniqueAttendanceNote(attendanceId, id);
  const attendance = resolveAttendanceRecord(attendanceId);

  const updated = cloneCoachNote({
    ...prev,
    ...patch,
    attendanceRecordId: attendanceId,
    practiceSessionId: attendance.practiceSessionId,
    practiceSessionTitle: attendance.practiceSessionTitle,
    teamId: attendance.teamId,
    teamName: attendance.teamName,
    sessionDate: attendance.sessionDate,
    studentId: attendance.studentId,
    studentName: attendance.studentName,
    studentClassLabel: attendance.studentClassLabel,
    coach: patch.coach?.trim() ?? prev.coach,
    skillsObserved: patch.skillsObserved?.trim() ?? prev.skillsObserved,
    strengths: patch.strengths?.trim() ?? prev.strengths,
    improvementAreas: patch.improvementAreas?.trim() ?? prev.improvementAreas,
    coachNotes: patch.coachNotes?.trim() ?? prev.coachNotes,
    nextPracticeGoals: patch.nextPracticeGoals?.trim() ?? prev.nextPracticeGoals,
    performanceRating: patch.performanceRating ?? prev.performanceRating,
    followUpRequired: patch.followUpRequired ?? prev.followUpRequired,
    metrics: patch.metrics ? { ...patch.metrics } : prev.metrics,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  coachNotesStore = coachNotesStore.map((n) => (n.id === id ? updated : n));
  return cloneCoachNote(updated);
}

export function markFollowUpNotifiedInStore(id: string): CoachNoteRecord {
  const idx = coachNotesStore.findIndex((n) => n.id === id);
  if (idx < 0) throw new Error("Coach note not found");
  const updated = cloneCoachNote({
    ...coachNotesStore[idx],
    followUpNotifiedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  coachNotesStore = coachNotesStore.map((n) => (n.id === id ? updated : n));
  return cloneCoachNote(updated);
}

export function listCoachOptions(): string[] {
  const names = new Set<string>();
  coachNotesStore.forEach((n) => names.add(n.coach));
  return [...names].sort();
}

export function listEligibleAttendanceOptions(): {
  id: string;
  label: string;
  practiceSessionId: string;
  studentId: string;
  studentName: string;
  sessionDate: string;
  hasCoachNote: boolean;
}[] {
  const notedIds = new Set(coachNotesStore.map((n) => n.attendanceRecordId));
  return listAttendanceFromStore().map((a) => ({
    id: a.id,
    label: `${a.studentName} — ${a.practiceSessionTitle} (${a.sessionDate})`,
    practiceSessionId: a.practiceSessionId,
    studentId: a.studentId,
    studentName: a.studentName,
    sessionDate: a.sessionDate,
    hasCoachNote: notedIds.has(a.id),
  }));
}
