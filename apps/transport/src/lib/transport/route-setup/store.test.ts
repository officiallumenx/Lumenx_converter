import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-sync", () => ({
  syncStopAndEnrollmentsToApi: vi.fn(async () => ({
    apiStopId: null,
    syncedEnrollmentIds: [],
  })),
}));

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
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

describe("route setup API memory store", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  async function scopedStore() {
    const mod = await import("./store");
    mod.resetRouteSetupStore();
    mod.setRouteSetupDriverScope(TEST_SCOPE);
    return mod;
  }

  it("creates stops and assignments as pending in memory", async () => {
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
  });

  it("API hydrate is SoT and keeps only unsynced local pending", async () => {
    const { upsertRouteSetupStop, applyApiApprovedHydration, getRouteSetupSnapshot } =
      await scopedStore();

    upsertRouteSetupStop(
      {
        name: "Local Only",
        latitude: 1,
        longitude: 2,
        studentIds: ["STU-LOCAL"],
      },
      "drv-1",
    );
    const localId = getRouteSetupSnapshot().stops[0]!.id;

    applyApiApprovedHydration({
      lockedByAdmin: false,
      stops: [
        {
          id: "api-stop-1",
          name: "API Gate",
          locationLabel: "Gate",
          latitude: 3,
          longitude: 4,
          routeOrder: 0,
          approvalStatus: "pending",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      students: [
        {
          enrollmentId: "enr-1",
          studentId: "STU-API",
          studentName: "Api Student",
          classLabel: "5A",
          pickupStopId: "api-stop-1",
          approvalStatus: "pending",
        },
      ],
    });

    const snap = getRouteSetupSnapshot();
    expect(snap.stops.some((s) => s.id === "api-stop-1")).toBe(true);
    expect(snap.stops.some((s) => s.id === localId)).toBe(true);
    expect(snap.assignments.some((a) => a.studentId === "STU-API")).toBe(true);
  });

  it("removes pending assignments", async () => {
    const { upsertRouteSetupStop, removePendingAssignment, getRouteSetupSnapshot } =
      await scopedStore();

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
});
