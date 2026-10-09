import { describe, expect, it } from "vitest";
import { deriveParentTransportStatus, type DeriveParentStatusInput } from "./parent-status";
import { trackingStatusLabel } from "../transport-utils";
import type { TransportTracking } from "./types";

function base(overrides: Partial<DeriveParentStatusInput> = {}): DeriveParentStatusInput {
  return {
    notRidingToday: false,
    tripPhase: "running",
    tripFinalized: false,
    schoolArrivedAt: null,
    boardingStatus: "pending",
    droppingStatus: "pending",
    approachBand: null,
    withinRadius: false,
    hasLiveGps: true,
    gpsFreshness: "live",
    emergencyActive: false,
    ...overrides,
  };
}

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

/** Picked-up / boarded must never be inferred from trip phase or school arrival alone. */
function isPickedUpLabel(status: string): boolean {
  return status === "Picked up" || status === "Boarding";
}

describe("deriveParentTransportStatus", () => {
  it("prefers not riding and emergency", () => {
    expect(deriveParentTransportStatus(base({ notRidingToday: true }))).toBe("not_riding");
    expect(deriveParentTransportStatus(base({ emergencyActive: true }))).toBe("emergency");
  });

  it("does not invent live when GPS is missing", () => {
    expect(
      deriveParentTransportStatus(
        base({ hasLiveGps: false, gpsFreshness: "offline", boardingStatus: "pending" }),
      ),
    ).toBe("location_unavailable");
  });

  it("maps arrival when unmarked student is within stop radius", () => {
    expect(
      deriveParentTransportStatus(
        base({ withinRadius: true, approachBand: 5, boardingStatus: "pending" }),
      ),
    ).toBe("arrived");
  });

  it("maps boarded learner to boarding / at_school / dropping", () => {
    expect(
      deriveParentTransportStatus(
        base({ tripPhase: "boarding", boardingStatus: "boarded" }),
      ),
    ).toBe("boarding");

    expect(
      deriveParentTransportStatus(
        base({
          tripPhase: "running",
          boardingStatus: "boarded",
          schoolArrivedAt: "2026-10-05T03:00:00.000Z",
        }),
      ),
    ).toBe("at_school");

    expect(
      deriveParentTransportStatus(
        base({
          tripPhase: "dropping",
          boardingStatus: "boarded",
          schoolArrivedAt: "2026-10-05T03:00:00.000Z",
        }),
      ),
    ).toBe("dropping");
  });

  it("shows driver not started when no active trip", () => {
    expect(
      deriveParentTransportStatus(
        base({ tripPhase: null, hasLiveGps: false, gpsFreshness: null, boardingStatus: null }),
      ),
    ).toBe("driver_not_started");
  });

  it("maps ready trip to scheduled", () => {
    expect(
      deriveParentTransportStatus(
        base({ tripPhase: "ready", hasLiveGps: false, gpsFreshness: null, boardingStatus: null }),
      ),
    ).toBe("scheduled");
  });
});

describe("Phase A — boarding record is authoritative (regression)", () => {
  it("1. trip started + student unmarked → NOT picked up", () => {
    const parent = deriveParentTransportStatus(
      base({ tripPhase: "running", boardingStatus: "pending" }),
    );
    expect(parent).toBe("trip_started");
    expect(parent).not.toBe("boarding");
    expect(parent).not.toBe("at_school");

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: "pending",
        learnerStatus: "awaiting_pickup",
        sharedTripActive: true,
      }),
    );
    expect(isPickedUpLabel(label)).toBe(false);
  });

  it("2. bus reaches school + student unmarked → NOT picked up", () => {
    const parent = deriveParentTransportStatus(
      base({
        tripPhase: "boarding",
        schoolArrivedAt: "2026-10-05T03:00:00.000Z",
        boardingStatus: "pending",
      }),
    );
    expect(parent).not.toBe("boarding");
    expect(parent).not.toBe("at_school");
    expect(["trip_started", "location_unavailable", "arrived", "approaching"]).toContain(parent);

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: "pending",
        learnerStatus: "awaiting_pickup",
        sharedTripActive: true,
      }),
    );
    expect(isPickedUpLabel(label)).toBe(false);
    expect(label).not.toBe("At school");
  });

  it("3. trip phase = boarding + student unmarked → NOT picked up", () => {
    const parent = deriveParentTransportStatus(
      base({ tripPhase: "boarding", boardingStatus: null }),
    );
    expect(parent).toBe("trip_started");
    expect(parent).not.toBe("boarding");

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: null,
        learnerStatus: "awaiting_pickup",
      }),
    );
    expect(isPickedUpLabel(label)).toBe(false);
  });

  it("4. boarding event = boarded → PICKED UP", () => {
    const parent = deriveParentTransportStatus(
      base({ tripPhase: "running", boardingStatus: "boarded" }),
    );
    expect(parent).toBe("boarding");

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: "boarded",
        learnerStatus: "picked_up",
      }),
    );
    expect(label).toBe("Picked up");
  });

  it("5. boarding event = not_boarded → NOT BOARDED", () => {
    const parent = deriveParentTransportStatus(
      base({
        tripPhase: "boarding",
        schoolArrivedAt: "2026-10-05T03:00:00.000Z",
        boardingStatus: "not_boarded",
      }),
    );
    expect(parent).not.toBe("boarding");
    expect(parent).not.toBe("at_school");

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: "not_boarded",
        learnerStatus: "awaiting_pickup",
      }),
    );
    expect(label).toBe("Not boarded");
    expect(isPickedUpLabel(label)).toBe(false);
  });

  it("6. boarding event = dropped → appropriate dropped state", () => {
    const parent = deriveParentTransportStatus(
      base({
        tripPhase: "dropping",
        boardingStatus: "boarded",
        droppingStatus: "dropped",
        schoolArrivedAt: "2026-10-05T03:00:00.000Z",
      }),
    );
    expect(parent).toBe("completed");

    const label = trackingStatusLabel(
      tracking({
        parentStatus: parent,
        boardingStatus: "boarded",
        droppingStatus: "dropped",
        learnerStatus: "reached_school",
        runStatus: "completed",
      }),
    );
    expect(label).toBe("Reached school");
  });

  it("7. one student boarded, another unmarked — independent learner state", () => {
    const studentA = deriveParentTransportStatus(
      base({ tripPhase: "boarding", boardingStatus: "boarded" }),
    );
    const studentB = deriveParentTransportStatus(
      base({ tripPhase: "boarding", boardingStatus: "pending" }),
    );

    expect(studentA).toBe("boarding");
    expect(studentB).toBe("trip_started");
    expect(studentB).not.toBe(studentA);

    expect(
      trackingStatusLabel(
        tracking({
          parentStatus: studentA,
          boardingStatus: "boarded",
          learnerStatus: "picked_up",
        }),
      ),
    ).toBe("Picked up");

    expect(
      isPickedUpLabel(
        trackingStatusLabel(
          tracking({
            parentStatus: studentB,
            boardingStatus: "pending",
            learnerStatus: "awaiting_pickup",
          }),
        ),
      ),
    ).toBe(false);
  });

  it("school arrival alone never maps unmarked learner to at_school", () => {
    expect(
      deriveParentTransportStatus(
        base({
          tripPhase: "running",
          schoolArrivedAt: "2026-10-05T03:00:00.000Z",
          boardingStatus: "pending",
        }),
      ),
    ).toBe("trip_started");
  });
});
