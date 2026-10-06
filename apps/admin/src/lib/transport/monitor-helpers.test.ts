import { describe, expect, it } from "vitest";
import {
  filterMonitorTrips,
  formatTimelineClock,
  isTripActive,
  isTripDelayed,
  isTripGpsStale,
  searchMonitorTrips,
  sortTimelineChronological,
  tripHasOpenEmergency,
} from "./monitor-helpers";
import type { TransportEmergencyDto, TransportTripDto } from "./types";

function trip(partial: Partial<TransportTripDto>): TransportTripDto {
  return {
    id: "t1",
    instituteId: "i1",
    routeId: "r1",
    vehicleId: "v1",
    driverId: "d1",
    slot: "morning",
    tripDate: "2026-10-06",
    phase: "running",
    startedAt: "2026-10-06T02:30:00.000Z",
    completedAt: null,
    currentStopId: null,
    currentStopIndex: 0,
    finalized: false,
    routeName: "North Route",
    vehicleNumber: "BUS-1",
    driverName: "Ravi",
    createdAt: "2026-10-06T02:30:00.000Z",
    updatedAt: "2026-10-06T02:30:00.000Z",
    ...partial,
  };
}

describe("monitor-helpers", () => {
  it("classifies active / delayed / stale", () => {
    const active = trip({});
    expect(isTripActive(active)).toBe(true);
    expect(isTripDelayed(active)).toBe(false);
    expect(
      isTripDelayed(
        trip({
          timeline: [
            {
              id: "e1",
              at: "2026-10-06T03:00:00.000Z",
              kind: "TRIP_DELAYED",
              label: "Delayed",
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      isTripGpsStale(
        trip({
          gpsFreshness: "stale",
          latestLocation: {
            id: "l1",
            latitude: 12,
            longitude: 77,
            accuracyM: null,
            capturedAt: new Date(Date.now() - 6 * 60_000).toISOString(),
          },
        }),
      ),
    ).toBe(true);
  });

  it("filters and searches without inventing trips", () => {
    const trips = [
      trip({ id: "a", phase: "running", vehicleNumber: "BUS-1" }),
      trip({
        id: "b",
        phase: "completed",
        finalized: true,
        vehicleNumber: "BUS-2",
        driverName: "Sita",
      }),
      trip({
        id: "c",
        phase: "running",
        isDelayed: true,
        vehicleNumber: "BUS-3",
        routeName: "East",
      }),
    ];
    expect(filterMonitorTrips(trips, "active")).toHaveLength(2);
    expect(filterMonitorTrips(trips, "completed")).toHaveLength(1);
    expect(filterMonitorTrips(trips, "delayed").map((t) => t.id)).toEqual(["c"]);
    expect(searchMonitorTrips(trips, "sita").map((t) => t.id)).toEqual(["b"]);
    expect(searchMonitorTrips(trips, "east").map((t) => t.id)).toEqual(["c"]);
  });

  it("matches emergencies by trip or vehicle", () => {
    const t = trip({ id: "trip-1", vehicleId: "veh-9" });
    const emergencies: TransportEmergencyDto[] = [
      {
        id: "sos-1",
        instituteId: "i1",
        tripId: null,
        driverId: "d1",
        vehicleId: "veh-9",
        emergencyType: "breakdown",
        status: "active",
        latitude: null,
        longitude: null,
        note: null,
        acknowledgedAt: null,
        resolvedAt: null,
        resolveNote: null,
        timeline: [],
        createdAt: "2026-10-06T03:00:00.000Z",
        updatedAt: "2026-10-06T03:00:00.000Z",
      },
    ];
    expect(tripHasOpenEmergency(t, emergencies)).toBe(true);
    expect(filterMonitorTrips([t], "emergency", emergencies)).toHaveLength(1);
  });

  it("sorts timeline chronologically and formats clock", () => {
    const sorted = sortTimelineChronological([
      { id: "2", at: "2026-10-06T03:10:00.000Z", label: "Stop 1" },
      { id: "1", at: "2026-10-06T03:00:00.000Z", label: "Started" },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["1", "2"]);
    expect(formatTimelineClock("2026-10-06T03:00:00.000Z")).toMatch(/\d{2}:\d{2}/);
  });
});
