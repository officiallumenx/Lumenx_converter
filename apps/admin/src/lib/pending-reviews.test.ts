import { describe, expect, it } from "vitest";
import { DEMO_COMPLAINTS_SEED } from "./complaints-data";
import { getInitialTeacherLeave } from "./leave-data";
import type { MarkEntry } from "./marks-entry-store";
import {
  buildPendingReviews,
  countAdminComplaints,
  countPendingTeacherLeave,
  countSubmittedMarks,
} from "./pending-reviews";

function markEntry(status: MarkEntry["status"]): MarkEntry {
  return {
    id: "m-1",
    teacherId: "t-1",
    teacherName: "A. Mehta",
    subject: "Math",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT1",
    examName: "Unit Test 1",
    maxMarks: 50,
    status,
    students: [],
  };
}

describe("pending reviews aggregation", () => {
  it("counts submitted marks only for admin review", () => {
    expect(countSubmittedMarks([markEntry("submitted"), markEntry("pending")])).toBe(1);
  });

  it("counts pending teacher leave", () => {
    const rows = getInitialTeacherLeave();
    expect(countPendingTeacherLeave(rows)).toBeGreaterThan(0);
  });

  it("counts principal/admin complaints that are not resolved", () => {
    expect(countAdminComplaints(DEMO_COMPLAINTS_SEED)).toBe(3);
  });

  it("builds review rows from real counts without attention-only items", () => {
    const rows = buildPendingReviews({
      submittedMarks: 2,
      pendingTeacherLeave: 1,
      adminComplaints: 3,
      pendingAdmissionConverts: 1,
      pendingCareerHires: 0,
      pendingTransportStops: 2,
      pendingTransportAssignments: 1,
    });
    expect(rows.map((r) => r.id)).toEqual([
      "marks-review",
      "teacher-leave",
      "complaints-admin",
      "admissions-convert",
      "transport-stops",
      "transport-assignments",
    ]);
    expect(rows.find((r) => r.id === "marks-review")?.count).toBe(2);
    expect(rows.find((r) => r.id === "transport-stops")?.search).toEqual({ view: "reviews" });
    expect(rows.find((r) => r.id === "transport-assignments")?.search).toEqual({
      view: "reviews",
    });
  });

  it("omits rows with zero counts", () => {
    expect(
      buildPendingReviews({
        submittedMarks: 0,
        pendingTeacherLeave: 0,
        adminComplaints: 0,
        pendingAdmissionConverts: 0,
        pendingCareerHires: 0,
        pendingTransportStops: 0,
        pendingTransportAssignments: 0,
      }),
    ).toEqual([]);
  });
});
