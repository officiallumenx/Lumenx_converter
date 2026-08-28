import type {
  AdminRouteStop,
  TransportDriver,
  TransportRoute,
  TransportSettings,
  TransportVehicle,
} from "@/lib/transport-store";
import type { DriverDto, RouteDto, StopDto, TransportSettingsDto, VehicleDto } from "./types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function workingDayNumbersToLabels(days: number[]): string[] {
  return days
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day) => WEEKDAY_LABELS[day]!)
    .filter(Boolean);
}

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

export function stopDtoToAdminRouteStop(dto: StopDto): AdminRouteStop {
  return {
    id: dto.id,
    name: dto.name,
    locationLabel: dto.locationLabel,
    latitude: dto.latitude,
    longitude: dto.longitude,
    timestampCreated: dto.createdAt,
    createdBy: "",
    createdByName: "—",
    studentIds: [],
    routeOrder: dto.routeOrder,
  };
}

export function stopDtosToAdminRouteStops(rows: StopDto[]): AdminRouteStop[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport stops API response must be an array");
  }
  return rows
    .map(stopDtoToAdminRouteStop)
    .sort((a, b) => a.routeOrder - b.routeOrder);
}

export function routeDtoToTransportRoute(
  dto: RouteDto,
  stops: StopDto[],
): TransportRoute {
  const setupStops = stopDtosToAdminRouteStops(stops);
  return {
    id: dto.id,
    name: dto.name,
    vehicleId: dto.vehicleId,
    driverId: dto.driverId,
    stopIds: setupStops.map((stop) => stop.id),
    status: dto.status,
    configStatus: dto.configStatus,
    setupStops,
    lockedBy: dto.lockedByUserId,
    lockedAt: dto.lockedAt,
    setupFinishedAt: dto.setupFinishedAt,
  };
}

export async function routeDtosToTransportRoutes(
  rows: RouteDto[],
  fetchStops: (routeId: string) => Promise<StopDto[]>,
): Promise<TransportRoute[]> {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport routes API response must be an array");
  }
  return Promise.all(
    rows.map(async (route) => routeDtoToTransportRoute(route, await fetchStops(route.id))),
  );
}

export function transportSettingsDtoToTransportSettings(
  dto: TransportSettingsDto,
): TransportSettings {
  return {
    defaultNotificationRadiusM: dto.defaultNotificationRadiusM,
    defaultPickupBufferMins: dto.defaultPickupBufferMins,
    workingDays: workingDayNumbersToLabels(dto.workingDays),
  };
}
