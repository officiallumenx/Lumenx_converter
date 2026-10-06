import { beforeEach, describe, expect, it, vi } from "vitest";

const submitTransportStop = vi.fn();
const updateTransportStop = vi.fn();
const submitTransportEnrollment = vi.fn();
const updateTransportEnrollment = vi.fn();
const listTransportStops = vi.fn();
const listApiEnrollmentsForVehicle = vi.fn();

vi.mock("@/lib/transport-api", () => ({
  getDriverRouteRoster: vi.fn(),
  listTransportStops: (...args: unknown[]) => listTransportStops(...args),
  submitTransportStop: (...args: unknown[]) => submitTransportStop(...args),
  updateTransportStop: (...args: unknown[]) => updateTransportStop(...args),
  submitTransportEnrollment: (...args: unknown[]) => submitTransportEnrollment(...args),
  updateTransportEnrollment: (...args: unknown[]) => updateTransportEnrollment(...args),
}));

vi.mock("../api-roster", () => ({
  listApiEnrollmentsForVehicle: (...args: unknown[]) => listApiEnrollmentsForVehicle(...args),
  setApiDriverRoster: vi.fn(),
  listApprovedAttendanceRosterStudents: vi.fn(() => []),
}));

vi.mock("./store", () => ({
  applyApiApprovedHydration: vi.fn(),
}));

const SCOPE = {
  routeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  routeCode: "NCL",
  routeName: "North",
  vehicleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  vehicleNumber: "BUS-01",
  driverId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  driverName: "Driver",
  driverPhone: "1",
  employeeId: "E1",
  licenseNumber: "DL",
  instituteId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};

const STOP = {
  id: "local-stop",
  name: "Gate",
  locationLabel: "Main",
  latitude: 12.9,
  longitude: 77.5,
  notificationRadiusM: 100,
  timestampCreated: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  submittedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "drv",
  studentIds: ["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"],
  routeOrder: 1,
  status: "pending" as const,
};

describe("syncStopAndEnrollmentsToApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTransportStops.mockResolvedValue([]);
    listApiEnrollmentsForVehicle.mockReturnValue([]);
  });

  it("PATCHes existing enrollment instead of POSTing", async () => {
    const enrollmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const studentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const apiStopId = "11111111-1111-4111-8111-111111111111";
    const schoolStopId = "22222222-2222-4222-8222-222222222222";
    listApiEnrollmentsForVehicle.mockReturnValue([
      { id: enrollmentId, studentId, stopId: null },
    ]);
    listTransportStops.mockResolvedValue([
      { id: schoolStopId, kind: "school", routeOrder: 10000 },
    ]);
    submitTransportStop.mockResolvedValue({ id: apiStopId });
    updateTransportEnrollment.mockResolvedValue({ id: enrollmentId });

    const { syncStopAndEnrollmentsToApi } = await import("./api-sync");
    const assignment = {
      id: "asn-1",
      studentId,
      studentName: "Kid",
      studentClass: "5A",
      stopId: STOP.id,
      stopName: STOP.name,
      status: "pending" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const result = await syncStopAndEnrollmentsToApi(SCOPE, STOP, [assignment]);

    expect(submitTransportEnrollment).not.toHaveBeenCalled();
    expect(updateTransportEnrollment).toHaveBeenCalledWith(enrollmentId, {
      pickupStopId: apiStopId,
      dropStopId: schoolStopId,
    });
    expect(result.syncedEnrollmentIds).toEqual(["asn-1"]);
    expect(assignment.apiEnrollmentId).toBe(enrollmentId);
  });

  it("PATCHes existing apiStopId instead of skipping", async () => {
    const apiStopId = "11111111-1111-4111-8111-111111111111";
    updateTransportStop.mockResolvedValue({ id: apiStopId });

    const { syncStopAndEnrollmentsToApi } = await import("./api-sync");
    const stop = { ...STOP, apiStopId };
    await syncStopAndEnrollmentsToApi(SCOPE, stop, []);

    expect(submitTransportStop).not.toHaveBeenCalled();
    expect(updateTransportStop).toHaveBeenCalledWith(apiStopId, {
      name: stop.name,
      locationLabel: stop.locationLabel,
      latitude: stop.latitude,
      longitude: stop.longitude,
      routeOrder: 0,
      notificationRadiusM: 100,
    });
  });

  it("parking GPS refresh PATCHes only lat/lng", async () => {
    const parkingId = "33333333-3333-4333-8333-333333333333";
    listTransportStops.mockResolvedValue([
      {
        id: parkingId,
        kind: "parking",
        name: "Bus park",
        notificationRadiusM: 220,
        latitude: 12.95,
        longitude: 77.55,
      },
    ]);
    updateTransportStop.mockResolvedValue({
      id: parkingId,
      notificationRadiusM: 220,
      latitude: 12.951,
      longitude: 77.551,
    });

    const { syncParkingStopToApi } = await import("./api-sync");
    await syncParkingStopToApi(SCOPE, {
      latitude: 12.951,
      longitude: 77.551,
      accuracyM: 8,
    });

    expect(submitTransportStop).not.toHaveBeenCalled();
    expect(updateTransportStop).toHaveBeenCalledWith(parkingId, {
      latitude: 12.951,
      longitude: 77.551,
    });
  });

  it("surfaces enrollment sync failures", async () => {
    const studentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const apiStopId = "11111111-1111-4111-8111-111111111111";
    submitTransportStop.mockResolvedValue({ id: apiStopId });
    submitTransportEnrollment.mockRejectedValue(new Error("duplicate enrollment"));

    const { syncStopAndEnrollmentsToApi } = await import("./api-sync");
    await expect(
      syncStopAndEnrollmentsToApi(SCOPE, STOP, [
        {
          id: "asn-1",
          studentId,
          studentName: "Kid",
          studentClass: "5A",
          stopId: STOP.id,
          stopName: STOP.name,
          status: "pending",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    ).rejects.toThrow("duplicate enrollment");
  });
});
