import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { AppError } from "../../errors/app-error.js";
import type {
  AppendAuditInput,
  AuditEventRow,
  ListAuditFilter,
} from "./types.js";

const AUDIT_COLS =
  "id, scope, institute_id, actor_user_id, action, entity_type, entity_id, metadata, created_at";

export async function findAuditEventById(
  admin: SupabaseClient,
  id: string,
): Promise<AuditEventRow | null> {
  const result = await admin
    .from("audit_event")
    .select(AUDIT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AuditEventRow | null) ?? null;
}

export async function listAuditEvents(
  admin: SupabaseClient,
  filter: ListAuditFilter,
): Promise<AuditEventRow[]> {
  if (filter.scope === "institute" && !filter.instituteId) {
    throw AppError.validation("instituteId is required for institute audit queries");
  }

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);

  let query = admin
    .from("audit_event")
    .select(AUDIT_COLS)
    .eq("scope", filter.scope);

  if (filter.scope === "institute" && filter.instituteId) {
    query = query.eq("institute_id", filter.instituteId);
  }
  if (filter.actorUserId) {
    query = query.eq("actor_user_id", filter.actorUserId);
  }
  if (filter.entityType) {
    query = query.eq("entity_type", filter.entityType);
  }
  if (filter.entityId) {
    query = query.eq("entity_id", filter.entityId);
  }
  if (filter.action) {
    query = query.eq("action", filter.action);
  }

  const result = await query;
  const rows = ensureDbOk(result) as AuditEventRow[];
  return rows
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export async function insertAuditEvent(
  admin: SupabaseClient,
  input: AppendAuditInput & { actorUserId: string },
): Promise<AuditEventRow> {
  const result = await admin
    .from("audit_event")
    .insert({
      scope: input.scope,
      institute_id: input.instituteId ?? null,
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata ?? {},
    })
    .select(AUDIT_COLS)
    .single();
  return ensureDbOk(result) as AuditEventRow;
}
