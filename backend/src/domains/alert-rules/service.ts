import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listComplaintsForActor } from "../complaints/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import type {
  AlertEvaluateResultDto,
  AlertFireDto,
  AlertRuleDto,
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

/** In-memory rules keyed by institute (Stage 9 stub). */
const rulesByInstitute = new Map<string, AlertRuleDto[]>();

function seedDefaults(instituteId: string): AlertRuleDto[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      instituteId,
      name: "Attendance drop",
      iconKey: "attendance",
      desc: "Triggers when a student's monthly attendance falls below threshold.",
      priority: "P2",
      channels: ["Email", "Parent app"],
      audience: "Class teacher · Parent",
      active: true,
      config: { thresholdPct: 75 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      instituteId,
      name: "Complaint escalation",
      iconKey: "complaint",
      desc: "Triggers when a high-priority complaint sits unresolved.",
      priority: "P0",
      channels: ["SMS", "Push", "Email"],
      audience: "Principal · Admin",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function getOrSeed(instituteId: string): AlertRuleDto[] {
  let list = rulesByInstitute.get(instituteId);
  if (!list) {
    list = seedDefaults(instituteId);
    rulesByInstitute.set(instituteId, list);
  }
  return list;
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

export function listAlertRulesForActor(
  actor: Actor,
  instituteIdRaw: string,
): AlertRuleDto[] {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);
  return getOrSeed(instituteId).map((r) => ({ ...r, channels: [...r.channels] }));
}

export function createAlertRuleForActor(
  actor: Actor,
  input: CreateAlertRuleInput,
): AlertRuleDto {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertWriter(actor, instituteId);

  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("name is required", { name: ["Required"] });
  }

  const now = new Date().toISOString();
  const rule: AlertRuleDto = {
    id: crypto.randomUUID(),
    instituteId,
    name,
    iconKey: input.iconKey ?? "warning",
    desc: (input.desc ?? "").trim() || "Custom alert rule",
    priority: input.priority ?? "P2",
    channels: input.channels?.length ? [...input.channels] : ["Email"],
    audience: (input.audience ?? "Institute admin").trim() || "Institute admin",
    active: input.active ?? true,
    config: input.config,
    createdAt: now,
    updatedAt: now,
  };

  const list = getOrSeed(instituteId);
  list.unshift(rule);
  rulesByInstitute.set(instituteId, list);
  return { ...rule, channels: [...rule.channels] };
}

export function updateAlertRuleForActor(
  actor: Actor,
  ruleId: string,
  input: UpdateAlertRuleInput,
): AlertRuleDto {
  // Find across institutes the actor can access — rule carries instituteId.
  let found: AlertRuleDto | undefined;
  let foundInstitute: string | undefined;
  for (const [instituteId, list] of rulesByInstitute) {
    const hit = list.find((r) => r.id === ruleId);
    if (hit) {
      found = hit;
      foundInstitute = instituteId;
      break;
    }
  }
  if (!found || !foundInstitute) {
    throw AppError.notFound("Alert rule not found");
  }

  assertWriter(actor, foundInstitute);

  const now = new Date().toISOString();
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw AppError.validation("name is required", { name: ["Required"] });
    }
    found.name = name;
  }
  if (input.iconKey !== undefined) found.iconKey = input.iconKey;
  if (input.desc !== undefined) found.desc = input.desc.trim();
  if (input.priority !== undefined) found.priority = input.priority;
  if (input.channels !== undefined) found.channels = [...input.channels];
  if (input.audience !== undefined) found.audience = input.audience.trim();
  if (input.active !== undefined) found.active = input.active;
  if (input.config !== undefined) found.config = input.config;
  found.updatedAt = now;

  return { ...found, channels: [...found.channels] };
}

/**
 * Evaluate active rules. Stage 9 stub: fires from open high-priority complaints
 * when a complaint-type rule is active; otherwise returns { fired: [] }.
 */
export async function evaluateAlertRulesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AlertEvaluateResultDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReader(actor, instituteId);

  const rules = getOrSeed(instituteId).filter((r) => r.active);
  const complaintRules = rules.filter((r) => r.iconKey === "complaint");
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

/** Test helper. */
export function resetAlertRulesForTests(): void {
  rulesByInstitute.clear();
}
