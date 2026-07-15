import type {
  FitnessMetricKey,
  FitnessMetricSnapshot,
  FitnessTestResult,
  StudentFitnessProfile,
} from "./types";
import { FITNESS_METRIC_UNITS } from "./types";

export function cloneProfile(p: StudentFitnessProfile): StudentFitnessProfile {
  return {
    ...p,
    medicalHistory: p.medicalHistory.map((h) => ({ ...h })),
    injuries: p.injuries.map((i) => ({ ...i })),
    fitnessTests: p.fitnessTests.map((t) => ({ ...t })),
    latestMetrics: { ...p.latestMetrics },
    coachView: {
      ...p.coachView,
      restrictions: [...p.coachView.restrictions],
      recommendations: [...p.coachView.recommendations],
    },
  };
}

function test(
  id: string,
  metric: FitnessMetricKey,
  value: number,
  testedAt: string,
  notes?: string,
): FitnessTestResult {
  return {
    id,
    metric,
    value,
    unit: FITNESS_METRIC_UNITS[metric],
    testedAt,
    notes,
  };
}

function latestFromTests(tests: FitnessTestResult[]): Record<FitnessMetricKey, FitnessMetricSnapshot | null> {
  const keys: FitnessMetricKey[] = ["bmi", "strength", "endurance", "speed", "flexibility"];
  const result = {} as Record<FitnessMetricKey, FitnessMetricSnapshot | null>;
  for (const key of keys) {
    const match = [...tests]
      .filter((t) => t.metric === key)
      .sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0];
    result[key] = match
      ? { value: match.value, unit: match.unit, testedAt: match.testedAt }
      : null;
  }
  return result;
}

