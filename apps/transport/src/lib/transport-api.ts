import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { getTransportApiBaseUrl } from "@/lib/api-base-url";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuidPathParam(label: string, value: string): void {
  if (!UUID_RE.test(value?.trim() ?? "")) {
    throw new Error(`${label} is missing or invalid — refresh assignment and try again.`);
  }
}

function apiBaseUrl(): string {
  return getTransportApiBaseUrl();
}

/** Prevents ops-outbox `flushing` from hanging forever on a stalled TCP/TLS request. */
const TRANSPORT_FETCH_TIMEOUT_MS = 20_000;

/** API error with status + machine-readable code (never includes tokens). */
export class TransportApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = "TransportApiError";
  }
}

async function transportFetch<T>(
  path: string,
  init?: RequestInit & { body?: unknown },
): Promise<T> {
  if (!isApiAuthMode()) {
    throw new Error("Transport API requires VITE_TRANSPORT_AUTH_MODE=api");
  }
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Authentication required");

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const timeoutSignal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(TRANSPORT_FETCH_TIMEOUT_MS)
      : undefined;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal ?? timeoutSignal,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new TransportApiError(
        `Request timed out after ${TRANSPORT_FETCH_TIMEOUT_MS / 1000}s`,
        408,
        "TIMEOUT",
      );
    }
    throw err;
  }

  const text = await response.text();
  const json = text
    ? (JSON.parse(text) as {
        data?: T;
        error?: { message?: string; code?: string };
      })
    : {};
  if (!response.ok) {
    throw new TransportApiError(
      json.error?.message ?? `Request failed (${response.status})`,
      response.status,
      json.error?.code ?? null,
    );
  }
  return json.data as T;
}

export type DriverMe = {
  driverId: string;
  instituteId: string;
  displayName: string;
  phone: string;
};

export async function getDriverMe(instituteId: string): Promise<DriverMe> {
  const query = new URLSearchParams({ institute_id: instituteId });
  return transportFetch<DriverMe>(`/api/v1/transport/drivers/me?${query.toString()}`);
}

export type DriverRouteRosterStop = {
  id: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  approvalStatus: string;
  createdAt: string;
  kind?: "waypoint" | "school" | "parking";
  notificationRadiusM?: number;
};

export type DriverRouteRosterStudent = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classLabel: string;
  pickupStopId: string;
  dropStopId: string;
  pickupStopName: string | null;
  dropStopName?: string | null;
  status: string;
  approvalStatus: string;
  notRidingToday?: boolean;
  rideExceptionId?: string | null;
};

export type DriverRouteRoster = {
  driverId: string;
  routeId: string | null;
  routeName: string | null;
  vehicleId: string | null;
  locked: boolean;
  stops: DriverRouteRosterStop[];
  students: DriverRouteRosterStudent[];
  expectedCount?: number;
  notRidingCount?: number;
  expectedOnboardCount?: number;
};

export async function getDriverRouteRoster(instituteId: string): Promise<DriverRouteRoster> {
  const query = new URLSearchParams({ institute_id: instituteId });
  return transportFetch<DriverRouteRoster>(
    `/api/v1/transport/portal/driver-route-roster?${query.toString()}`,
  );
}

export async function submitTransportRoute(input: {
  instituteId: string;
  name: string;
  vehicleId?: string | null;
  driverId?: string | null;
}) {
  return transportFetch(`/api/v1/transport/routes`, {
    method: "POST",
    body: {
      institute_id: input.instituteId,
      name: input.name,
      vehicle_id: input.vehicleId ?? null,
      driver_id: input.driverId ?? null,
    },
  });
}

export async function submitTransportStop(input: {
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  kind?: "waypoint" | "parking";
  notificationRadiusM?: number;
}) {
  return transportFetch<{
    id: string;
    instituteId: string;
    routeId: string;
    name: string;
    approvalStatus: string;
    kind?: string;
    notificationRadiusM?: number;
  }>(`/api/v1/transport/stops`, {
    method: "POST",
    body: {
      institute_id: input.instituteId,
      route_id: input.routeId,
      name: input.name,
      location_label: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      route_order: input.routeOrder,
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.notificationRadiusM !== undefined
        ? { notification_radius_m: input.notificationRadiusM }
        : {}),
    },
  });
}

