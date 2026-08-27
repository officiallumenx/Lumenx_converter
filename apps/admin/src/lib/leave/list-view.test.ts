import { describe, expect, it } from "vitest";
import { resolveLeaveListView, shouldCommitLeaveLoad } from "./list-view";
import type { LeaveListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: LeaveListItem = {
  id: "lv-a",
  subjectKind: "teacher",
  name: "Teacher 11111111",
  className: "—",
  dept: "—",
  from: "2026-06-01",
  to: "2026-06-03",
  days: 3,
  reason: "Personal",
  status: "pending",
  applied: "2026-05-30",
  type: "casual",
  toRole: "Institute admin",
};

describe("resolveLeaveListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveLeaveListView({
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
    const view = resolveLeaveListView({
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
    const view = resolveLeaveListView({
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
      const view = resolveLeaveListView({
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

describe("shouldCommitLeaveLoad", () => {
  it("rejects cancelled responses", () => {
    expect(
      shouldCommitLeaveLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
  });

  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitLeaveLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("rejects commit when active institute is null", () => {
    expect(
      shouldCommitLeaveLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: null,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response for active institute", () => {
    expect(
      shouldCommitLeaveLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
