import { describe, expect, it } from "vitest";
import { formatEtaMinutes, trackingStatusLabel } from "./transport-utils";
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
    expect(formatEtaMinutes(0)).toBe("Arriving now");
    expect(formatEtaMinutes(1)).toBe("1 min");
    expect(formatEtaMinutes(12)).toBe("12 mins");
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
});
