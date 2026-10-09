import { describe, expect, it } from "vitest";
import {
  formatApproachEta,
  formatEtaMinutes,
  trackingStatusLabel,
} from "./transport-utils";
import type { TransportTracking } from "./transport/types";

function tracking(partial: Partial<TransportTracking>): TransportTracking {
  return {
    phase: "morning_pickup",
    runStatus: "en_route",
    learnerStatus: "awaiting_pickup",
    currentStopIndex: 1,
    progressPercent: 40,
    etaMinutes: 8,
    nextStopName: "Stop",
    lastUpdated: "07:10",
    delayMinutes: 0,
    lat: 0,
    lng: 0,
    ...partial,
  };
}

describe("transport-utils", () => {
  it("formats ETA minutes", () => {
    expect(formatEtaMinutes(0)).toBe("Bus arriving now");
    expect(formatEtaMinutes(1)).toBe("Bus arrives in 1 minute");
    expect(formatEtaMinutes(12)).toBe("Bus arrives in 12 minutes");
  });

  it("labels learner journey ahead of stale ETA", () => {
    expect(
      trackingStatusLabel(
        tracking({ learnerStatus: "picked_up", etaMinutes: 0, runStatus: "en_route" }),
      ),
    ).toBe("Picked up");
    expect(
      trackingStatusLabel(
        tracking({
          learnerStatus: "reached_school",
          etaMinutes: 0,
          runStatus: "completed",
          phase: "at_school",
        }),
      ),
    ).toBe("Reached school");
  });

  it("prefers parent-facing status labels", () => {
    expect(
      trackingStatusLabel(
        tracking({ parentStatus: "location_unavailable", sharedTripActive: true }),
      ),
    ).toBe("Location unavailable");
    expect(
      trackingStatusLabel(tracking({ parentStatus: "arrived", etaMinutes: 0 })),
    ).toBe("Arrived");
  });

  it("formats confidence-aware approach ETA without claiming road accuracy", () => {
    expect(formatApproachEta({ minutes: 6, confidence: "high", displayMode: "eta" })).toBe(
      "Bus arrives in 6 minutes",
    );
    expect(formatApproachEta({ minutes: 8, confidence: "medium", displayMode: "eta" })).toBe(
      "About 8 min",
    );
    expect(formatApproachEta({ minutes: 10, displayMode: "stopped" })).toBe(
      "About 10 min · bus may be stopped",
    );
    expect(
      formatApproachEta({
        minutes: 5,
        displayMode: "stale",
        gpsFreshness: "stale",
        lastUpdated: "2 min ago",
      }),
    ).toBe("Location is stale · 2 min ago");
    expect(formatApproachEta({ minutes: null, displayMode: "uncertain" })).toBe(
      "ETA unavailable",
    );
  });
});
