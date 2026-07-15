import type {
  CandidateEvaluation,
  CommitteeMember,
  SelectionCandidate,
  SelectionTrial,
  SelectionTrialInput,
} from "./types";

export function cloneTrial(t: SelectionTrial): SelectionTrial {
  return { ...t, committee: t.committee.map((c) => ({ ...c })) };
}

export function cloneCandidate(c: SelectionCandidate): SelectionCandidate {
  return {
    ...c,
    evaluation: c.evaluation ? { ...c.evaluation } : undefined,
  };
}

export function createTrialFromInput(input: SelectionTrialInput, id?: string): SelectionTrial {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: id ?? `trial-${Date.now()}`,
    title: input.title.trim(),
    sport: input.sport.trim(),
    teamId: input.teamId,
    teamName: input.teamName.trim(),
    trialDate: input.trialDate,
    venue: input.venue.trim(),
    maxSlots: Math.max(1, input.maxSlots),
    waitingListSlots: Math.max(0, input.waitingListSlots),
    status: "open",
    description: input.description.trim(),
    committee: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const trialsSeed: SelectionTrial[] = [
  {
    id: "sel-trial-1",
    title: "Senior Football Squad Selection 2026",
    sport: "Football",
    teamId: "team-football",
    teamName: "Senior Football Team",
    trialDate: "2026-03-18",
    venue: "Main Football Ground",
    maxSlots: 22,
    waitingListSlots: 5,
    status: "evaluating",
    description: "Open trials for Class 10–12 football squad. Fitness test and match simulation.",
    committee: [
      { id: "cm-1", name: "Coach Vikram Singh", role: "Head Coach" },
      { id: "cm-2", name: "Coach Meera Iyer", role: "Assistant Coach" },
      { id: "cm-3", name: "Dr. Rajesh Kumar", role: "Physiotherapist" },
    ],
    createdAt: "2026-02-01",
    updatedAt: "2026-03-10",
  },
  {
    id: "sel-trial-2",
    title: "Basketball Team Trials — Inter-School",
    sport: "Basketball",
    teamId: "team-basketball",
    teamName: "Basketball Team",
    trialDate: "2026-03-22",
    venue: "Basketball Court A",
    maxSlots: 12,
    waitingListSlots: 3,
    status: "open",
    description: "Trials for district inter-school basketball championship squad.",
    committee: [
      { id: "cm-4", name: "Coach Ananya Rao", role: "Head Coach" },
      { id: "cm-5", name: "Coach Vikram Singh", role: "Selection Committee" },
    ],
    createdAt: "2026-02-15",
    updatedAt: "2026-03-05",
  },
  {
    id: "sel-trial-3",
    title: "Cricket U-19 Selection Trials",
    sport: "Cricket",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    trialDate: "2026-02-28",
    venue: "Cricket Ground",
    maxSlots: 15,
    waitingListSlots: 4,
    status: "completed",
    description: "Completed U-19 cricket squad selection for state qualifiers.",
    committee: [
      { id: "cm-6", name: "Coach Ramesh Pillai", role: "Head Coach" },
      { id: "cm-7", name: "Coach Vikram Singh", role: "Batting Consultant" },
    ],
    createdAt: "2026-01-10",
    updatedAt: "2026-03-01",
  },
];

function evalScores(
  technique: number,
  speed: number,
  strength: number,
  discipline: number,
  attendance: number,
  coachRating: number,
  evaluatedBy: string,
  evaluatedAt: string,
  notes?: string,
): CandidateEvaluation {
  const totalScore =
    Math.round(
      ((technique + speed + strength + discipline + attendance + coachRating) / 6) * 10,
    ) / 10;
  return {
    technique,
    speed,
    strength,
    discipline,
    attendance,
    coachRating,
    totalScore,
    evaluatedBy,
    evaluatedAt,
    notes,
  };
}

export const candidatesSeed: SelectionCandidate[] = [
  {
    id: "cand-1",
    trialId: "sel-trial-1",
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    classLabel: "Class 10-A",
    registeredAt: "2026-02-20",
    status: "selected",
    evaluation: evalScores(8, 7, 8, 9, 9, 8, "Coach Vikram Singh", "2026-03-08"),
    rank: 1,
    notified: true,
    notifiedAt: "2026-03-10",
  },
  {
    id: "cand-2",
    trialId: "sel-trial-1",
    studentId: "stu-3",
    studentName: "Rohan Das",
    classLabel: "Class 11-A",
    registeredAt: "2026-02-22",
    status: "waiting",
    evaluation: evalScores(7, 8, 7, 8, 8, 7, "Coach Vikram Singh", "2026-03-08"),
    rank: 2,
    notified: true,
    notifiedAt: "2026-03-10",
  },
  {
    id: "cand-3",
    trialId: "sel-trial-1",
    studentId: "stu-11",
    studentName: "Harish Varma",
    classLabel: "Class 12-A",
    registeredAt: "2026-02-25",
    status: "rejected",
    evaluation: evalScores(6, 7, 8, 5, 4, 6, "Coach Meera Iyer", "2026-03-09", "Medical clearance pending"),
    rank: 5,
    notified: true,
    notifiedAt: "2026-03-10",
  },
  {
    id: "cand-4",
    trialId: "sel-trial-1",
    studentId: "stu-5",
    studentName: "Karan Joshi",
    classLabel: "Class 10-B",
    registeredAt: "2026-03-01",
    status: "evaluated",
    evaluation: evalScores(7, 6, 7, 8, 7, 7, "Coach Vikram Singh", "2026-03-09"),
    rank: 3,
    notified: false,
  },
  {
    id: "cand-5",
    trialId: "sel-trial-1",
    studentId: "stu-6",
    studentName: "Divya Krishnan",
    classLabel: "Class 11-B",
    registeredAt: "2026-03-02",
    status: "registered",
    notified: false,
  },
  {
    id: "cand-6",
    trialId: "sel-trial-2",
    studentId: "stu-3",
    studentName: "Rohan Das",
    classLabel: "Class 11-A",
    registeredAt: "2026-03-05",
    status: "registered",
    notified: false,
  },
  {
    id: "cand-7",
    trialId: "sel-trial-2",
    studentId: "stu-4",
    studentName: "Sneha Patel",
    classLabel: "Class 10-C",
    registeredAt: "2026-03-06",
    status: "registered",
    notified: false,
  },
  {
    id: "cand-8",
    trialId: "sel-trial-3",
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    classLabel: "Class 10-A",
    registeredAt: "2026-01-20",
    status: "selected",
    evaluation: evalScores(8, 7, 7, 9, 9, 8, "Coach Ramesh Pillai", "2026-02-25"),
    rank: 2,
    notified: true,
    notifiedAt: "2026-02-28",
  },
  {
    id: "cand-9",
    trialId: "sel-trial-3",
    studentId: "stu-11",
    studentName: "Harish Varma",
    classLabel: "Class 12-A",
    registeredAt: "2026-01-22",
    status: "selected",
    evaluation: evalScores(9, 8, 9, 8, 8, 9, "Coach Ramesh Pillai", "2026-02-25"),
    rank: 1,
    notified: true,
    notifiedAt: "2026-02-28",
  },
];
