import { describe, expect, it } from "vitest";
import {
  resolveAnnouncementsListView,
  shouldCommitAnnouncementsLoad,
} from "./list-view";
import type { AnnouncementListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: AnnouncementListItem = {
  id: "ann-a",
  title: "From institute A",
  audience: "All",
  author: "Admin",
  views: 1,
  when: "1h ago",
  pinned: false,
  status: "published",
};

describe("resolveAnnouncementsListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveAnnouncementsListView({
      apiMode: false,
      instituteStatus: "demo",
      activeInstituteId: null,
      resolvedForInstituteId: null,
      storedItems: [rowA],
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view).toEqual({
      status: "demo",
      items: [rowA],
      errorMessage: null,
      rowsValid: true,
    });
  });

  it("invalidates institute A rows when active institute switches to B (sync)", () => {
    const view = resolveAnnouncementsListView({
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
    expect(view.items.some((i) => i.id === "ann-a")).toBe(false);
  });

  it("shows ready rows only when resolvedForInstituteId matches active", () => {
    const view = resolveAnnouncementsListView({
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
    expect(view.status).toBe("ready");
    expect(view.items).toEqual([rowA]);
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
      const view = resolveAnnouncementsListView({
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
      if (instituteStatus === "loading") {
        expect(view.status).toBe("loading");
      } else if (
        instituteStatus === "needs_selection" ||
        instituteStatus === "empty"
      ) {
        expect(view.status).toBe("needs_institute");
      } else {
        expect(view.status).toBe(instituteStatus);
      }
    },
  );
});

describe("shouldCommitAnnouncementsLoad", () => {
  it("rejects cancelled responses", () => {
    expect(
      shouldCommitAnnouncementsLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
  });

  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitAnnouncementsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response for active institute", () => {
    expect(
      shouldCommitAnnouncementsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });

  it("rejects when active institute is missing", () => {
    expect(
      shouldCommitAnnouncementsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: null,
      }),
    ).toBe(false);
  });
});
