import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AlertRuleConfig,
  AlertRuleRow,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "./types.js";

export const ALERT_RULE_COLS =
  "id, institute_id, name, icon_key, description, priority, channels, audience, active, config, created_at, updated_at, deleted_at";

export function configToJson(
  config: AlertRuleConfig | undefined,
): Record<string, unknown> {
  if (!config) return {};
  const out: Record<string, unknown> = {};
  if (config.thresholdPct !== undefined) {
    out.threshold_pct = config.thresholdPct;
  }
  if (config.consecutiveExams !== undefined) {
    out.consecutive_exams = config.consecutiveExams;
  }
  return out;
}

export function configFromJson(
  raw: Record<string, unknown> | null | undefined,
): AlertRuleConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const thresholdPct =
    typeof raw.threshold_pct === "number" ? raw.threshold_pct : undefined;
  const consecutiveExams =
    typeof raw.consecutive_exams === "number"
      ? raw.consecutive_exams
      : undefined;
  if (thresholdPct === undefined && consecutiveExams === undefined) {
    return undefined;
  }
  return { thresholdPct, consecutiveExams };
}

export async function listAlertRules(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AlertRuleRow[]> {
  const result = await admin
    .from("alert_rule")
    .select(ALERT_RULE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return ensureDbOk(result) as AlertRuleRow[];
}

export async function findAlertRuleById(
  admin: SupabaseClient,
  id: string,
): Promise<AlertRuleRow | null> {
  const result = await admin
    .from("alert_rule")
    .select(ALERT_RULE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AlertRuleRow | null) ?? null;
}

export async function insertAlertRule(
  admin: SupabaseClient,
  input: CreateAlertRuleInput & {
    name: string;
    description: string;
    audience: string;
    channels: string[];
  },
): Promise<AlertRuleRow> {
  const result = await admin
    .from("alert_rule")
    .insert({
      institute_id: input.instituteId,
      name: input.name,
      icon_key: input.iconKey ?? "warning",
      description: input.description,
      priority: input.priority ?? "P2",
      channels: input.channels,
      audience: input.audience,
      active: input.active ?? true,
      config: configToJson(input.config),
    })
    .select(ALERT_RULE_COLS)
    .single();
  return ensureDbOk(result) as AlertRuleRow;
}

export function toAlertRuleUpdatePatch(
  input: UpdateAlertRuleInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.iconKey !== undefined) patch.icon_key = input.iconKey;
  if (input.desc !== undefined) patch.description = input.desc.trim();
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.channels !== undefined) patch.channels = [...input.channels];
  if (input.audience !== undefined) patch.audience = input.audience.trim();
  if (input.active !== undefined) patch.active = input.active;
  if (input.config !== undefined) patch.config = configToJson(input.config);
  return patch;
}

export async function updateAlertRuleFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AlertRuleRow | null> {
  const result = await admin
    .from("alert_rule")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ALERT_RULE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AlertRuleRow | null) ?? null;
}

export async function softDeleteAlertRule(
  admin: SupabaseClient,
  id: string,
): Promise<AlertRuleRow | null> {
  const result = await admin
    .from("alert_rule")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ALERT_RULE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AlertRuleRow | null) ?? null;
}
