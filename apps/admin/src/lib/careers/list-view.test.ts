import { describe, expect, it } from "vitest";
import { resolveCareersListView, shouldCommitCareersLoad } from "./list-view";
import type { CareerApplicationListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: CareerApplicationListItem = {
  id: "app-a",
  name: "Priya",
  role: "Math Teacher",
  stage: "approved",
  applied: "1 Jun 2026",
  docs: "—/—",
};

describe("resolveCareersListView", () => {
  it("invalidates stale institute rows", () => {
    const view = resolveCareersListView({
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
    expect(view.items).toEqual([]);
  });
});

describe("shouldCommitCareersLoad", () => {
  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitCareersLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
