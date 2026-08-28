import { describe, expect, it } from "vitest";
import {
  resolveAcademicYearsListView,
  shouldCommitAcademicYearsLoad,
} from "./list-view";
import type { AcademicYearListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: AcademicYearListItem = {
  id: "year-a",
  label: "2026-2027",
  startDate: "2026-04-01",
  endDate: "2027-03-31",
  status: "active",
  code: "AY2627",
};

describe("resolveAcademicYearsListView", () => {
  it("demo mode passes through stored demo rows", () => {
    const view = resolveAcademicYearsListView({
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
  });

  it("invalidates institute A rows when active institute switches to B", () => {
    const view = resolveAcademicYearsListView({
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
});

describe("shouldCommitAcademicYearsLoad", () => {
  it("rejects cancelled and stale institute responses", () => {
    expect(
      shouldCommitAcademicYearsLoad({
        cancelled: true,
        requestInstituteId: A,
        activeInstituteId: A,
      }),
    ).toBe(false);
    expect(
      shouldCommitAcademicYearsLoad({
        cancelled: false,
        requestInstituteId: A,
        activeInstituteId: B,
      }),
    ).toBe(false);
  });

  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitAcademicYearsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
