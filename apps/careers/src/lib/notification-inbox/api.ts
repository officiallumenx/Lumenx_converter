import { isApiAuthMode } from "@/auth/auth-mode";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import type { InboxItemDto, ListInboxParams } from "./types";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

async function careersInboxFetch<T>(path: string, init?: RequestInit & { body?: unknown }): Promise<T> {
  if (!isApiAuthMode()) {
    throw new Error("Careers notification inbox requires VITE_CAREERS_AUTH_MODE=api");
  }
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Authentication required");

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method: init?.method ?? (init?.body !== undefined ? "PATCH" : "GET"),
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

export async function listInboxNotifications(params: ListInboxParams = {}): Promise<InboxItemDto[]> {
  const query = new URLSearchParams();
  if (params.instituteId?.trim()) {
    query.set("institute_id", params.instituteId.trim());
  }
  const suffix = query.toString();
  return careersInboxFetch<InboxItemDto[]>(
    suffix ? `/api/v1/notifications?${suffix}` : "/api/v1/notifications",
  );
}

export async function markInboxItemRead(itemId: string): Promise<InboxItemDto> {
  return careersInboxFetch<InboxItemDto>(`/api/v1/notifications/${itemId.trim()}`, {
    body: { read: true },
  });
}
