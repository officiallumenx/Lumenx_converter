import { describe, expect, it } from "vitest";
import { resolveMarksListView, shouldCommitMarksLoad } from "./list-view";
import type { MarkEntryListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: MarkEntryListItem = {
  id: "entry-a",
  teacherId: "teacher-a",
  teacherName: "Teacher · teacher-a",
  subject: "Subject · math",
  classGrade: "Class · g10",
  section: "Sec · a",
  examId: "exam-a",
  examName: "Exam · mid",
  maxMarks: 100,
  status: "submitted",
  students: [],
};

describe("resolveMarksListView", () => {
  it("invalidates stale institute rows", () => {
    const view = resolveMarksListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedItems: [rowA],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.items).toEqual([]);
  });
});

describe("shouldCommitMarksLoad", () => {
  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitMarksLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
