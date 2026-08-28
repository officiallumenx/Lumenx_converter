import { describe, expect, it } from "vitest";
import { resolveIssuedCertificatesListView } from "./list-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("certificates list-view", () => {
  it("blocks while institute is loading", () => {
    const view = resolveIssuedCertificatesListView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedItems: [],
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
  });

  it("returns stored items when institute matches", () => {
    const view = resolveIssuedCertificatesListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedItems: [],
      storedStatus: "empty",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("empty");
  });
});
