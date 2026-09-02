import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { isApiAuthMode } from "@/lib/auth/auth-mode";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

export async function transportFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isApiAuthMode()) {
    throw new Error("Transport API requires VITE_TRANSPORT_AUTH_MODE=api");
  }
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as { data?: T; error?: { message?: string } }) : {};
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Request failed (${response.status})`);
  }
  return json.data as T;
}
