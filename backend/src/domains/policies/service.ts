import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertPlatformOperator,
  assertPlatformRoles,
} from "../../authorization/index.js";
import { NEXUS_PLATFORM_CONFIG_WRITE_ROLES } from "../nexus/service.js";
import {
  findPolicyRuleById,
  findPolicyRuleByKind,
  findStorageQuotaById,
  findStorageQuotaByPlan,
  insertPolicyRule,
  insertStorageQuota,
  listPolicyRules,
  listStorageQuotas,
  softDeletePolicyRule,
  updatePolicyRuleFields,
  updateStorageQuotaFields,
} from "./repository.js";
import type {
  CreatePolicyRuleInput,
  PolicyRuleDto,
  PolicyRuleKind,
  PolicyRuleRow,
  PolicySeverity,
  StoragePlan,
  StorageQuotaDto,
  StorageQuotaRow,
  UpdatePolicyRuleInput,
  UpsertStorageQuotaInput,
} from "./types.js";

const KINDS: PolicyRuleKind[] = [
  "payment_overdue",
  "renewal_approaching",
  "storage_quota_exceeded",
  "platform_incident",
  "security_issue",
  "sla_breach",
  "institute_usage_risk",
  "support_escalation",
];

const SEVERITIES: PolicySeverity[] = ["low", "medium", "high", "critical"];
const PLANS: StoragePlan[] = ["core", "plus", "max"];

function assertPoliciesReader(actor: Actor): void {
  assertPlatformOperator(actor);
}

function assertPoliciesWriter(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_PLATFORM_CONFIG_WRITE_ROLES]);
}

export function toPolicyRuleDto(row: PolicyRuleRow): PolicyRuleDto {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    conditionText: row.condition_text,
    severityDefault: row.severity_default,
    enabled: row.enabled,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStorageQuotaDto(row: StorageQuotaRow): StorageQuotaDto {
  return {
    id: row.id,
    plan: row.plan,
    limitGb: row.limit_gb,
    warningPct: row.warning_pct,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRulesForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<PolicyRuleDto[]> {
  assertPoliciesReader(actor);
  const rows = await listPolicyRules(admin);
  return rows.map(toPolicyRuleDto);
}

export async function getRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PolicyRuleDto> {
  assertPoliciesReader(actor);
  const row = await findPolicyRuleById(admin, id);
  if (!row) throw AppError.notFound("Policy rule not found");
  return toPolicyRuleDto(row);
}

export async function createRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreatePolicyRuleInput,
): Promise<PolicyRuleDto> {
  assertPoliciesWriter(actor);

  if (!KINDS.includes(input.kind)) {
    throw AppError.validation("Invalid kind");
  }
  const name = input.name.trim();
  if (!name) throw AppError.validation("name is required");

  if (
    input.severityDefault !== undefined &&
    !SEVERITIES.includes(input.severityDefault)
  ) {
    throw AppError.validation("Invalid severityDefault");
  }

  const existing = await findPolicyRuleByKind(admin, input.kind);
  if (existing) {
    throw AppError.conflict("Policy rule kind already exists");
  }

  const row = await insertPolicyRule(admin, {
    ...input,
    name,
    description: input.description?.trim() ?? "",
    conditionText: input.conditionText?.trim() ?? "",
    updatedByUserId: actor.userId,
  });
  return toPolicyRuleDto(row);
}

export async function updateRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdatePolicyRuleInput,
): Promise<PolicyRuleDto> {
  assertPoliciesWriter(actor);

  const existing = await findPolicyRuleById(admin, id);
  if (!existing) throw AppError.notFound("Policy rule not found");

  const patch: Record<string, unknown> = {
    updated_by_user_id: actor.userId,
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw AppError.validation("name is required");
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description.trim();
  }
  if (input.conditionText !== undefined) {
    patch.condition_text = input.conditionText.trim();
  }
  if (input.severityDefault !== undefined) {
    if (!SEVERITIES.includes(input.severityDefault)) {
      throw AppError.validation("Invalid severityDefault");
    }
    patch.severity_default = input.severityDefault;
  }
  if (input.enabled !== undefined) {
    patch.enabled = input.enabled;
  }

  if (Object.keys(patch).length <= 1) {
    throw AppError.validation("At least one field is required");
  }

  const updated = await updatePolicyRuleFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Policy rule not found");
  return toPolicyRuleDto(updated);
}

export async function deleteRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  assertPoliciesWriter(actor);
  const existing = await findPolicyRuleById(admin, id);
  if (!existing) throw AppError.notFound("Policy rule not found");
  const deleted = await softDeletePolicyRule(admin, id, actor.userId);
  if (!deleted) throw AppError.notFound("Policy rule not found");
}

export async function listQuotasForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<StorageQuotaDto[]> {
  assertPoliciesReader(actor);
  const rows = await listStorageQuotas(admin);
  return rows.map(toStorageQuotaDto);
}

export async function getQuotaForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<StorageQuotaDto> {
  assertPoliciesReader(actor);
  const row = await findStorageQuotaById(admin, id);
  if (!row) throw AppError.notFound("Storage quota not found");
  return toStorageQuotaDto(row);
}

export async function upsertQuotaForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertStorageQuotaInput,
): Promise<StorageQuotaDto> {
  assertPoliciesWriter(actor);

  if (!PLANS.includes(input.plan)) {
    throw AppError.validation("Invalid plan");
  }
  if (!Number.isInteger(input.limitGb) || input.limitGb < 1) {
    throw AppError.validation("limitGb must be an integer >= 1");
  }
  const warningPct = input.warningPct ?? 80;
  if (
    !Number.isInteger(warningPct) ||
    warningPct < 1 ||
    warningPct > 100
  ) {
    throw AppError.validation("warningPct must be an integer 1–100");
  }

  const existing = await findStorageQuotaByPlan(admin, input.plan);
  if (existing) {
    const updated = await updateStorageQuotaFields(admin, existing.id, {
      limit_gb: input.limitGb,
      warning_pct: warningPct,
      updated_by_user_id: actor.userId,
    });
    if (!updated) throw AppError.notFound("Storage quota not found");
    return toStorageQuotaDto(updated);
  }

  const created = await insertStorageQuota(admin, {
    plan: input.plan,
    limitGb: input.limitGb,
    warningPct,
    updatedByUserId: actor.userId,
  });
  return toStorageQuotaDto(created);
}