export async function updateTransportStop(
  stopId: string,
  input: {
    name?: string;
    locationLabel?: string;
    latitude?: number;
    longitude?: number;
    routeOrder?: number;
    notificationRadiusM?: number;
  },
) {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.locationLabel !== undefined) body.location_label = input.locationLabel;
  if (input.latitude !== undefined) body.latitude = input.latitude;
  if (input.longitude !== undefined) body.longitude = input.longitude;
  if (input.routeOrder !== undefined) body.route_order = input.routeOrder;
  if (input.notificationRadiusM !== undefined) {
    body.notification_radius_m = input.notificationRadiusM;
  }
  return transportFetch<{
    id: string;
    instituteId: string;
    routeId: string;
    name: string;
    approvalStatus: string;
    notificationRadiusM?: number;
  }>(`/api/v1/transport/stops/${stopId}`, {
    method: "PATCH",
    body,
  });
}

export type StopDto = {
  id: string;
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  approvalStatus: string;
  kind?: "waypoint" | "school" | "parking";
  notificationRadiusM?: number;
};

export async function listTransportStops(input: {
  routeId: string;
}): Promise<StopDto[]> {
  const query = new URLSearchParams({ route_id: input.routeId });
  return transportFetch<StopDto[]>(`/api/v1/transport/stops?${query.toString()}`);
}

export async function submitTransportEnrollment(input: {
  instituteId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
}) {
  return transportFetch<{
    id: string;
    studentId: string;
    approvalStatus: string;
  }>(`/api/v1/transport/enrollments`, {
    method: "POST",
    body: {
      institute_id: input.instituteId,
      student_id: input.studentId,
      route_id: input.routeId,
      pickup_stop_id: input.pickupStopId,
      drop_stop_id: input.dropStopId,
    },
  });
}

export async function updateTransportEnrollment(
  enrollmentId: string,
  input: {
    pickupStopId?: string | null;
    dropStopId?: string | null;
  },
) {
  const body: Record<string, unknown> = {};
  if (input.pickupStopId !== undefined) body.pickup_stop_id = input.pickupStopId;
  if (input.dropStopId !== undefined) body.drop_stop_id = input.dropStopId;
  return transportFetch<{
    id: string;
    studentId: string;
    approvalStatus: string;
  }>(`/api/v1/transport/enrollments/${enrollmentId}`, {
    method: "PATCH",
    body,
  });
}

export type TransportTripDto = {
  id: string;
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot: "morning" | "evening";
  tripDate: string;
  phase: string;
  startedAt: string | null;
  completedAt: string | null;
  currentStopId: string | null;
  currentStopIndex: number;
  finalized: boolean;
  timeline?: Array<{
    id: string;
    at: string;
    kind: string;
    label: string;
    note?: string;
    stopId?: string;
    studentId?: string;
  }>;
  schoolArrivedAt?: string | null;
  pickupStopPlan?: Array<{ id: string; name: string; routeOrder: number }>;
  dropStopPlan?: Array<{ id: string; name: string; routeOrder: number }>;
};

export type TransportBoardingEventDto = {
  id: string;
  tripId: string;
  studentId: string;
  stopId: string;
  boardingStatus: "pending" | "boarded" | "not_boarded";
  droppingStatus: "pending" | "dropped" | "not_dropped";
  boardedAt: string | null;
  droppedAt: string | null;
  finalized: boolean;
  studentName?: string | null;
  stopName?: string | null;
};

