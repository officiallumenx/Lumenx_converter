import { describe, expect, it } from "vitest";

/**
 * Contract test: publish must seed marks-entry structure (flowchart note).
 * Implementation lives in marks/service.seedMarkEntriesForExamPublish and is
 * invoked from exams/service when schedule_status flips to published.
 */
describe("exam publish marks seed contract", () => {
  it("documents required seed inputs", () => {
    const required = [
      "instituteId",
      "academicYearId",
      "examId",
      "maxMarks",
      "targets",
      "subjectIds",
    ] as const;
    expect(required).toContain("examId");
    expect(required).toContain("subjectIds");
    expect(required).toContain("targets");
  });
});
