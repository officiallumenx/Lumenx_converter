/**
 * Notification inbox API — Transport driver app (API auth mode).
 */
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { getTransportApiBaseUrl } from "@/lib/api-base-url";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import type { InboxItemDto, ListInboxParams } from "./types";

function apiBaseUrl(): string {
  return getTransportApiBaseUrl();
}

type InboxFetchInit = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function transportInboxFetch<T>(path: string, init?: InboxFetchInit): Promise<T> {
  if (!isApiAuthMode()) {
    throw new Error("Transport notification inbox requires VITE_TRANSPORT_AUTH_MODE=api");
  }
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Authentication required");

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(init?.headers ?? {}),
  };
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: init?.method ?? (init?.body !== undefined ? "PATCH" : "GET"),
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as { data?: T; error?: { message?: string } }) : {};
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Request failed (${response.status})`);
  }
  return json.data as T;
}

export async function listInboxNotifications(params: ListInboxParams): Promise<InboxItemDto[]> {
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  return transportInboxFetch<InboxItemDto[]>(`/api/v1/notifications?${query.toString()}`);
}

export async function markInboxItemRead(itemId: string): Promise<InboxItemDto> {
  return transportInboxFetch<InboxItemDto>(`/api/v1/notifications/${itemId.trim()}`, {
    body: { read: true },
  });
}
