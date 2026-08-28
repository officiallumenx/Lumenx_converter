import { describe, expect, it } from "vitest";
import { driverDtoToTransportDriver, vehicleDtoToTransportVehicle } from "./map";
import type { DriverDto, VehicleDto } from "./types";

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
