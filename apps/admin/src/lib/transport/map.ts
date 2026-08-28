import type { TransportVehicle } from "@/lib/transport-store";
import type { VehicleDto } from "./types";

export function vehicleDtoToTransportVehicle(dto: VehicleDto): TransportVehicle {
  return {
    id: dto.id,
    vehicleNumber: dto.vehicleNumber,
    registrationNumber: dto.registrationNumber,
    capacity: dto.capacity,
    status: dto.status,
    assignedDriverId: null,
    notes: dto.notes ?? "",
  };
}

export function vehicleDtosToTransportVehicles(rows: VehicleDto[]): TransportVehicle[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport vehicles API response must be an array");
  }
  return rows.map(vehicleDtoToTransportVehicle);
}
