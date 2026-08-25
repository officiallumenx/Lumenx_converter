import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.mock("@lumenx/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/utils")>();
  return {
    ...actual,
    loadTransportOps: () => ({
      enrollments: [
        {
          id: "enr-1",
          studentId: "STU-1",
          studentName: "Aarav",
          studentClass: "10-A",
          vehicleId: "VH-01",
          vehicleNumber: "BUS-01",
          routeId: "RT-01",
          stopId: null,
          stopName: null,
          latitude: null,
          longitude: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      driverStopsByRoute: {},
      routeLocksByRoute: {},
      driverAccounts: [],
    }),
    enrollmentsForVehicle: (vehicleId: string) =>
      vehicleId === "VH-01"
        ? [
            {
              id: "enr-1",
              studentId: "STU-1",
              studentName: "Aarav",
              studentClass: "10-A",
              vehicleId: "VH-01",
              vehicleNumber: "BUS-01",
              routeId: "RT-01",
              stopId: null,
              stopName: null,
              latitude: null,
              longitude: null,
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ]
        : [],
    syncDriverStopAssignment: vi.fn(),
    recordLocalChangeForSync: vi.fn(),
  };
});

const TEST_SCOPE = {
  routeId: "RT-01",
  routeCode: "NCL",
  routeName: "North Campus Loop",
  vehicleId: "VH-01",
  vehicleNumber: "BUS-01",
  driverId: "drv-1",
  driverName: "Driver One",
  driverPhone: "+91 98765 43210",
  employeeId: "DRV-1",
  licenseNumber: "DL-1",
};

describe("route setup pending workflow", () => {
  beforeEach(async () => {
    store.clear();
    vi.resetModules();
  });

  async function scopedStore() {
    const mod = await import("./store");
    mod.setRouteSetupDriverScope(TEST_SCOPE);
    return mod;
  }

  it("creates stops and assignments as pending", async () => {
    const { upsertRouteSetupStop, getRouteSetupSnapshot } = await scopedStore();

    upsertRouteSetupStop(
      {
        name: "Lakeview Gate",
        locationLabel: "Lakeview Apartments",
        latitude: 28.1,
        longitude: 77.2,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );

    const snapshot = getRouteSetupSnapshot();
    expect(snapshot.stops).toHaveLength(1);
    expect(snapshot.stops[0]?.status).toBe("pending");
    expect(snapshot.assignments).toHaveLength(1);
    expect(snapshot.assignments[0]?.status).toBe("pending");
    expect(snapshot.assignments[0]?.stopName).toBe("Lakeview Gate");
  });

  it("allows editing pending stops only", async () => {
    const {
      upsertRouteSetupStop,
      getRouteSetupSnapshot,
      deleteRouteSetupStop,
    } = await scopedStore();

    upsertRouteSetupStop(
      {
        name: "Gate A",
        locationLabel: "Gate A road",
        latitude: 1,
        longitude: 2,
        studentIds: [],
      },
      "drv-1",
    );
    const stopId = getRouteSetupSnapshot().stops[0]!.id;

    upsertRouteSetupStop(
      {
        id: stopId,
        name: "Gate A Updated",
        locationLabel: "Updated address",
        latitude: 1.1,
        longitude: 2.2,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );

    expect(getRouteSetupSnapshot().stops[0]?.name).toBe("Gate A Updated");
    expect(getRouteSetupSnapshot().assignments[0]?.studentId).toBe("STU-1");

    getRouteSetupSnapshot().stops[0]!.status = "approved";
    deleteRouteSetupStop(stopId);
    expect(getRouteSetupSnapshot().stops).toHaveLength(1);
  });

  it("removes pending assignments", async () => {
    const {
      upsertRouteSetupStop,
      removePendingAssignment,
      getRouteSetupSnapshot,
    } = await scopedStore();

    upsertRouteSetupStop(
      {
        name: "Stop 1",
        latitude: 1,
        longitude: 2,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );
    const assignmentId = getRouteSetupSnapshot().assignments[0]!.id;
    removePendingAssignment(assignmentId);
    expect(getRouteSetupSnapshot().assignments).toHaveLength(0);
    expect(getRouteSetupSnapshot().stops[0]?.studentIds).toHaveLength(0);
  });

  it("approve → active; decline → reason; resubmit → pending; request change", async () => {
    const {
      upsertRouteSetupStop,
      getRouteSetupSnapshot,
      applyAdminApproveStop,
      applyAdminDeclineStop,
      setRouteSetupAdminLock,
    } = await scopedStore();

    upsertRouteSetupStop(
      {
        name: "Gate B",
        locationLabel: "Gate B road",
        latitude: 2,
        longitude: 3,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );
    const stopId = getRouteSetupSnapshot().stops[0]!.id;
    expect(getRouteSetupSnapshot().stops[0]?.status).toBe("pending");

    applyAdminApproveStop(stopId);
    expect(getRouteSetupSnapshot().stops[0]?.status).toBe("approved");
    expect(getRouteSetupSnapshot().assignments[0]?.status).toBe("approved");

    // Request change creates a pending CR without mutating approved stop
    upsertRouteSetupStop(
      {
        id: stopId,
        name: "Gate B Revised",
        locationLabel: "New label",
        latitude: 2.1,
        longitude: 3.1,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );
    const afterCr = getRouteSetupSnapshot();
    const approved = afterCr.stops.find((s) => s.id === stopId);
    const changeReq = afterCr.stops.find((s) => s.replacesStopId === stopId);
    expect(approved?.status).toBe("approved");
    expect(approved?.name).toBe("Gate B");
    expect(changeReq?.status).toBe("pending");
    expect(changeReq?.name).toBe("Gate B Revised");

    applyAdminDeclineStop(changeReq!.id, "GPS looks wrong");
    expect(getRouteSetupSnapshot().stops.find((s) => s.id === changeReq!.id)?.status).toBe(
      "rejected",
    );
    expect(getRouteSetupSnapshot().stops.find((s) => s.id === changeReq!.id)?.rejectionReason).toBe(
      "GPS looks wrong",
    );

    // Resubmit declined CR
    upsertRouteSetupStop(
      {
        id: changeReq!.id,
        name: "Gate B Fixed",
        locationLabel: "Fixed",
        latitude: 2.2,
        longitude: 3.2,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );
    const resubmitted = getRouteSetupSnapshot().stops.find((s) => s.id === changeReq!.id);
    expect(resubmitted?.status).toBe("pending");
    expect(resubmitted?.rejectionReason).toBeUndefined();
    expect(resubmitted?.name).toBe("Gate B Fixed");

    // Lock blocks new stops
    setRouteSetupAdminLock(true);
    const before = getRouteSetupSnapshot().stops.length;
    upsertRouteSetupStop(
      { name: "Blocked", latitude: 1, longitude: 1, studentIds: [] },
      "drv-1",
    );
    expect(getRouteSetupSnapshot().stops.length).toBe(before);
  });

  it("blocks duplicate stop name on the same route", async () => {
    const { upsertRouteSetupStop } = await scopedStore();
    upsertRouteSetupStop(
      {
        name: "Main Gate",
        latitude: 10,
        longitude: 20,
        studentIds: [],
      },
      "drv-1",
    );
    expect(() =>
      upsertRouteSetupStop(
        {
          name: "main gate",
          latitude: 11,
          longitude: 21,
          studentIds: [],
        },
        "drv-1",
      ),
    ).toThrow(/already exists/i);
  });
});
