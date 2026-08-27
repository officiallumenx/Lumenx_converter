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
