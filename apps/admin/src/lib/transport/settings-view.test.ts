import { describe, expect, it } from "vitest";
import { resolveTransportSettingsView } from "./settings-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveTransportSettingsView", () => {
  it("returns demo settings in demo mode", () => {
    const settings = {
      defaultNotificationRadiusM: 150,
      defaultPickupBufferMins: 5,
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    };
    const view = resolveTransportSettingsView({
      apiMode: false,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedSettings: settings,
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.settings).toEqual(settings);
  });

  it("blocks settings while institute is loading in API mode", () => {
    const view = resolveTransportSettingsView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedSettings: null,
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.status).toBe("loading");
  });
});
