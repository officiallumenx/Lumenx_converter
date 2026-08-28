import { describe, expect, it } from "vitest";
import {
  driverDtoToTransportDriver,
  routeDtoToTransportRoute,
  transportSettingsDtoToTransportSettings,
  vehicleDtoToTransportVehicle,
} from "./map";
import type { DriverDto, RouteDto, StopDto, TransportSettingsDto, VehicleDto } from "./types";

const dto: VehicleDto = {
  id: "vv111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  vehicleNumber: "BUS-01",
  registrationNumber: "KA-01-LX-4521",
  capacity: 40,
  status: "maintenance",
  notes: "Needs service",
  createdAt: "2026-06-01T10:00:00Z",
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("vehicleDtoToTransportVehicle", () => {
  it("maps DTO fields to TransportVehicle shape", () => {
    expect(vehicleDtoToTransportVehicle(dto)).toEqual({
      id: dto.id,
      vehicleNumber: "BUS-01",
      registrationNumber: "KA-01-LX-4521",
      capacity: 40,
      status: "maintenance",
      assignedDriverId: null,
      notes: "Needs service",
    });
  });

  it("defaults null notes to empty string", () => {
    expect(
      vehicleDtoToTransportVehicle({ ...dto, notes: null }).notes,
    ).toBe("");
  });
});

describe("driverDtoToTransportDriver", () => {
  const driver: DriverDto = {
    id: "dd111111-1111-4111-8111-111111111111",
    instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    userProfileId: null,
    displayName: "Ravi Kumar",
    phone: "+91 98765 43210",
    licenseNumber: "DL-12345",
    licenseExpiry: "2027-06-15T00:00:00Z",
    status: "active",
    notes: "Experienced",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };

  it("maps DTO fields to TransportDriver shape", () => {
    expect(driverDtoToTransportDriver(driver)).toEqual({
      id: driver.id,
      name: "Ravi Kumar",
      phone: "+91 98765 43210",
      licenseNumber: "DL-12345",
      licenseExpiry: "2027-06-15",
      assignedVehicleId: null,
      status: "active",
      notes: "Experienced",
    });
  });
});

describe("routeDtoToTransportRoute", () => {
  const route: RouteDto = {
    id: "rr111111-1111-4111-8111-111111111111",
    instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Route A",
    vehicleId: "vv111111-1111-4111-8111-111111111111",
    driverId: "dd111111-1111-4111-8111-111111111111",
    status: "active",
    configStatus: "locked",
    lockedAt: "2026-06-02T10:00:00Z",
    lockedByUserId: "uu111111-1111-4111-8111-111111111111",
    setupFinishedAt: "2026-06-01T12:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };

  const stops: StopDto[] = [
    {
      id: "ss222222-2222-4222-8222-222222222222",
      instituteId: route.instituteId,
      routeId: route.id,
      name: "Stop B",
      locationLabel: "Market",
      latitude: 12.98,
      longitude: 77.6,
      routeOrder: 2,
      notificationRadiusM: 150,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
    {
      id: "ss111111-1111-4111-8111-111111111111",
      instituteId: route.instituteId,
      routeId: route.id,
      name: "Stop A",
      locationLabel: "Gate",
      latitude: 12.97,
      longitude: 77.59,
      routeOrder: 1,
      notificationRadiusM: 200,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
  ];

  it("maps route and ordered stops", () => {
    const mapped = routeDtoToTransportRoute(route, stops);
    expect(mapped.name).toBe("Route A");
    expect(mapped.setupStops).toHaveLength(2);
    expect(mapped.setupStops[0]?.name).toBe("Stop A");
    expect(mapped.setupStops[1]?.name).toBe("Stop B");
    expect(mapped.stopIds).toEqual([
      "ss111111-1111-4111-8111-111111111111",
      "ss222222-2222-4222-8222-222222222222",
    ]);
    expect(mapped.lockedBy).toBe(route.lockedByUserId);
  });
});

describe("transportSettingsDtoToTransportSettings", () => {
  const dto: TransportSettingsDto = {
    instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    defaultNotificationRadiusM: 200,
    defaultPickupBufferMins: 10,
    workingDays: [1, 2, 3, 4, 5],
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };

  it("maps working day numbers to weekday labels", () => {
    expect(transportSettingsDtoToTransportSettings(dto)).toEqual({
      defaultNotificationRadiusM: 200,
      defaultPickupBufferMins: 10,
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    });
  });
});
