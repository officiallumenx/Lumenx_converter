import { describe, expect, it } from "vitest";
import { deriveParentTransportStatus } from "./parent-status";

describe("deriveParentTransportStatus", () => {
  it("prefers not riding and emergency", () => {
    expect(
      deriveParentTransportStatus({
        notRidingToday: true,
        tripPhase: "running",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: null,
        droppingStatus: null,
        approachBand: 5,
        withinRadius: false,
        hasLiveGps: true,
        gpsFreshness: "live",
        emergencyActive: false,
      }),
    ).toBe("not_riding");

    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "running",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: null,
        droppingStatus: null,
        approachBand: null,
        withinRadius: false,
        hasLiveGps: true,
        gpsFreshness: "live",
        emergencyActive: true,
      }),
    ).toBe("emergency");
  });

  it("does not invent live when GPS is missing", () => {
    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "running",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: "pending",
        droppingStatus: "pending",
        approachBand: null,
        withinRadius: false,
        hasLiveGps: false,
        gpsFreshness: "offline",
        emergencyActive: false,
      }),
    ).toBe("location_unavailable");
  });

  it("maps arrival / boarding / school / drop", () => {
    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "running",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: "pending",
        droppingStatus: "pending",
        approachBand: 5,
        withinRadius: true,
        hasLiveGps: true,
        gpsFreshness: "live",
        emergencyActive: false,
      }),
    ).toBe("arrived");

    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "boarding",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: "boarded",
        droppingStatus: "pending",
        approachBand: null,
        withinRadius: false,
        hasLiveGps: true,
        gpsFreshness: "live",
        emergencyActive: false,
      }),
    ).toBe("boarding");

    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "dropping",
        tripFinalized: false,
        schoolArrivedAt: "2026-10-05T03:00:00.000Z",
        boardingStatus: "boarded",
        droppingStatus: "pending",
        approachBand: null,
        withinRadius: false,
        hasLiveGps: true,
        gpsFreshness: "live",
        emergencyActive: false,
      }),
    ).toBe("dropping");
  });

  it("shows driver not started when no active trip", () => {
    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: null,
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: null,
        droppingStatus: null,
        approachBand: null,
        withinRadius: false,
        hasLiveGps: false,
        gpsFreshness: null,
        emergencyActive: false,
      }),
    ).toBe("driver_not_started");
  });

  it("maps ready trip to scheduled", () => {
    expect(
      deriveParentTransportStatus({
        notRidingToday: false,
        tripPhase: "ready",
        tripFinalized: false,
        schoolArrivedAt: null,
        boardingStatus: null,
        droppingStatus: null,
        approachBand: null,
        withinRadius: false,
        hasLiveGps: false,
        gpsFreshness: null,
        emergencyActive: false,
      }),
    ).toBe("scheduled");
  });
});
