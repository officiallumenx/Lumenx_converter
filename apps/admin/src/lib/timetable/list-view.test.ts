import { describe, expect, it } from "vitest";
import { resolveTimetableLoadView } from "./list-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("timetable list-view", () => {
  it("blocks while institute is loading", () => {
    const view = resolveTimetableLoadView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedBundle: null,
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
  });
});
