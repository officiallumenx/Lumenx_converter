import { describe, expect, it } from "vitest";
import { evaluateSetupProgress, summarizeSetupProgress } from "./progress";
import type { SetupCounts } from "./types";

function counts(overrides: Partial<SetupCounts> = {}): SetupCounts {
  return {
    activeYears: 0,
    classes: 0,
    sections: 0,
    subjects: 0,
    teachers: 0,
    teachersWithLogin: 0,
    students: 0,
    studentsWithLogin: 0,
    parents: 0,
    parentsWithLinks: 0,
    attendanceConfigs: 0,
    publishedFeePlans: 0,
    calendarEvents: 0,
    vehicles: 0,
    drivers: 0,
    routes: 0,
    approvedRoutes: 0,
    enrollments: 0,
    approvedEnrollments: 0,
    ...overrides,
  };
}

describe("evaluateSetupProgress", () => {
  it("marks academic year as the first todo when empty", () => {
    const steps = evaluateSetupProgress(counts());
    expect(steps[0]?.id).toBe("academic_year");
    expect(steps[0]?.state).toBe("todo");
    expect(steps.find((s) => s.id === "classes")?.state).toBe("blocked");
  });

  it("unlocks classes after an active year", () => {
    const steps = evaluateSetupProgress(counts({ activeYears: 1 }));
    expect(steps.find((s) => s.id === "academic_year")?.state).toBe("done");
    expect(steps.find((s) => s.id === "classes")?.state).toBe("todo");
  });

  it("reports core complete when people and catalog are ready", () => {
    const steps = evaluateSetupProgress(
      counts({
        activeYears: 1,
        classes: 2,
        sections: 4,
        subjects: 3,
        teachers: 5,
        teachersWithLogin: 2,
        students: 10,
        studentsWithLogin: 4,
        parents: 8,
        parentsWithLinks: 6,
      }),
    );
    const summary = summarizeSetupProgress(steps);
    expect(summary.coreComplete).toBe(true);
    expect(summary.coreDone).toBe(summary.coreTotal);
    expect(steps.find((s) => s.id === "fees")?.state).toBe("todo");
  });

  it("requires linked parents, not just parent rows", () => {
    const steps = evaluateSetupProgress(
      counts({
        activeYears: 1,
        classes: 1,
        sections: 1,
        subjects: 1,
        teachers: 1,
        students: 1,
        parents: 3,
        parentsWithLinks: 0,
      }),
    );
    expect(steps.find((s) => s.id === "parents")?.state).toBe("todo");
  });
});
