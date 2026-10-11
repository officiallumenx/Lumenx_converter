import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

vi.stubGlobal("window", {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

const INSTITUTE = "107dc3de-2d23-4400-aef4-f22fc9dd179d";
const VEHICLE = "6058e78e-8a95-488d-8b41-d189c2399149";
const ROUTE = "fdb2dcd1-0db6-4421-b5ff-3c695cd23584";
const DRIVER = "745cbc31-d53c-45d9-b59e-bbf0d41018fd";

const listTransportTrips = vi.fn();
const getActiveTripForVehicle = vi.fn();
const endTransportTrip = vi.fn();
const flushOpsOutbox = vi.fn();
const isOpsOutboxOnline = vi.fn(() => true);

vi.mock("@/lib/transport-api", () => ({
  listTransportTrips: (...args: unknown[]) => listTransportTrips(...args),
  getActiveTripForVehicle: (...args: unknown[]) => getActiveTripForVehicle(...args),
  endTransportTrip: (...args: unknown[]) => endTransportTrip(...args),
  startTransportTrip: vi.fn(),
  updateTransportTripPhase: vi.fn(),
  listTripBoardingEvents: vi.fn(),
  markTripBoarding: vi.fn(),
  markTripDropping: vi.fn(),
}));

vi.mock("../ops-outbox", () => ({
  enqueueOpsEvent: vi.fn(),
  flushOpsOutbox: (...args: unknown[]) => flushOpsOutbox(...args),
  isOpsOutboxOnline: () => isOpsOutboxOnline(),
}));

function tripDto(
  overrides: Partial<{
    id: string;
    slot: "morning" | "evening";
    phase: string;
    finalized: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? "trip-1",
    instituteId: INSTITUTE,
    routeId: ROUTE,
    vehicleId: VEHICLE,
    driverId: DRIVER,
    slot: overrides.slot ?? "morning",
    tripDate: "2026-10-10",
    phase: overrides.phase ?? "completed",
    startedAt: "2026-10-10T02:00:00.000Z",
    completedAt: "2026-10-10T03:00:00.000Z",
    currentStopId: null,
    currentStopIndex: 0,
    finalized: overrides.finalized ?? true,
  };
}

describe("hydrateActiveTripFromApi day-state", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
    listTransportTrips.mockReset();
    getActiveTripForVehicle.mockReset();
    endTransportTrip.mockReset();
    flushOpsOutbox.mockReset();
    isOpsOutboxOnline.mockReturnValue(true);
  });

  async function seedScope() {
    const {
      setRouteSetupDriverScope,
      applyApiApprovedHydration,
      resetRouteSetupStore,
    } = await import("../route-setup/store");
    resetRouteSetupStore();
    setRouteSetupDriverScope({
      routeId: ROUTE,
      routeCode: "BUS",
      routeName: "bus-01 route",
      vehicleId: VEHICLE,
      vehicleNumber: "bus-01",
      driverId: DRIVER,
      driverName: "srinu",
      driverPhone: "9182670362",
      employeeId: "EMP-1",
      licenseNumber: "LIC-1",
      instituteId: INSTITUTE,
      timezone: "Asia/Kolkata",
    });
    applyApiApprovedHydration({
      lockedByAdmin: true,
      stops: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          name: "Gate",
          locationLabel: "Gate",
          latitude: 17.4,
          longitude: 78.4,
          routeOrder: 0,
          notificationRadiusM: 80,
          kind: "waypoint",
          approvalStatus: "approved",
        },
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
          name: "School",
          locationLabel: "School",
          latitude: 17.41,
          longitude: 78.41,
          routeOrder: 1,
          notificationRadiusM: 80,
          kind: "school",
          approvalStatus: "approved",
        },
      ],
      students: [
        {
          studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
          studentName: "loki vella",
          classLabel: "10-A",
          rollNo: "1",
          pickupStopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          dropStopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          approvalStatus: "approved",
        },
      ],
    });
    const { setApiDriverRoster } = await import("../api-roster");
    setApiDriverRoster(
      {
        routeId: ROUTE,
        routeName: "bus-01 route",
        vehicleId: VEHICLE,
        locked: true,
        expectedCount: 1,
        notRidingCount: 0,
        expectedOnboardCount: 1,
        stops: [],
        students: [
          {
            enrollmentId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
            studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
            studentName: "loki vella",
            classLabel: "10-A",
            rollNo: "1",
            pickupStopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            pickupStopName: "Gate",
            dropStopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            dropStopName: "Gate",
            approvalStatus: "approved",
            notRidingToday: false,
            rideExceptionId: null,
          },
        ],
      },
      { vehicleId: VEHICLE, vehicleNumber: "bus-01" },
    );
    const { setApiAttendanceRoster } = await import("../attendance/store");
    setApiAttendanceRoster([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        name: "loki vella",
        grade: "10-A",
        stopName: "Gate",
        stopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        dropStopId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        dropStopName: "Gate",
        rollNo: "1",
      },
    ]);
  }

  it("completed Pickup only → Start Drop after hydrate (and after refresh)", async () => {
    await seedScope();
    const { setRouteHydrated, getTripSessionSnapshot, beginStartTripSession } =
      await import("./store");
    const { hydrateActiveTripFromApi } = await import("./api-ops");
    const { defaultAttendanceTabForSlot } = await import("../attendance/drop-stop");

    getActiveTripForVehicle.mockResolvedValue(null);
    listTransportTrips.mockResolvedValue([
      tripDto({ id: "morning-1", slot: "morning", phase: "completed" }),
    ]);

    setRouteHydrated(true);
    await hydrateActiveTripFromApi();

    expect(listTransportTrips).toHaveBeenCalledWith({
      instituteId: INSTITUTE,
      tripDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
    expect(getTripSessionSnapshot().eveningCompletedToday).toBe(false);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    // Refresh again — still Start Drop, not Start Pickup.
    await hydrateActiveTripFromApi();
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    const blockedPickup = beginStartTripSession("morning");
    expect(blockedPickup.ok).toBe(false);
    expect(blockedPickup.reason).toMatch(/Pickup is already completed/i);

    const dropStart = beginStartTripSession("evening");
    if (!dropStart.ok) {
      throw new Error(`Drop start blocked: ${dropStart.reason}`);
    }
    expect(defaultAttendanceTabForSlot("evening")).toBe("dropping");
  });

  it("both slots completed → day_complete only (not Start Pickup)", async () => {
    await seedScope();
    const { setRouteHydrated, getTripSessionSnapshot, beginStartTripSession } =
      await import("./store");
    const { hydrateActiveTripFromApi } = await import("./api-ops");

    getActiveTripForVehicle.mockResolvedValue(null);
    listTransportTrips.mockResolvedValue([
      tripDto({ id: "morning-1", slot: "morning" }),
      tripDto({ id: "evening-1", slot: "evening" }),
    ]);

    setRouteHydrated(true);
    await hydrateActiveTripFromApi();

    expect(getTripSessionSnapshot().homeAction).toBe("day_complete");
    expect(beginStartTripSession("morning").ok).toBe(false);
    expect(beginStartTripSession("evening").ok).toBe(false);
  });

  it("restores active Drop trip after relaunch", async () => {
    await seedScope();
    const { setRouteHydrated, getTripSessionSnapshot } = await import("./store");
    const { hydrateActiveTripFromApi } = await import("./api-ops");
    const { defaultAttendanceTabForSlot } = await import("../attendance/drop-stop");

    getActiveTripForVehicle.mockResolvedValue({
      ...tripDto({
        id: "evening-active",
        slot: "evening",
        phase: "boarding",
        finalized: false,
      }),
      completedAt: null,
    });
    listTransportTrips.mockResolvedValue([
      tripDto({ id: "morning-1", slot: "morning" }),
      tripDto({
        id: "evening-active",
        slot: "evening",
        phase: "boarding",
        finalized: false,
      }),
    ]);

    setRouteHydrated(true);
    await hydrateActiveTripFromApi();

    expect(getTripSessionSnapshot().homeAction).toBe("continue_drop");
    expect(getTripSessionSnapshot().slot).toBe("evening");
    expect(getTripSessionSnapshot().tripId).toBe("evening-active");
    expect(defaultAttendanceTabForSlot(getTripSessionSnapshot().slot)).toBe(
      "dropping",
    );
  });

  it("endTrip awaits hydrate so Drop is available from API result", async () => {
    await seedScope();
    const { setRouteHydrated, syncTripFromApiDto, getTripSessionSnapshot } =
      await import("./store");
    const { endTripViaApi } = await import("./api-ops");

    syncTripFromApiDto({
      id: "morning-live",
      phase: "boarding",
      startedAt: "2026-10-10T02:00:00.000Z",
      completedAt: null,
      vehicleId: VEHICLE,
      routeId: ROUTE,
      currentStopIndex: 0,
      slot: "morning",
    });
    setRouteHydrated(true);

    getActiveTripForVehicle
      .mockResolvedValueOnce(
        tripDto({
          id: "morning-live",
          slot: "morning",
          phase: "boarding",
          finalized: false,
        }),
      )
      .mockResolvedValue(null);
    endTransportTrip.mockResolvedValue(
      tripDto({
        id: "morning-live",
        slot: "morning",
        phase: "completed",
        finalized: true,
      }),
    );
    listTransportTrips.mockResolvedValue([
      tripDto({ id: "morning-live", slot: "morning", phase: "completed" }),
    ]);

    const result = await endTripViaApi();
    expect(result.ok).toBe(true);
    expect(listTransportTrips).toHaveBeenCalled();
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");
  });

  it("list-trips failure does not wipe a just-synced Pickup completion", async () => {
    await seedScope();
    const { setRouteHydrated, syncTripFromApiDto, getTripSessionSnapshot } =
      await import("./store");
    const { hydrateActiveTripFromApi } = await import("./api-ops");

    syncTripFromApiDto({
      id: "morning-live",
      phase: "completed",
      startedAt: "2026-10-10T02:00:00.000Z",
      completedAt: "2026-10-10T03:00:00.000Z",
      vehicleId: VEHICLE,
      routeId: ROUTE,
      currentStopIndex: 0,
      slot: "morning",
    });
    setRouteHydrated(true);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    getActiveTripForVehicle.mockResolvedValue(null);
    listTransportTrips.mockRejectedValue(new Error("network"));

    await hydrateActiveTripFromApi();
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");
  });

  it("resolves instituteId from session when scope omits it", async () => {
    memory.set(
      "ues_transport_session",
      JSON.stringify({
        id: "u1",
        driverId: DRIVER,
        instituteId: INSTITUTE,
      }),
    );
    const { setRouteSetupDriverScope } = await import("../route-setup/store");
    setRouteSetupDriverScope({
      routeId: ROUTE,
      routeCode: "BUS",
      routeName: "bus-01 route",
      vehicleId: VEHICLE,
      vehicleNumber: "bus-01",
      driverId: DRIVER,
      driverName: "srinu",
      driverPhone: "9182670362",
      employeeId: "EMP-1",
      licenseNumber: "LIC-1",
      // instituteId intentionally omitted
      timezone: "Asia/Kolkata",
    });

    const { setRouteHydrated, getTripSessionSnapshot } = await import("./store");
    const { hydrateActiveTripFromApi } = await import("./api-ops");

    getActiveTripForVehicle.mockResolvedValue(null);
    listTransportTrips.mockResolvedValue([
      tripDto({ id: "morning-1", slot: "morning" }),
    ]);
    setRouteHydrated(true);
    await hydrateActiveTripFromApi();

    expect(listTransportTrips).toHaveBeenCalled();
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");
  });
});
