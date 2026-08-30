import { describe, expect, it } from "vitest";
import { resolveHomeworkListView, shouldCommitHomeworkLoad } from "./list-view";
import type { HomeworkListItem } from "./types";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: HomeworkListItem = {
  id: "hw-1",
  instituteId: A,
  title: "Algebra practice",
  description: "Do worksheets",
  instructions: null,
  kind: "homework",
  status: "published",
  dueDate: "2026-09-01",
  teacherId: "t1",
  teacherName: "Sarah",
  classLabel: "10-A",
  subjectLabel: "Math",
  publishedAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-01T10:00:00Z",
};

describe("resolveHomeworkListView", () => {
  it("passes through demo mode", () => {
    const view = resolveHomeworkListView({
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
    expect(view.items).toHaveLength(1);
  });

  it("shows ready rows only when resolved institute matches active", () => {
    const view = resolveHomeworkListView({
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
    expect(view.items[0]?.title).toBe("Algebra practice");
  });

  it("invalidates institute A rows when active switches to B", () => {
    const view = resolveHomeworkListView({
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

  it("does not commit stale load after institute switch", () => {
    expect(
      shouldCommitHomeworkLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });
});

describe("homework write gate", () => {
  it("disables writes outside valid writable institute context", () => {
    expect(
      resolveWritesEnabled(true, {
        status: "loading",
        activeInstituteId: A,
      }),
    ).toBe(false);
    expect(
      resolveWritesEnabled(true, {
        status: "ready",
        activeInstituteId: null,
      }),
    ).toBe(false);
    expect(
      resolveWritesEnabled(true, {
        status: "ready",
        activeInstituteId: A,
      }),
    ).toBe(true);
  });
});
