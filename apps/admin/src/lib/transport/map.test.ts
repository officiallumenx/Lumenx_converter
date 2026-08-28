import { describe, expect, it } from "vitest";
import { vehicleDtoToTransportVehicle } from "./map";
import type { VehicleDto } from "./types";

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