export type TransportEmergencyDto = {
  id: string;
  instituteId?: string;
  tripId?: string | null;
  status: "active" | "acknowledged" | "resolved";
  emergencyType: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  vehicleId: string;
  driverId: string;
  driverName?: string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  resolveNote?: string | null;
  timeline?: Array<{ id: string; at: string; label: string; note?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export async function startTransportTrip(input: {
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot?: "morning" | "evening";
  tripDate?: string;
  clientEventId?: string;
}): Promise<TransportTripDto> {
  return transportFetch<TransportTripDto>(`/api/v1/transport/trips`, {
    method: "POST",
    body: {
      institute_id: input.instituteId,
      route_id: input.routeId,
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      slot: input.slot,
      trip_date: input.tripDate,
      ...(input.clientEventId ? { client_event_id: input.clientEventId } : {}),
    },
  });
}

export async function updateTransportTripPhase(
  tripId: string,
  input: {
    phase: string;
    currentStopId?: string | null;
    currentStopIndex?: number;
    clientEventId?: string;
  },
): Promise<TransportTripDto> {
  assertUuidPathParam("Trip id", tripId);
  return transportFetch<TransportTripDto>(`/api/v1/transport/trips/${tripId}/phase`, {
    method: "PATCH",
    body: {
      phase: input.phase,
      current_stop_id: input.currentStopId ?? null,
      current_stop_index: input.currentStopIndex,
      ...(input.clientEventId ? { client_event_id: input.clientEventId } : {}),
    },
  });
}

export async function endTransportTrip(
  tripId: string,
  clientEventId?: string,
): Promise<TransportTripDto> {
  assertUuidPathParam("Trip id", tripId);
  return transportFetch<TransportTripDto>(`/api/v1/transport/trips/${tripId}/end`, {
    method: "POST",
    body: {
      ...(clientEventId ? { client_event_id: clientEventId } : {}),
    },
  });
}

export async function getActiveTripForVehicle(
  vehicleId: string,
): Promise<TransportTripDto | null> {
  assertUuidPathParam("Vehicle id", vehicleId);
  return transportFetch<TransportTripDto | null>(
    `/api/v1/transport/vehicles/${vehicleId}/active-trip`,
  );
}

export async function listTripBoardingEvents(
  tripId: string,
): Promise<TransportBoardingEventDto[]> {
  assertUuidPathParam("Trip id", tripId);
  return transportFetch<TransportBoardingEventDto[]>(
    `/api/v1/transport/trips/${tripId}/boarding`,
  );
}

export async function markTripBoarding(
  tripId: string,
  input: {
    studentId: string;
    stopId: string;
    boardingStatus: "pending" | "boarded" | "not_boarded";
    clientEventId: string;
  },
): Promise<TransportBoardingEventDto> {
  assertUuidPathParam("Trip id", tripId);
  return transportFetch<TransportBoardingEventDto>(
    `/api/v1/transport/trips/${tripId}/boarding`,
    {
      method: "POST",
      body: {
        student_id: input.studentId,
        stop_id: input.stopId,
        boarding_status: input.boardingStatus,
        client_event_id: input.clientEventId,
      },
    },
  );
}

export async function markTripDropping(
  tripId: string,
  input: {
    studentId: string;
    stopId: string;
    droppingStatus: "pending" | "dropped" | "not_dropped";
    clientEventId: string;
  },
): Promise<TransportBoardingEventDto> {
  assertUuidPathParam("Trip id", tripId);
  return transportFetch<TransportBoardingEventDto>(
    `/api/v1/transport/trips/${tripId}/dropping`,
    {
      method: "POST",
      body: {
        student_id: input.studentId,
        stop_id: input.stopId,
        dropping_status: input.droppingStatus,
        client_event_id: input.clientEventId,
      },
    },
  );
}

export async function listTransportEmergenciesApi(input: {
  instituteId: string;
  status?: "active" | "acknowledged" | "resolved";
}): Promise<TransportEmergencyDto[]> {
  const query = new URLSearchParams({ institute_id: input.instituteId });
  if (input.status) query.set("status", input.status);
  return transportFetch<TransportEmergencyDto[]>(
    `/api/v1/transport/emergencies?${query.toString()}`,
  );
}

export async function createTransportEmergency(input: {
  instituteId: string;
  tripId?: string | null;
  driverId: string;
  vehicleId: string;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  clientEventId?: string;
}): Promise<TransportEmergencyDto> {
  return transportFetch<TransportEmergencyDto>(`/api/v1/transport/emergencies`, {
    method: "POST",
    body: {
      institute_id: input.instituteId,
      trip_id: input.tripId ?? null,
      driver_id: input.driverId,
      vehicle_id: input.vehicleId,
      note: input.note ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      ...(input.clientEventId ? { client_event_id: input.clientEventId } : {}),
    },
  });
}

export async function getOpenEmergencyForVehicle(
  vehicleId: string,
): Promise<TransportEmergencyDto | null> {
  assertUuidPathParam("Vehicle id", vehicleId);
  return transportFetch<TransportEmergencyDto | null>(
    `/api/v1/transport/vehicles/${vehicleId}/open-emergency`,
  );
}

export async function pingTripLocation(
  tripId: string,
  input: {
    latitude: number;
    longitude: number;
    accuracyM?: number | null;
    speedKmh?: number | null;
    capturedAt?: string;
    clientEventId?: string;
    sequenceNumber?: number;
  },
): Promise<void> {
  assertUuidPathParam("Trip id", tripId);
  await transportFetch(`/api/v1/transport/trips/${tripId}/location`, {
    method: "POST",
    body: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM ?? null,
      ...(input.speedKmh != null && Number.isFinite(input.speedKmh)
        ? { speed_kmh: input.speedKmh }
        : {}),
      ...(input.capturedAt ? { captured_at: input.capturedAt } : {}),
      ...(input.clientEventId ? { client_event_id: input.clientEventId } : {}),
      ...(input.sequenceNumber !== undefined
        ? { sequence_number: input.sequenceNumber }
        : {}),
    },
  });
}
