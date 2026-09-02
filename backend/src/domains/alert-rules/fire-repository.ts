import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export const ALERT_FIRE_COLS =
  "id, institute_id, rule_id, title, detail, fired_at, resolved_at, resolved_by_user_profile_id, complaint_id, metadata, created_at, updated_at, deleted_at";

export type AlertFireRow = {
  id: string;
  institute_id: string;
  rule_id: string;
  title: string;
  detail: string;
  fired_at: string;
  resolved_at: string | null;
  resolved_by_user_profile_id: string | null;
  complaint_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function listAlertFires(
  admin: SupabaseClient,
  instituteId: string,
  options?: { unresolvedOnly?: boolean },
): Promise<AlertFireRow[]> {
  let query = admin
    .from("alert_fire")
    .select(ALERT_FIRE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("fired_at", { ascending: false });
  if (options?.unresolvedOnly) {
    query = query.is("resolved_at", null);
  }
  const result = await query;
  return ensureDbOk(result) as AlertFireRow[];
}

export async function findAlertFireById(
  admin: SupabaseClient,
  id: string,
): Promise<AlertFireRow | null> {
  const result = await admin
    .from("alert_fire")
    .select(ALERT_FIRE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AlertFireRow | null) ?? null;
}

export async function insertAlertFire(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    ruleId: string;
    title: string;
    detail?: string;
    complaintId?: string | null;
    metadata?: Record<string, unknown>;
    firedAt?: string;
  },
): Promise<AlertFireRow> {
  const result = await admin
    .from("alert_fire")
    .insert({
      institute_id: input.instituteId,
      rule_id: input.ruleId,
      title: input.title.trim(),
      detail: input.detail?.trim() || input.title.trim(),
      complaint_id: input.complaintId ?? null,
      metadata: input.metadata ?? {},
      fired_at: input.firedAt ?? new Date().toISOString(),
    })
    .select(ALERT_FIRE_COLS)
    .single();
  return ensureDbOk(result) as AlertFireRow;
}

export async function resolveAlertFire(
  admin: SupabaseClient,
  id: string,
  resolvedByUserProfileId: string,
): Promise<AlertFireRow | null> {
  const now = new Date().toISOString();
  const result = await admin
    .from("alert_fire")
    .update({
      resolved_at: now,
      resolved_by_user_profile_id: resolvedByUserProfileId,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .is("resolved_at", null)
    .select(ALERT_FIRE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AlertFireRow | null) ?? null;
}
