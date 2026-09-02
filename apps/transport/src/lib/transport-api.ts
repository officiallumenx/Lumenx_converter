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
