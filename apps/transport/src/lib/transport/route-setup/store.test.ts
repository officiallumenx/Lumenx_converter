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

    await upsertRouteSetupStop(
      {
        name: "Lakeview Gate",
        locationLabel: "Lakeview Apartments",
        latitude: 28.1,
        longitude: 77.2,
        notificationRadiusM: 100,
        studentIds: ["STU-1"],
      },
      "drv-1",
    );

    const snapshot = getRouteSetupSnapshot();
    expect(snapshot.stops).toHaveLength(1);
    expect(snapshot.stops[0]?.status).toBe("pending");
    expect(snapshot.stops[0]?.notificationRadiusM).toBe(100);
    expect(snapshot.assignments).toHaveLength(1);
  });

  it("API hydrate is SoT and keeps only unsynced local pending", async () => {
    const { upsertRouteSetupStop, applyApiApprovedHydration, getRouteSetupSnapshot } =
      await scopedStore();

    await upsertRouteSetupStop(
      {
        name: "Local Only",
        latitude: 1,
        longitude: 2,
        notificationRadiusM: 50,
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
          notificationRadiusM: 100,
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
    expect(snap.stops.find((s) => s.id === "api-stop-1")?.notificationRadiusM).toBe(100);
    expect(snap.stops.some((s) => s.id === localId)).toBe(true);
    expect(snap.stops.find((s) => s.id === localId)?.notificationRadiusM).toBe(50);
    expect(snap.assignments.some((a) => a.studentId === "STU-API")).toBe(true);
  });

  it("keeps enrolled students with null pickup visible as Stop not assigned", async () => {
    const { applyApiApprovedHydration, getRouteSetupSnapshot, studentIdsAssignedElsewhere } =
      await scopedStore();

    applyApiApprovedHydration({
      lockedByAdmin: false,
      stops: [
        {
          id: "api-stop-1",
          name: "Tanuku",
          locationLabel: "Tanuku",
          latitude: 16.9,
          longitude: 81.7,
          routeOrder: 1,
          approvalStatus: "approved",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "waypoint",
          notificationRadiusM: 50,
        },
      ],
      students: [
        {
          enrollmentId: "enr-assigned",
          studentId: "STU-ASSIGNED",
          studentName: "Assigned Kid",
          classLabel: "8A",
          pickupStopId: "api-stop-1",
          dropStopId: "api-stop-1",
          approvalStatus: "approved",
        },
        {
          enrollmentId: "enr-null",
          studentId: "STU-NULL",
          studentName: "Loki",
          classLabel: "8A",
          pickupStopId: "",
          dropStopId: "",
          approvalStatus: "approved",
        },
        {
          enrollmentId: "enr-orphan",
          studentId: "STU-ORPHAN",
          studentName: "Orphan Kid",
          classLabel: "8A",
          pickupStopId: "deleted-stop-id",
          dropStopId: "deleted-stop-id",
          approvalStatus: "approved",
        },
      ],
    });

    const snap = getRouteSetupSnapshot();
    const assigned = snap.assignments.find((a) => a.studentId === "STU-ASSIGNED");
    const unassigned = snap.assignments.find((a) => a.studentId === "STU-NULL");
    const orphan = snap.assignments.find((a) => a.studentId === "STU-ORPHAN");

    expect(assigned?.stopId).toBe("api-stop-1");
    expect(assigned?.stopName).toBe("Tanuku");

    expect(unassigned).toBeTruthy();
    expect(unassigned?.stopId).toBeNull();
    expect(unassigned?.stopName).toBe("Stop not assigned");
    expect(unassigned?.dropStopName).toBe("Drop stop not assigned");

    expect(orphan).toBeTruthy();
    expect(orphan?.stopId).toBeNull();
    expect(orphan?.stopName).toBe("Stop not assigned");

    // Unassigned students stay selectable in the stop picker.
    expect(studentIdsAssignedElsewhere().has("STU-NULL")).toBe(false);
    expect(studentIdsAssignedElsewhere().has("STU-ASSIGNED")).toBe(true);
  });

  it("surfaces sync failures to the caller", async () => {
    const sync = vi.fn(async () => {
      throw new Error("sync failed");
    });
    vi.doMock("./api-sync", () => ({
      syncStopAndEnrollmentsToApi: sync,
    }));
    const { upsertRouteSetupStop, resetRouteSetupStore, setRouteSetupDriverScope } =
      await import("./store");
    resetRouteSetupStore();
    setRouteSetupDriverScope(TEST_SCOPE);

    await expect(
      upsertRouteSetupStop(
        {
          name: "Fail Stop",
          latitude: 1,
          longitude: 2,
          notificationRadiusM: 150,
          studentIds: ["STU-1"],
        },
        "drv-1",
      ),
    ).rejects.toThrow("sync failed");
  });
});
