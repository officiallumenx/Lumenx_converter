import { describe, expect, it } from "vitest";
import { resolveAdmissionsListView, shouldCommitAdmissionsLoad } from "./list-view";
import type { AdmissionApplicationListItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rowA: AdmissionApplicationListItem = {
  id: "app-a",
  name: "Aarav",
  grade: "Grade 10",
  stage: "review",
  applied: "1 Jun 2026",
  docs: "—/—",
};

describe("resolveAdmissionsListView", () => {
  it("invalidates stale institute rows", () => {
    const view = resolveAdmissionsListView({
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

describe("shouldCommitAdmissionsLoad", () => {
  it("accepts matching in-flight response", () => {
    expect(
      shouldCommitAdmissionsLoad({
        cancelled: false,
        requestInstituteId: B,
        activeInstituteId: B,
      }),
    ).toBe(true);
  });
});
