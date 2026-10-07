import type {
  AdminRouteStop,
  TransportDriver,
  TransportRoute,
  TransportSettings,
  TransportVehicle,
} from "@/lib/transport-store";
import type { DriverDto, RouteDto, StopDto, TransportEnrollmentDto, TransportSettingsDto, VehicleDto } from "./types";
import type { StudentListItem } from "@/lib/students/types";
import type { TransportEnrollmentListItem } from "./types";

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
    assignedDriverId: dto.assignedDriverId ?? null,
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
    assignedVehicleId: dto.assignedVehicleId ?? null,
    hasAppPin: Boolean(dto.hasAppPin),
    photoAssetPath: dto.photoAssetPath ?? null,
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

export function stopDtoToAdminRouteStop(
  dto: StopDto,
  studentIds: string[] = [],
): AdminRouteStop {
  return {
    id: dto.id,
    name: dto.name,
    locationLabel: dto.locationLabel,
    latitude: dto.latitude,
    longitude: dto.longitude,
    timestampCreated: dto.createdAt,
    createdBy: "",
    createdByName: "—",
    studentIds,
    routeOrder: dto.routeOrder,
    notificationRadiusM: dto.notificationRadiusM,
    approvalStatus: dto.approvalStatus,
  };
}

export function stopDtosToAdminRouteStops(
  rows: StopDto[],
  enrollments: Array<Pick<TransportEnrollmentDto, "pickupStopId" | "studentId" | "status">> = [],
): AdminRouteStop[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport stops API response must be an array");
  }
  const studentIdsByStop = new Map<string, string[]>();
  for (const enrollment of enrollments) {
    if (!enrollment.pickupStopId) continue;
    if (enrollment.status && enrollment.status !== "active") continue;
    const list = studentIdsByStop.get(enrollment.pickupStopId) ?? [];
    list.push(enrollment.studentId);
    studentIdsByStop.set(enrollment.pickupStopId, list);
  }
  return rows
    .map((dto) =>
      stopDtoToAdminRouteStop(dto, studentIdsByStop.get(dto.id) ?? []),
    )
    .sort((a, b) => a.routeOrder - b.routeOrder);
}

export function routeDtoToTransportRoute(
  dto: RouteDto,
  stops: StopDto[],
  enrollments: Array<
    Pick<TransportEnrollmentDto, "routeId" | "pickupStopId" | "studentId" | "status">
  > = [],
): TransportRoute {
  const routeEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.routeId === dto.id &&
      (!enrollment.status || enrollment.status === "active"),
  );
  const setupStops = stopDtosToAdminRouteStops(stops, routeEnrollments);
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
  enrollments: Array<
    Pick<TransportEnrollmentDto, "routeId" | "pickupStopId" | "studentId" | "status">
  > = [],
): Promise<TransportRoute[]> {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport routes API response must be an array");
  }
  return Promise.all(
    rows.map(async (route) =>
      routeDtoToTransportRoute(route, await fetchStops(route.id), enrollments),
    ),
  );
}

export function transportSettingsDtoToTransportSettings(
  dto: TransportSettingsDto,
): TransportSettings {
  return {
    defaultNotificationRadiusM: dto.defaultNotificationRadiusM,
    defaultPickupBufferMins: dto.defaultPickupBufferMins,
    workingDays: workingDayNumbersToLabels(dto.workingDays),
    notificationsEnabled: dto.notificationsEnabled ?? true,
    rememberEnabled: dto.rememberEnabled ?? true,
    defaultPickupTime: dto.defaultPickupTime?.slice(0, 5) || "07:30",
    schoolLocationLabel: dto.schoolLocationLabel ?? null,
    schoolLatitude: dto.schoolLatitude ?? null,
    schoolLongitude: dto.schoolLongitude ?? null,
    schoolNotificationRadiusM: dto.schoolNotificationRadiusM ?? 150,
  };
}

function shortRef(id: string | null, prefix: string): string {
  if (!id) return "—";
  const token = id.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function stopNameById(
  routes: TransportRoute[],
  stopId: string | null,
  emptyLabel = "Stop not assigned",
): string {
  if (!stopId) return emptyLabel;
  for (const route of routes) {
    const stop = route.setupStops.find((item) => item.id === stopId);
    if (stop) return stop.name;
  }
  // FK present but stop not on live route (soft-deleted / wrong route).
  return "Assigned stop missing";
}

export function enrollmentDtoToListItem(
  dto: TransportEnrollmentDto,
  studentsById: Map<string, StudentListItem>,
  routesById: Map<string, TransportRoute>,
): TransportEnrollmentListItem {
  const student = studentsById.get(dto.studentId);
  const route = routesById.get(dto.routeId);
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentName: student?.name ?? shortRef(dto.studentId, "Student"),
    studentClass: student?.grade ?? "—",
    classLabel: student?.classLabel ?? null,
    sectionLabel: student?.sectionLabel ?? null,
    routeName: route?.name ?? shortRef(dto.routeId, "Route"),
    pickupStopName: route
      ? stopNameById([route], dto.pickupStopId, "Stop not assigned")
      : dto.pickupStopId
        ? "Assigned stop missing"
        : "Stop not assigned",
    dropStopName: route
      ? stopNameById([route], dto.dropStopId, "Drop stop not assigned")
      : dto.dropStopId
        ? "Assigned stop missing"
        : "Drop stop not assigned",
    status: dto.status,
  };
}

export function enrollmentDtosToListItems(
  rows: TransportEnrollmentDto[],
  studentsById: Map<string, StudentListItem>,
  routes: TransportRoute[],
): TransportEnrollmentListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Transport enrollments API response must be an array");
  }
  const routesById = new Map(routes.map((route) => [route.id, route]));
  return rows.map((dto) => enrollmentDtoToListItem(dto, studentsById, routesById));
}