export const fitnessProfilesSeed: StudentFitnessProfile[] = [
  {
    id: "fit-1",
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    classLabel: "Class 10-A",
    teamName: "Senior Football",
    clearanceStatus: "cleared",
    clearanceDate: "2026-02-15",
    clearanceNotes: "Annual sports medical clearance approved.",
    medicalHistory: [
      {
        id: "mh-1",
        condition: "Mild asthma",
        diagnosedDate: "2022-04-10",
        notes: "Uses inhaler before high-intensity sessions.",
        ongoing: true,
      },
    ],
    injuries: [
      {
        id: "inj-1",
        injuryType: "Ankle sprain",
        bodyPart: "Right ankle",
        severity: "minor",
        occurredOn: "2026-01-20",
        status: "recovered",
        recoveryNotes: "Completed physiotherapy; full training resumed.",
        expectedReturnDate: "2026-02-05",
      },
    ],
    fitnessTests: [
      test("ft-1", "bmi", 21.8, "2026-02-10"),
      test("ft-2", "strength", 68, "2026-02-10"),
      test("ft-3", "endurance", 12.5, "2026-02-10", "Cooper 12-min run equivalent"),
      test("ft-4", "speed", 5.8, "2026-02-10", "40m sprint"),
      test("ft-5", "flexibility", 24, "2026-02-10", "Sit-and-reach"),
      test("ft-6", "bmi", 21.5, "2026-03-01"),
      test("ft-7", "endurance", 13.2, "2026-03-01"),
    ],
    latestMetrics: latestFromTests([]),
    coachView: {
      medicalNotes: "Monitor breathing during sprints. Hydration breaks every 20 min.",
      restrictions: ["No full-contact drills until coach confirms readiness"],
      recommendations: ["Light warm-up 15 min", "Post-session stretching routine"],
      lastUpdatedBy: "Coach Vikram Singh",
      lastUpdatedAt: "2026-03-05",
    },
    createdAt: "2025-08-01",
    updatedAt: "2026-03-05",
  },
  {
    id: "fit-2",
    studentId: "stu-2",
    studentName: "Priya Nair",
    classLabel: "Class 9-B",
    teamName: "Swimming",
    clearanceStatus: "cleared",
    clearanceDate: "2026-02-18",
    medicalHistory: [],
    injuries: [],
    fitnessTests: [
      test("ft-8", "bmi", 20.2, "2026-02-18"),
      test("ft-9", "strength", 42, "2026-02-18"),
      test("ft-10", "endurance", 18.0, "2026-02-18", "Pool endurance test"),
      test("ft-11", "speed", 6.2, "2026-02-18"),
      test("ft-12", "flexibility", 28, "2026-02-18"),
    ],
    latestMetrics: latestFromTests([]),
    coachView: {
      medicalNotes: "Excellent cardiovascular baseline. No concerns.",
      restrictions: [],
      recommendations: ["Increase core strength sessions 2×/week"],
      lastUpdatedBy: "Coach Meera Iyer",
      lastUpdatedAt: "2026-02-20",
    },
    createdAt: "2025-08-01",
    updatedAt: "2026-02-20",
  },
  {
    id: "fit-3",
    studentId: "stu-3",
    studentName: "Rohan Das",
    classLabel: "Class 11-A",
    teamName: "Basketball",
    clearanceStatus: "restricted",
    clearanceDate: "2026-03-01",
    clearanceNotes: "Restricted until knee recovery complete.",
    medicalHistory: [
      {
        id: "mh-2",
        condition: "Previous ACL strain (2024)",
        diagnosedDate: "2024-09-05",
        notes: "Conservative treatment; no surgery.",
        ongoing: false,
      },
    ],
    injuries: [
      {
        id: "inj-2",
        injuryType: "Knee strain",
        bodyPart: "Left knee",
        severity: "moderate",
        occurredOn: "2026-02-28",
        status: "recovering",
        recoveryNotes: "Ice, rest, gradual return protocol.",
        expectedReturnDate: "2026-03-20",
      },
    ],
    fitnessTests: [
      test("ft-13", "bmi", 23.1, "2026-01-15"),
      test("ft-14", "strength", 72, "2026-01-15"),
      test("ft-15", "endurance", 11.0, "2026-01-15"),
      test("ft-16", "speed", 5.5, "2026-01-15"),
      test("ft-17", "flexibility", 20, "2026-01-15"),
    ],
    latestMetrics: latestFromTests([]),
    coachView: {
      medicalNotes: "No jumping or pivot drills. Upper-body conditioning only.",
      restrictions: ["No basketball games", "No lateral movement drills", "Limited court time"],
      recommendations: ["Physio exercises daily", "Swimming for low-impact cardio"],
      lastUpdatedBy: "Coach Vikram Singh",
      lastUpdatedAt: "2026-03-02",
    },
    createdAt: "2025-08-01",
    updatedAt: "2026-03-02",
  },
  {
    id: "fit-4",
    studentId: "stu-4",
    studentName: "Sneha Patel",
    classLabel: "Class 10-C",
    teamName: "Athletics",
    clearanceStatus: "pending",
    clearanceNotes: "Awaiting updated fitness assessment.",
    medicalHistory: [
      {
        id: "mh-3",
        condition: "Iron deficiency (resolved)",
        diagnosedDate: "2025-06-01",
        ongoing: false,
      },
    ],
    injuries: [],
    fitnessTests: [
      test("ft-18", "bmi", 19.8, "2026-02-05"),
      test("ft-19", "strength", 38, "2026-02-05"),
      test("ft-20", "endurance", 14.5, "2026-02-05"),
      test("ft-21", "speed", 6.0, "2026-02-05"),
      test("ft-22", "flexibility", 26, "2026-02-05"),
    ],
    latestMetrics: latestFromTests([]),
    coachView: {
      medicalNotes: "Schedule re-test before district meet registration.",
      restrictions: ["No competition entry until clearance"],
      recommendations: ["Complete full fitness battery by 15 Mar"],
      lastUpdatedBy: "Coach Ananya Rao",
      lastUpdatedAt: "2026-03-04",
    },
    createdAt: "2025-08-01",
    updatedAt: "2026-03-04",
  },
  {
    id: "fit-5",
    studentId: "stu-11",
    studentName: "Harish Varma",
    classLabel: "Class 12-A",
    teamName: "Cricket",
    clearanceStatus: "not_cleared",
    clearanceNotes: "Concussion protocol — not cleared for contact sports.",
    medicalHistory: [
      {
        id: "mh-4",
        condition: "Concussion (Feb 2026)",
        diagnosedDate: "2026-02-22",
        notes: "Graduated return-to-play protocol in progress.",
        ongoing: true,
      },
    ],
    injuries: [
      {
        id: "inj-3",
        injuryType: "Concussion",
        bodyPart: "Head",
        severity: "moderate",
        occurredOn: "2026-02-22",
        status: "active",
        recoveryNotes: "Step 2 of 6 — light aerobic activity only.",
        expectedReturnDate: "2026-04-01",
      },
    ],
    fitnessTests: [
      test("ft-23", "bmi", 24.0, "2026-01-10"),
      test("ft-24", "strength", 75, "2026-01-10"),
      test("ft-25", "endurance", 10.5, "2026-01-10"),
      test("ft-26", "speed", 5.4, "2026-01-10"),
      test("ft-27", "flexibility", 18, "2026-01-10"),
    ],
    latestMetrics: latestFromTests([]),
    coachView: {
      medicalNotes: "Strict no-contact. School nurse follow-up weekly.",
      restrictions: ["No cricket", "No headers", "No contact drills", "Academic rest breaks as needed"],
      recommendations: ["Cognitive rest", "Medical review before any return"],
      lastUpdatedBy: "School Nurse",
      lastUpdatedAt: "2026-02-25",
    },
    createdAt: "2025-08-01",
    updatedAt: "2026-02-25",
  },
].map((p) => ({
  ...p,
  latestMetrics: latestFromTests(p.fitnessTests),
}));
