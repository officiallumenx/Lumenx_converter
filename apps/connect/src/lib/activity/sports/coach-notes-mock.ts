import type { CoachNoteRecord, CoachNoteInput, CoachPerformanceMetrics } from "./coach-notes-types";
import { defaultCoachMetrics } from "./coach-notes-types";
import { isoDate } from "@/activity-workspace/hub/calendar";

export function cloneCoachNote(r: CoachNoteRecord): CoachNoteRecord {
  return { ...r, metrics: { ...r.metrics } };
}

export function createCoachNoteFromInput(
  input: CoachNoteInput,
  meta: {
    practiceSessionId: string;
    practiceSessionTitle: string;
    teamId: string;
    teamName: string;
    sessionDate: string;
    studentId: string;
    studentName: string;
    studentClassLabel: string;
  },
  id?: string,
): CoachNoteRecord {
  const now = isoDate(new Date());
  return {
    id: id ?? `cnote-${Date.now()}`,
    attendanceRecordId: input.attendanceRecordId,
    practiceSessionId: meta.practiceSessionId,
    practiceSessionTitle: meta.practiceSessionTitle,
    teamId: meta.teamId,
    teamName: meta.teamName,
    sessionDate: meta.sessionDate,
    studentId: meta.studentId,
    studentName: meta.studentName,
    studentClassLabel: meta.studentClassLabel,
    coach: input.coach.trim(),
    performanceRating: input.performanceRating,
    skillsObserved: input.skillsObserved.trim(),
    strengths: input.strengths.trim(),
    improvementAreas: input.improvementAreas.trim(),
    coachNotes: input.coachNotes.trim(),
    nextPracticeGoals: input.nextPracticeGoals.trim(),
    followUpRequired: input.followUpRequired,
    metrics: { ...input.metrics },
    createdAt: now,
    updatedAt: now,
  };
}

const defaultMetrics = (): CoachPerformanceMetrics => defaultCoachMetrics();

export const coachNotesSeed: CoachNoteRecord[] = [
  {
    id: "cnote-1",
    attendanceRecordId: "satt-1",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    studentClassLabel: "9-A",
    coach: "Rahul Menon",
    performanceRating: "excellent",
    skillsObserved: "First touch, short passing, off-the-ball runs",
    strengths: "Leadership in drills, vocal communication",
    improvementAreas: "Weak-foot passing under pressure",
    coachNotes: "Standout session — candidate for vice-captain role in friendlies.",
    nextPracticeGoals: "10 weak-foot passes in small-sided game",
    followUpRequired: false,
    metrics: { fitness: 4, discipline: 5, teamwork: 5, technique: 4, speed: 4, stamina: 4, leadership: 5 },
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "cnote-2",
    attendanceRecordId: "satt-2",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-2",
    studentName: "Priya Nair",
    studentClassLabel: "9-A",
    coach: "Rahul Menon",
    performanceRating: "good",
    skillsObserved: "Passing accuracy, defensive awareness",
    strengths: "Consistent effort, good positioning",
    improvementAreas: "Aggression in 50-50 challenges",
    coachNotes: "Reliable squad player — push for starting XI in league match.",
    nextPracticeGoals: "Win 3 defensive duels in scrimmage",
    followUpRequired: false,
    metrics: { fitness: 4, discipline: 4, teamwork: 4, technique: 4, speed: 3, stamina: 4, leadership: 3 },
    createdAt: "2026-03-08",
    updatedAt: "2026-03-08",
  },
  {
    id: "cnote-3",
    attendanceRecordId: "satt-3",
    practiceSessionId: "psess-1",
    practiceSessionTitle: "Passing & Movement Drills",
    teamId: "team-football",
    teamName: "Senior Football Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-3",
    studentName: "Rohan Das",
    studentClassLabel: "9-B",
    coach: "Rahul Menon",
    performanceRating: "average",
    skillsObserved: "Basic passing, late arrival impact",
    strengths: "Recovered well after warm-up",
    improvementAreas: "Punctuality, first 15 minutes intensity",
    coachNotes: "Late arrival affected warm-up — monitor punctuality.",
    nextPracticeGoals: "Arrive 10 min early, complete full warm-up",
    followUpRequired: true,
    metrics: { fitness: 3, discipline: 2, teamwork: 3, technique: 3, speed: 3, stamina: 3, leadership: 2 },
    createdAt: "2026-03-08",
    updatedAt: "2026-03-09",
  },
  {
    id: "cnote-4",
    attendanceRecordId: "satt-5",
    practiceSessionId: "psess-3",
    practiceSessionTitle: "Batting Nets — Top Order",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-4",
    studentName: "Sneha Patel",
    studentClassLabel: "10-A",
    coach: "Suresh Kumar",
    performanceRating: "excellent",
    skillsObserved: "Drive, footwork, leave judgment",
    strengths: "Calm temperament, solid technique",
    improvementAreas: "Running between wickets",
    coachNotes: "Top-order prospect for district squad.",
    nextPracticeGoals: "Quick singles drill — 20 runs in 10 balls",
    followUpRequired: false,
    metrics: { fitness: 4, discipline: 5, teamwork: 4, technique: 5, speed: 3, stamina: 4, leadership: 4 },
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
  {
    id: "cnote-5",
    attendanceRecordId: "satt-7",
    practiceSessionId: "psess-3",
    practiceSessionTitle: "Batting Nets — Top Order",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    sessionDate: isoDate(new Date()),
    studentId: "stu-11",
    studentName: "Harish Varma",
    studentClassLabel: "10-C",
    coach: "Suresh Kumar",
    performanceRating: "good",
    skillsObserved: "Back-foot play, leave outside off",
    strengths: "Improved patience at crease",
    improvementAreas: "Front-foot drives to full balls",
    coachNotes: "Progressing well — schedule extra nets if available.",
    nextPracticeGoals: "10 front-foot drives off throwdowns",
    followUpRequired: true,
    followUpNotifiedAt: "2026-03-10",
    metrics: { fitness: 3, discipline: 4, teamwork: 3, technique: 4, speed: 3, stamina: 3, leadership: 3 },
    createdAt: "2026-03-09",
    updatedAt: "2026-03-10",
  },
];

export { defaultMetrics };
