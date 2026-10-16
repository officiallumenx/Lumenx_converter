import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/transport/driver-assignment-api", () => ({
  takeLastAssignmentRoster: vi.fn(() => ({
    driverId: "d1",
    routeId: "r1",
    routeName: "Route",
    vehicleId: "v1",
    vehicleNumber: "BUS-1",
    vehicleCapacity: 40,
    routeApprovalStatus: "approved",
    locked: false,
    stops: [],
    students: [],
  })),
  loadDriverRosterForHydrate: vi.fn(async () => {
    throw new Error("should reuse assignment roster");
  }),
}));

vi.mock("@/lib/transport/route-setup/api-sync", () => ({
  hydrateRouteSetupFromApi: vi.fn(async () => undefined),
}));

vi.mock("@/lib/transport/trip/repository", () => ({
  tripRepository: {
    hydrateFromApi: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/transport/attendance/repository", () => ({
  attendanceRepository: {
    hydrateFromApi: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/transport/trip/store", () => ({
  getTripSessionSnapshot: vi.fn(() => ({ routeHydrated: false })),
  setRouteHydrated: vi.fn(),
}));

vi.mock("@/lib/transport/trip/service-date", () => ({
  resolveTransportServiceDate: vi.fn(() => "2026-10-16"),
}));

describe("hydrateDriverSessionFromAssignment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("coalesces concurrent hydrates for the same scope and reuses roster", async () => {
    const { hydrateDriverSessionFromAssignment, resetDriverSessionHydrateGate } =
      await import("./hydrate-driver-session");
    const { hydrateRouteSetupFromApi } = await import("./route-setup/api-sync");
    const { loadDriverRosterForHydrate } = await import("./driver-assignment-api");
    const { tripRepository } = await import("./trip/repository");

    resetDriverSessionHydrateGate();

    const scope = {
      routeId: "r1",
      routeCode: "ROU",
      routeName: "Route",
      vehicleId: "v1",
      vehicleNumber: "BUS-1",
      driverId: "d1",
      driverName: "Driver",
      driverPhone: "9999999999",
      employeeId: "d1",
      licenseNumber: "—",
      instituteId: "i1",
    };

    const a = hydrateDriverSessionFromAssignment({ instituteId: "i1", scope });
    const b = hydrateDriverSessionFromAssignment({ instituteId: "i1", scope });
    await Promise.all([a, b]);

    expect(loadDriverRosterForHydrate).not.toHaveBeenCalled();
    expect(hydrateRouteSetupFromApi).toHaveBeenCalledTimes(1);
    expect(tripRepository.hydrateFromApi).toHaveBeenCalledTimes(1);
  });
});
