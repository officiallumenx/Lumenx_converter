import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { emitNotificationForActor, emitNotificationForInstituteSystem } from "../notifications/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import { listActiveInstitutesForLogin, listMemberships } from "../identity/repository.js";
import { createSystemWorkerActor } from "../jobs/system-actor.js";
import {
  configFromJson,
  findAlertRuleById,
  insertAlertRule,
  listAlertRules,
  softDeleteAlertRule,
  toAlertRuleUpdatePatch,
  updateAlertRuleFields,
} from "./repository.js";
import {
  findAlertFireById,
  insertAlertFire,
  listAlertFires,
  resolveAlertFire,
  type AlertFireRow,
} from "./fire-repository.js";
import { collectCandidateFires } from "./evaluate-rules.js";
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

function toAlertFireDto(row: AlertFireRow): AlertFireDto {
  return {
    id: row.id,
    ruleId: row.rule_id,
    title: row.title,
    at: row.fired_at,
    complaintId: row.complaint_id ?? undefined,
    resolvedAt: row.resolved_at,
    detail: row.detail,
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

function audienceForRule(rule: AlertRuleRow): "teachers" | "parents" | "students" | "everyone" {
  const aud = rule.audience.toLowerCase();
  if (aud.includes("parent")) return "parents";
  if (aud.includes("student")) return "students";
  if (aud.includes("teacher")) return "teachers";
  return "everyone";
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

export async function listAlertFiresForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AlertFireDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);
  const rows = await listAlertFires(admin, instituteId, { unresolvedOnly: true });
  return rows.map(toAlertFireDto);
}

export async function resolveAlertFireForActor(
  admin: SupabaseClient,
  actor: Actor,
  fireId: string,
): Promise<AlertFireDto> {
  const existing = await findAlertFireById(admin, fireId);
  if (!existing) throw AppError.notFound("Alert fire not found");
  assertWriter(actor, existing.institute_id);
  const resolved = await resolveAlertFire(admin, fireId, actor.userId);
  if (!resolved) {
    throw AppError.conflict("Alert fire is already resolved");
  }
  return toAlertFireDto(resolved);
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
 * Evaluate active rules, persist new fires, and notify institute staff.
 */
export async function evaluateAlertRulesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AlertEvaluateResultDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);
  return evaluateAlertRulesInternal(admin, actor, instituteId, actor.userId);
}

async function evaluateAlertRulesInternal(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  emitAsUserId: string,
): Promise<AlertEvaluateResultDto & { newlyFired: number }> {
  const rules = (await listAlertRules(admin, instituteId)).filter((r) => r.active);
  if (rules.length === 0) {
    return { fired: [] };
  }

  const candidates = await collectCandidateFires(admin, actor, instituteId, rules);
  const existing = await listAlertFires(admin, instituteId, { unresolvedOnly: true });
  const existingKeys = new Set(
    existing.map((row) => {
      const meta = row.metadata ?? {};
      return typeof meta.dedupeKey === "string" ? meta.dedupeKey : row.id;
    }),
  );

  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const persisted: AlertFireDto[] = [];

  for (const candidate of candidates) {
    if (existingKeys.has(candidate.dedupeKey)) continue;
    const rule = ruleById.get(candidate.ruleId);
    if (!rule) continue;

    const row = await insertAlertFire(admin, {
      instituteId,
      ruleId: candidate.ruleId,
      title: candidate.title,
      detail: candidate.detail,
      complaintId: candidate.complaintId ?? null,
      metadata: { ...candidate.metadata, dedupeKey: candidate.dedupeKey },
    });
    existingKeys.add(candidate.dedupeKey);
    persisted.push(toAlertFireDto(row));

    try {
      await emitNotificationForInstituteSystem(admin, emitAsUserId, {
        instituteId,
        category: "system",
        priority: rule.priority === "P0" ? "critical" : "important",
        title: rule.name,
        body: candidate.title,
        deepLink: "/alerts",
        payload: {
          presentation: "alert",
          alertSeverity: rule.priority === "P0" ? "emergency" : "mandatory",
          ruleId: rule.id,
          alertFireId: row.id,
        },
        audience: audienceForRule(rule),
        dedupeKey: `alert-fire:${row.id}`,
      });
    } catch {
      // Evaluation still returns persisted fires when notify fan-out fails.
    }
  }

  const unresolved = await listAlertFires(admin, instituteId, { unresolvedOnly: true });
  return {
    fired: unresolved.map(toAlertFireDto),
    newlyFired: persisted.length,
  };
}

/**
 * Background worker: evaluate alert rules for every active institute.
 */
export async function evaluateAlertRulesSystem(
  admin: SupabaseClient,
): Promise<{ institutes: number; newlyFired: number }> {
  const institutes = await listActiveInstitutesForLogin(admin);
  const systemActor = createSystemWorkerActor();
  let newlyFired = 0;

  for (const institute of institutes) {
    const memberships = await listMemberships(admin, {
      instituteId: institute.id,
      status: "active",
    });
    const emitAsUserId = memberships[0]?.user_id ?? systemActor.userId;
    const result = await evaluateAlertRulesInternal(
      admin,
      systemActor,
      institute.id,
      emitAsUserId,
    );
    newlyFired += result.newlyFired;
  }

  return { institutes: institutes.length, newlyFired };
}
