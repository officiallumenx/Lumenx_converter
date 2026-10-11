import { describe, expect, it } from "vitest";

import {
  deriveDriverHomeAction,
  homeActionPrimaryLabel,
  nextStartSlot,
  tripKindForSlot,
  type DriverTripDaySnapshot,
} from "./day-state";

function snap(
  overrides: Partial<DriverTripDaySnapshot> = {},
): DriverTripDaySnapshot {
  return {
    routeHydrated: true,
    hasAssignedRoute: true,
    hasUsableStops: true,
    lockedByAdmin: false,
    routeSetupStatus: "configured",
    phase: "ready",
    slot: null,
    morningCompletedToday: false,
    eveningCompletedToday: false,
    ...overrides,
  };
}

describe("deriveDriverHomeAction", () => {
  it("shows loading until route hydrate finishes (never Setup Route)", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          routeHydrated: false,
          routeSetupStatus: "not_configured",
          hasUsableStops: false,
        }),
      ),
    ).toBe("loading");
  });

  it("assigned route with usable stops → Start Pickup, not Setup Route", () => {
    expect(deriveDriverHomeAction(snap())).toBe("start_pickup");
    expect(homeActionPrimaryLabel("start_pickup")).toBe("Start Pickup Trip");
  });

  it("not_configured alone does not force Setup Route when stops exist", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          routeSetupStatus: "not_configured",
          hasUsableStops: true,
        }),
      ),
    ).toBe("start_pickup");
  });

  it("no usable stops + not_configured → Setup Route", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          routeSetupStatus: "not_configured",
          hasUsableStops: false,
        }),
      ),
    ).toBe("setup_route");
  });

  it("pickup completion → Drop ready", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          morningCompletedToday: true,
          phase: "ready",
        }),
      ),
    ).toBe("start_drop");
    expect(nextStartSlot("start_drop")).toBe("evening");
  });

  it("readiness slot lock: start_drop stays evening (not morning fallback)", () => {
    // Mirrors HomePage/AttendanceGate locking readinessSlot when opening the sheet.
    const action = deriveDriverHomeAction(
      snap({ morningCompletedToday: true, phase: "ready" }),
    );
    expect(action).toBe("start_drop");
    const locked = nextStartSlot(action) ?? (action === "start_drop" ? "evening" : "morning");
    expect(locked).toBe("evening");
    // After Drop starts, nextStartSlot(continue_drop) is null — must not remap to morning.
    expect(nextStartSlot("continue_drop")).toBeNull();
  });

  it("active morning trip → continue pickup", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          phase: "running",
          slot: "morning",
        }),
      ),
    ).toBe("continue_pickup");
  });

  it("active evening trip → continue drop", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          phase: "boarding",
          slot: "evening",
          morningCompletedToday: true,
        }),
      ),
    ).toBe("continue_drop");
  });

  it("both slots completed → day complete", () => {
    expect(
      deriveDriverHomeAction(
        snap({
          morningCompletedToday: true,
          eveningCompletedToday: true,
          phase: "completed",
          slot: "evening",
        }),
      ),
    ).toBe("day_complete");
  });

  it("maps slot to trip kind", () => {
    expect(tripKindForSlot("morning")).toBe("pickup");
    expect(tripKindForSlot("evening")).toBe("drop");
  });
});
