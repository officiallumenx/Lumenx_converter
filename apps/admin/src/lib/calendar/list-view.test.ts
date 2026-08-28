import { describe, expect, it } from "vitest";
import {
  resolveCalendarListView,
  shouldCommitCalendarLoad,
} from "./list-view";
import type { CalendarListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: CalendarListItem = {
  id: "cal-a",
  title: "Holiday A",
  date: "2026-06-01",
  kind: "holiday",
};

describe("resolveCalendarListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveCalendarListView({
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
    const view = resolveCalendarListView({
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
    const view = resolveCalendarListView({
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
      const view = resolveCalendarListView({
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

describe("shouldCommitCalendarLoad", () => {
  it("rejects cancelled responses", () => {
    expect(
      shouldCommitCalendarLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
  });

  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitCalendarLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("rejects commit when active institute is null", () => {
    expect(
      shouldCommitCalendarLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: null,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response for active institute", () => {
    expect(
      shouldCommitCalendarLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
