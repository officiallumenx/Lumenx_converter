import type { TransportDriver, TransportVehicle } from "@/lib/transport-store";
import type { DriverDto, VehicleDto } from "./types";

function formatLicenseExpiry(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

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

export function driverDtoToTransportDriver(dto: DriverDto): TransportDriver {
  return {
    id: dto.id,
    name: dto.displayName,
    phone: dto.phone,
    licenseNumber: dto.licenseNumber,
    licenseExpiry: formatLicenseExpiry(dto.licenseExpiry),
    assignedVehicleId: null,
    status: dto.status,
    notes: dto.notes ?? "",
  };
}

export function driverDtosToTransportDrivers(rows: DriverDto[]): TransportDriver[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport drivers API response must be an array");
  }
  return rows.map(driverDtoToTransportDriver);
}
