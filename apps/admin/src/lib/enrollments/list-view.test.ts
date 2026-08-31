import { describe, expect, it } from "vitest";
import {
  resolveEnrollmentsListView,
  shouldCommitEnrollmentsLoad,
} from "./list-view";
import type { EnrollmentListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const row: EnrollmentListItem = {
  id: "enroll-1",
  studentId: "student-1",
  studentName: "Ada Lovelace",
  classId: "class-1",
  sectionId: "section-1",
  academicYearId: "year-1",
  classLabel: "Grade 10",
  sectionLabel: "A",
  rollNo: "1",
  status: "active",
  enrolledOn: "2026-04-01",
  withdrawnOn: null,
};

describe("resolveEnrollmentsListView", () => {
  it("demo mode passes through stored rows", () => {
    const view = resolveEnrollmentsListView({
      apiMode: false,
      instituteStatus: "demo",
      activeInstituteId: null,
      resolvedForInstituteId: null,
      storedItems: [row],
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.items).toEqual([row]);
  });

  it("invalidates rows when institute switches before load commits", () => {
    const view = resolveEnrollmentsListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedItems: [row],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.status).toBe("loading");
  });
});

describe("shouldCommitEnrollmentsLoad", () => {
  it("commits only when institute and filter key match", () => {
    expect(
      shouldCommitEnrollmentsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: A,
        requestKey: "year-1",
        activeKey: "year-1",
      }),
    ).toBe(true);
    expect(
      shouldCommitEnrollmentsLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
        requestKey: "year-1",
        activeKey: "year-1",
      }),
    ).toBe(false);
  });
});
