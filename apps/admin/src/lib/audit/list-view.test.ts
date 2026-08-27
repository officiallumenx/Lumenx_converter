import { describe, expect, it } from "vitest";
import {
  resolveAuditListView,
  shouldCommitAuditLoad,
} from "./list-view";
import type { AuditEntry } from "@/lib/audit-activity-data";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: AuditEntry = {
  id: "aud-a",
  user: "Admin A",
  role: "Admin",
  action: "From institute A",
  target: "A-target",
  module: "Settings",
  status: "success",
  at: "1h ago",
  atSort: "2026-08-01T10:00:00Z",
  actorScope: "admin",
};

describe("resolveAuditListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveAuditListView({
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

  it("invalidates institute A rows when active institute switches to B", () => {
    const view = resolveAuditListView({
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
      const view = resolveAuditListView({
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

describe("shouldCommitAuditLoad", () => {
  it("rejects cancelled and mismatched institute responses", () => {
    expect(
      shouldCommitAuditLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
    expect(
      shouldCommitAuditLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
    expect(
      shouldCommitAuditLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
