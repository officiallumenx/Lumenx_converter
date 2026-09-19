import { describe, expect, it } from "vitest";
import {
  assignSubjectsToDates,
  suggestExamEndDate,
  isBlockedExamDay,
} from "./exam-calendar-utils";

describe("suggestExamEndDate", () => {
  it("skips Sundays and returns last paper working day", () => {
    // 2026-03-13 is Friday; next days include Saturday + Sunday blocked patterns
    const start = "2026-03-13";
    const end = suggestExamEndDate(start, 3);
    const papers = assignSubjectsToDates(start, end, ["A", "B", "C"]);
    expect(papers).toHaveLength(3);
    expect(papers.every((p) => !isBlockedExamDay(p.date))).toBe(true);
    expect(end).toBe(papers[2]?.date);
  });

  it("returns start when subject count is zero", () => {
    expect(suggestExamEndDate("2026-03-13", 0)).toBe("2026-03-13");
  });
});
