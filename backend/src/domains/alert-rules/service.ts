import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listComplaintsForActor } from "../complaints/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import {
  configFromJson,
  findAlertRuleById,
  insertAlertRule,
  listAlertRules,
  softDeleteAlertRule,
  toAlertRuleUpdatePatch,
  updateAlertRuleFields,
} from "./repository.js";
import type {
  AlertEvaluateResultDto,
  AlertFireDto,
  AlertRuleDto,
  AlertRuleRow,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "./types.js";

const WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export function toAlertRuleDto(row: AlertRuleRow): AlertRuleDto {
  const channels = Array.isArray(row.channels) ? [...row.channels] : ["Email"];
  const config = configFromJson(row.config ?? undefined);
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    iconKey: row.icon_key,
    desc: row.description,
    priority: row.priority,
    channels,
    audience: row.audience,
    active: row.active,
    ...(config ? { config } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

function assertWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...WRITE_ROLES]);
}

export async function listAlertRulesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AlertRuleDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);
  const rows = await listAlertRules(admin, instituteId);
  return rows.map(toAlertRuleDto);
}

export async function createAlertRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAlertRuleInput,
): Promise<AlertRuleDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertWriter(actor, instituteId);

  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("name is required", { name: ["Required"] });
  }

  const channels =
    input.channels?.length && input.channels.every((c) => c.trim())
      ? input.channels.map((c) => c.trim())
      : ["Email"];
  const audience =
    (input.audience ?? "Institute admin").trim() || "Institute admin";
  const description =
    (input.desc ?? "").trim() || "Custom alert rule";

  const row = await insertAlertRule(admin, {
    ...input,
    instituteId,
    name,
    description,
    audience,
    channels,
  });
  return toAlertRuleDto(row);
}

export async function updateAlertRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  ruleId: string,
  input: UpdateAlertRuleInput,
): Promise<AlertRuleDto> {
  const existing = await findAlertRuleById(admin, ruleId);
  if (!existing) throw AppError.notFound("Alert rule not found");

  assertWriter(actor, existing.institute_id);

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw AppError.validation("name is required", { name: ["Required"] });
    }
  }
  if (input.channels !== undefined && input.channels.length === 0) {
    throw AppError.validation("channels must not be empty", {
      channels: ["Min 1"],
    });
  }
  if (input.audience !== undefined && !input.audience.trim()) {
    throw AppError.validation("audience is required", {
      audience: ["Required"],
    });
  }

  const patch = toAlertRuleUpdatePatch({
    ...input,
    name: input.name !== undefined ? input.name.trim() : undefined,
    channels: input.channels?.map((c) => c.trim()),
    audience: input.audience !== undefined ? input.audience.trim() : undefined,
  });
  if (Object.keys(patch).length === 0) {
    return toAlertRuleDto(existing);
  }

  const updated = await updateAlertRuleFields(admin, ruleId, patch);
  if (!updated) throw AppError.notFound("Alert rule not found");
  return toAlertRuleDto(updated);
}

export async function deleteAlertRuleForActor(
  admin: SupabaseClient,
  actor: Actor,
  ruleId: string,
): Promise<void> {
  const existing = await findAlertRuleById(admin, ruleId);
  if (!existing) throw AppError.notFound("Alert rule not found");

  assertWriter(actor, existing.institute_id);

  const deleted = await softDeleteAlertRule(admin, ruleId);
  if (!deleted) throw AppError.conflict("Alert rule was already deleted");
}

/**
 * Evaluate active rules. Fires from open high-priority complaints when a
 * complaint-type rule is active; otherwise returns { fired: [] }.
 */
export async function evaluateAlertRulesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AlertEvaluateResultDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);

  const rules = (await listAlertRules(admin, instituteId)).filter(
    (r) => r.active,
  );
  const complaintRules = rules.filter((r) => r.icon_key === "complaint");
  if (complaintRules.length === 0) {
    return { fired: [] };
  }

  let complaints: Awaited<ReturnType<typeof listComplaintsForActor>> = [];
  try {
    complaints = await listComplaintsForActor(admin, actor, { instituteId });
  } catch {
    return { fired: [] };
  }

  const openHigh = complaints.filter(
    (c) =>
      c.priority === "high" &&
      (c.status === "pending" ||
        c.status === "review" ||
        c.status === "forwarded"),
  );

  const fired: AlertFireDto[] = [];
  const now = new Date().toISOString();
  for (const rule of complaintRules) {
    for (const c of openHigh) {
      fired.push({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        title: `${rule.name}: ${c.title}`,
        at: now,
        complaintId: c.id,
      });
    }
  }

  return { fired };
}
