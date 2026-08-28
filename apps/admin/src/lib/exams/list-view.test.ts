import { describe, expect, it } from "vitest";
import {
  resolveExamsListView,
  shouldCommitExamsLoad,
} from "./list-view";
import type { ExamListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: ExamListItem = {
  id: "exam-a",
  name: "Mid-Term",
  header: "Mid-Term",
  grade: "All classes",
  classScope: "all",
  grades: [],
  section: "All",
  term: "—",
  startDate: "2026-09-01",
  endDate: "2026-09-15",
  startTime: "09:00",
  endTime: "12:00",
  status: "scheduled",
  progress: 10,
  subjects: [],
  totalMarks: 100,
  internalMarks: null,
  externalMarks: null,
};

describe("resolveExamsListView", () => {
  it("invalidates stale institute rows", () => {
    const view = resolveExamsListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedItems: [rowA],
      storedTimetables: [],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.items).toEqual([]);
  });
});

describe("shouldCommitExamsLoad", () => {
  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitExamsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
