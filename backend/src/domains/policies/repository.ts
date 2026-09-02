import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreatePolicyRuleInput,
  PolicyRuleRow,
  StorageQuotaRow,
  StoragePlan,
  UpsertStorageQuotaInput,
} from "./types.js";

const RULE_COLS =
  "id, kind, name, description, condition_text, severity_default, enabled, updated_by_user_id, created_at, updated_at, deleted_at";

const QUOTA_COLS =
  "id, plan, limit_gb, warning_pct, updated_by_user_id, created_at, updated_at, deleted_at";

export async function listPolicyRules(
  admin: SupabaseClient,
): Promise<PolicyRuleRow[]> {
  const result = await admin
    .from("policy_rule")
    .select(RULE_COLS)
    .is("deleted_at", null)
    .order("kind", { ascending: true });
  return ensureDbOk(result) as PolicyRuleRow[];
}

export async function findPolicyRuleById(
  admin: SupabaseClient,
  id: string,
): Promise<PolicyRuleRow | null> {
  const result = await admin
    .from("policy_rule")
    .select(RULE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PolicyRuleRow | null) ?? null;
}

export async function findPolicyRuleByKind(
  admin: SupabaseClient,
  kind: string,
): Promise<PolicyRuleRow | null> {
  const result = await admin
    .from("policy_rule")
    .select(RULE_COLS)
    .eq("kind", kind)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PolicyRuleRow | null) ?? null;
}

export async function insertPolicyRule(
  admin: SupabaseClient,
  input: CreatePolicyRuleInput & { updatedByUserId: string },
): Promise<PolicyRuleRow> {
  const result = await admin
    .from("policy_rule")
    .insert({
      kind: input.kind,
      name: input.name,
      description: input.description ?? "",
      condition_text: input.conditionText ?? "",
      severity_default: input.severityDefault ?? "medium",
      enabled: input.enabled ?? true,
      updated_by_user_id: input.updatedByUserId,
    })
    .select(RULE_COLS)
    .single();
  return ensureDbOk(result) as PolicyRuleRow;
}

export async function updatePolicyRuleFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<PolicyRuleRow | null> {
  const result = await admin
    .from("policy_rule")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(RULE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PolicyRuleRow | null) ?? null;
}

export async function softDeletePolicyRule(
  admin: SupabaseClient,
  id: string,
  updatedByUserId: string,
): Promise<PolicyRuleRow | null> {
  return updatePolicyRuleFields(admin, id, {
    deleted_at: new Date().toISOString(),
    updated_by_user_id: updatedByUserId,
  });
}

export async function listStorageQuotas(
  admin: SupabaseClient,
): Promise<StorageQuotaRow[]> {
  const result = await admin
    .from("storage_quota")
    .select(QUOTA_COLS)
    .is("deleted_at", null)
    .order("plan", { ascending: true });
  return ensureDbOk(result) as StorageQuotaRow[];
}

export async function findStorageQuotaByPlan(
  admin: SupabaseClient,
  plan: StoragePlan,
): Promise<StorageQuotaRow | null> {
  const result = await admin
    .from("storage_quota")
    .select(QUOTA_COLS)
    .eq("plan", plan)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StorageQuotaRow | null) ?? null;
}

export async function findStorageQuotaById(
  admin: SupabaseClient,
  id: string,
): Promise<StorageQuotaRow | null> {
  const result = await admin
    .from("storage_quota")
    .select(QUOTA_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StorageQuotaRow | null) ?? null;
}

export async function insertStorageQuota(
  admin: SupabaseClient,
  input: UpsertStorageQuotaInput & { updatedByUserId: string },
): Promise<StorageQuotaRow> {
  const result = await admin
    .from("storage_quota")
    .insert({
      plan: input.plan,
      limit_gb: input.limitGb,
      warning_pct: input.warningPct ?? 80,
      updated_by_user_id: input.updatedByUserId,
    })
    .select(QUOTA_COLS)
    .single();
  return ensureDbOk(result) as StorageQuotaRow;
}

export async function updateStorageQuotaFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StorageQuotaRow | null> {
  const result = await admin
    .from("storage_quota")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(QUOTA_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StorageQuotaRow | null) ?? null;
}

const ACK_COLS =
  "id, alert_key, handled_at, handled_by_user_profile_id, reopened_at, created_at, updated_at";

export type PlatformAlertAckRow = {
  id: string;
  alert_key: string;
  handled_at: string | null;
  handled_by_user_profile_id: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPlatformAlertAcks(
  admin: SupabaseClient,
): Promise<PlatformAlertAckRow[]> {
  const result = await admin.from("platform_alert_ack").select(ACK_COLS);
  return (result.data ?? []) as PlatformAlertAckRow[];
}

export async function upsertPlatformAlertHandled(
  admin: SupabaseClient,
  input: { alertKey: string; handledByUserProfileId: string },
): Promise<PlatformAlertAckRow> {
  const now = new Date().toISOString();
  const result = await admin
    .from("platform_alert_ack")
    .upsert(
      {
        alert_key: input.alertKey,
        handled_at: now,
        handled_by_user_profile_id: input.handledByUserProfileId,
        reopened_at: null,
      },
      { onConflict: "alert_key" },
    )
    .select(ACK_COLS)
    .single();
  return ensureDbOk(result, "Failed to handle platform alert") as PlatformAlertAckRow;
}

export async function reopenPlatformAlertAck(
  admin: SupabaseClient,
  alertKey: string,
): Promise<PlatformAlertAckRow | null> {
  const now = new Date().toISOString();
  const result = await admin
    .from("platform_alert_ack")
    .update({
      handled_at: null,
      handled_by_user_profile_id: null,
      reopened_at: now,
    })
    .eq("alert_key", alertKey)
    .select(ACK_COLS)
    .maybeSingle();
  return (result.data as PlatformAlertAckRow | null) ?? null;
}
