import { describe, expect, it } from "vitest";
import { resolveEventsListView, shouldCommitEventsLoad } from "./list-view";
import type { EventsListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: EventsListItem = {
  id: "evt-a",
  title: "Event A",
  date: "Jun 1 · 9:00 AM",
  type: "function",
  audience: "All",
  location: "Hall",
  published: true,
};

describe("resolveEventsListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveEventsListView({
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
    const view = resolveEventsListView({
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
    const view = resolveEventsListView({
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
      const view = resolveEventsListView({
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

describe("shouldCommitEventsLoad", () => {
  it("rejects cancelled responses", () => {
    expect(
      shouldCommitEventsLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
  });

  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitEventsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("rejects commit when active institute is null", () => {
    expect(
      shouldCommitEventsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: null,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response for active institute", () => {
    expect(
      shouldCommitEventsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
