import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
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

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as { data?: T; error?: { message?: string } }) : {};
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Request failed (${response.status})`);
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
}) {
  return transportFetch<{
    id: string;
    instituteId: string;
    routeId: string;
    name: string;
    approvalStatus: string;
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
    },
  });
}

export type StopDto = {
  id: string;
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  routeOrder: number;
  approvalStatus: string;
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
  status: "active" | "acknowledged" | "resolved";
  emergencyType: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  vehicleId: string;
  driverId: string;
};

export async function startTransportTrip(input: {
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot?: "morning" | "evening";
  tripDate?: string;
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
    },
  });
}

export async function updateTransportTripPhase(
  tripId: string,
  input: {
    phase: string;
    currentStopId?: string | null;
    currentStopIndex?: number;
  },
): Promise<TransportTripDto> {
  return transportFetch<TransportTripDto>(`/api/v1/transport/trips/${tripId}/phase`, {
    method: "PATCH",
    body: {
      phase: input.phase,
      current_stop_id: input.currentStopId ?? null,
      current_stop_index: input.currentStopIndex,
    },
  });
}

export async function endTransportTrip(tripId: string): Promise<TransportTripDto> {
  return transportFetch<TransportTripDto>(`/api/v1/transport/trips/${tripId}/end`, {
    method: "POST",
  });
}

export async function getActiveTripForVehicle(
  vehicleId: string,
): Promise<TransportTripDto | null> {
  return transportFetch<TransportTripDto | null>(
    `/api/v1/transport/vehicles/${vehicleId}/active-trip`,
  );
}

export async function listTripBoardingEvents(
  tripId: string,
): Promise<TransportBoardingEventDto[]> {
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
  },
): Promise<TransportBoardingEventDto> {
  return transportFetch<TransportBoardingEventDto>(
    `/api/v1/transport/trips/${tripId}/boarding`,
    {
      method: "POST",
      body: {
        student_id: input.studentId,
        stop_id: input.stopId,
        boarding_status: input.boardingStatus,
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
  },
): Promise<TransportBoardingEventDto> {
  return transportFetch<TransportBoardingEventDto>(
    `/api/v1/transport/trips/${tripId}/dropping`,
    {
      method: "POST",
      body: {
        student_id: input.studentId,
        stop_id: input.stopId,
        dropping_status: input.droppingStatus,
      },
    },
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
    },
  });
}

export async function getOpenEmergencyForVehicle(
  vehicleId: string,
): Promise<TransportEmergencyDto | null> {
  return transportFetch<TransportEmergencyDto | null>(
    `/api/v1/transport/vehicles/${vehicleId}/open-emergency`,
  );
}

export async function pingTripLocation(
  tripId: string,
  input: { latitude: number; longitude: number; accuracyM?: number | null },
): Promise<void> {
  await transportFetch(`/api/v1/transport/trips/${tripId}/location`, {
    method: "POST",
    body: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM ?? null,
    },
  });
}
