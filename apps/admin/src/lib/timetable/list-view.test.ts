import { describe, expect, it } from "vitest";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  resolveTimetableLoadView,
  shouldCommitTimetableLoad,
} from "./list-view";
import type { TimetableReadBundle } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const bundleA: TimetableReadBundle = {
  slots: [
    {
      id: "slot-a",
      sectionId: "sec-a",
      classId: "class-a",
      classLabel: "Grade 10",
      sectionLabel: "A",
      dayOfWeek: 1,
      dayLabel: "Mon",
      periodIndex: 1,
      startsAt: "09:00",
      endsAt: "09:45",
      room: "101",
      status: "active",
      teacherAssignmentId: "assign-a",
      academicYearId: "year-a",
    },
  ],
  sections: [
    {
      sectionId: "sec-a",
      classLabel: "Grade 10",
      sectionLabel: "A",
      slotCount: 1,
      activeCount: 1,
    },
  ],
};

describe("resolveTimetableLoadView", () => {
  it("blocks while institute is loading", () => {
    const view = resolveTimetableLoadView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: A,
      resolvedForInstituteId: null,
      storedBundle: null,
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
  });

  it("shows ready bundle only when resolvedForInstituteId matches active", () => {
    const view = resolveTimetableLoadView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedBundle: bundleA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.bundle).toEqual(bundleA);
  });

  it("invalidates institute A rows when active institute switches to B", () => {
    const view = resolveTimetableLoadView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedBundle: bundleA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.status).toBe("loading");
    expect(view.bundle).toBeNull();
  });

  it("surfaces API errors without demo fallback", () => {
    const view = resolveTimetableLoadView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedBundle: null,
      storedStatus: "error",
      storedErrorMessage: "boom",
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("error");
    expect(view.errorMessage).toBe("boom");
    expect(view.bundle).toBeNull();
  });
});

describe("shouldCommitTimetableLoad", () => {
  it("rejects late response for A after switch to B", () => {
    expect(
      shouldCommitTimetableLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitTimetableLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});

describe("timetable write gate", () => {
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
