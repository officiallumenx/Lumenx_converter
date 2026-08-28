import { describe, expect, it } from "vitest";
import { resolveTransportDriversListView, resolveTransportRoutesListView, resolveTransportVehiclesListView } from "./list-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveTransportVehiclesListView", () => {
  it("returns demo rows in demo mode", () => {
    const view = resolveTransportVehiclesListView({
      apiMode: false,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedItems: [],
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("demo");
  });

  it("blocks rows while institute is loading in API mode", () => {
    const view = resolveTransportVehiclesListView({
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
    expect(view.status).toBe("loading");
  });

  it("blocks driver rows while institute is loading in API mode", () => {
    const view = resolveTransportDriversListView({
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
    expect(view.status).toBe("loading");
  });

  it("blocks route rows while institute is loading in API mode", () => {
    const view = resolveTransportRoutesListView({
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
    expect(view.status).toBe("loading");
  });
});
