import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export type IdempotencyStatus = "in_progress" | "completed" | "failed";

export type IdempotencyRow = {
  id: string;
  scope_key: string;
  route_key: string;
  idempotency_key: string;
  status: IdempotencyStatus;
  response_status: number | null;
  response_body: unknown | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

const COLS =
  "id, scope_key, route_key, idempotency_key, status, response_status, response_body, error_message, created_at, updated_at, expires_at";

export async function findIdempotencyRow(
  admin: SupabaseClient,
  input: { scopeKey: string; routeKey: string; idempotencyKey: string },
): Promise<IdempotencyRow | null> {
  const result = await admin
    .from("api_idempotency_key")
    .select(COLS)
    .eq("scope_key", input.scopeKey)
    .eq("route_key", input.routeKey)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = (result.data as IdempotencyRow | null) ?? null;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await admin.from("api_idempotency_key").delete().eq("id", row.id);
    return null;
  }
  return row;
}

export async function insertIdempotencyInProgress(
  admin: SupabaseClient,
  input: {
    scopeKey: string;
    routeKey: string;
    idempotencyKey: string;
    ttlMs: number;
  },
): Promise<IdempotencyRow> {
  const now = Date.now();
  const result = await admin
    .from("api_idempotency_key")
    .insert({
      scope_key: input.scopeKey,
      route_key: input.routeKey,
      idempotency_key: input.idempotencyKey,
      status: "in_progress",
      response_status: null,
      response_body: null,
      error_message: null,
      expires_at: new Date(now + input.ttlMs).toISOString(),
    })
    .select(COLS)
    .single();
  return ensureDbOk(result) as IdempotencyRow;
}

export async function completeIdempotencyRow(
  admin: SupabaseClient,
  id: string,
  input: { responseStatus: number; responseBody: unknown },
): Promise<void> {
  const result = await admin
    .from("api_idempotency_key")
    .update({
      status: "completed",
      response_status: input.responseStatus,
      response_body: input.responseBody,
      error_message: null,
    })
    .eq("id", id);
  ensureDbOk(result);
}

export async function failIdempotencyRow(
  admin: SupabaseClient,
  id: string,
  errorMessage: string,
): Promise<void> {
  const result = await admin
    .from("api_idempotency_key")
    .update({
      status: "failed",
      error_message: errorMessage.slice(0, 500),
    })
    .eq("id", id);
  ensureDbOk(result);
}

export async function deleteIdempotencyRow(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const result = await admin.from("api_idempotency_key").delete().eq("id", id);
  ensureDbOk(result);
}
