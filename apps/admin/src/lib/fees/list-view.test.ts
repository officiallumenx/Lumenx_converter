import { describe, expect, it } from "vitest";
import { resolveFeesLoadView } from "./list-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveFeesLoadView", () => {
  it("returns demo snapshot in demo mode", () => {
    const view = resolveFeesLoadView({
      apiMode: false,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedSnapshot: null,
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("demo");
  });

  it("blocks rows while institute is loading in API mode", () => {
    const view = resolveFeesLoadView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedSnapshot: null,
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.status).toBe("loading");
  });
});
