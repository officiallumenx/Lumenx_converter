import { describe, expect, it } from "vitest";
import {
  resolveStudentsListView,
  shouldCommitStudentsLoad,
} from "./list-view";
import type { StudentListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: StudentListItem = {
  id: "stu-a",
  name: "Student A",
  firstName: "Student",
  surname: "A",
  displayName: "Student A",
  grade: "10-A",
  classLabel: "Grade 10",
  sectionLabel: "A",
  rollNo: null,
  admissionNumber: null,
  status: "active",
  accessStatus: "active",
  gender: "female",
  dateOfBirth: null,
  attendance: 0,
  gpa: 0,
  parent: "",
};

describe("resolveStudentsListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveStudentsListView({
      apiMode: false,
      instituteStatus: "demo",
      activeInstituteId: null,
      resolvedForInstituteId: null,
      storedItems: [rowA],
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.items).toEqual([rowA]);
    expect(view.status).toBe("demo");
  });

  it("shows ready rows only when resolvedForInstituteId matches active", () => {
    const view = resolveStudentsListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedItems: [rowA],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.items).toEqual([rowA]);
  });

  it("invalidates institute A rows when active institute switches to B", () => {
    const view = resolveStudentsListView({
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
    expect(view.status).toBe("loading");
    expect(view.items).toEqual([]);
  });

  it.each([
    "loading",
    "needs_selection",
    "empty",
    "error",
    "forbidden",
  ] as const)(
    "hides previously loaded rows when institute context is %s",
    (instituteStatus) => {
      const view = resolveStudentsListView({
        apiMode: true,
        instituteStatus,
        activeInstituteId: instituteStatus === "loading" ? A : null,
        resolvedForInstituteId: A,
        storedItems: [rowA],
        storedStatus: "ready",
        storedErrorMessage: null,
        instituteErrorMessage:
          instituteStatus === "error" || instituteStatus === "forbidden"
            ? "blocked"
            : null,
      });
      expect(view.rowsValid).toBe(false);
      expect(view.items).toEqual([]);
    },
  );
});

describe("shouldCommitStudentsLoad", () => {
  it("rejects cancelled responses", () => {
    expect(
      shouldCommitStudentsLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
  });

  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitStudentsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("rejects commit when active institute is null", () => {
    expect(
      shouldCommitStudentsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: null,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response for active institute", () => {
    expect(
      shouldCommitStudentsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
