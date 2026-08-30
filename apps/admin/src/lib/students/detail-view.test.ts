import { describe, expect, it } from "vitest";
import { resolveStudentsDetailView } from "./detail-view";
import type { StudentDetailItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const detailA: StudentDetailItem = {
  id: "ac111111-1111-4111-8111-111111111111",
  instituteId: A,
  name: "Student A",
  firstName: "Student",
  surname: "A",
  displayName: "Student A",
  grade: "10-A",
  classLabel: "Grade 10",
  sectionLabel: "A",
  rollNo: "1",
  admissionNumber: "ADM-1",
  status: "active",
  accessStatus: "active",
  gender: "female",
  dateOfBirth: "2010-01-01",
  attendance: 0,
  gpa: 0,
  parent: "",
  address: "1 Main St",
  bloodGroup: null,
  emergencyContact: null,
  house: null,
  legacyCode: null,
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("resolveStudentsDetailView", () => {
  it("demo mode passes through stored detail", () => {
    const view = resolveStudentsDetailView({
      apiMode: false,
      instituteStatus: "demo",
      activeInstituteId: null,
      resolvedForInstituteId: null,
      storedStudent: detailA,
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(true);
    expect(view.student).toEqual(detailA);
    expect(view.status).toBe("demo");
  });

  it("shows ready detail only when resolvedForInstituteId matches active", () => {
    const view = resolveStudentsDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedStudent: detailA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(true);
    expect(view.student).toEqual(detailA);
  });

  it("invalidates institute A detail when active institute switches to B", () => {
    const view = resolveStudentsDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedStudent: detailA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(false);
    expect(view.status).toBe("loading");
    expect(view.student).toBeNull();
  });

  it.each([
    "loading",
    "needs_selection",
    "empty",
    "error",
    "forbidden",
  ] as const)(
    "hides previously loaded detail when institute context is %s",
    (instituteStatus) => {
      const view = resolveStudentsDetailView({
        apiMode: true,
        instituteStatus,
        activeInstituteId: instituteStatus === "loading" ? A : null,
        resolvedForInstituteId: A,
        storedStudent: detailA,
        storedStatus: "ready",
        storedErrorMessage: null,
        instituteErrorMessage:
          instituteStatus === "error" || instituteStatus === "forbidden"
            ? "blocked"
            : null,
      });
      expect(view.detailValid).toBe(false);
      expect(view.student).toBeNull();
    },
  );

  it("rejects ready detail whose instituteId mismatches active institute", () => {
    const view = resolveStudentsDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedStudent: { ...detailA, instituteId: B },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(true);
    expect(view.status).toBe("empty");
    expect(view.student).toBeNull();
  });
});
