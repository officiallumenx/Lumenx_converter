/** Institute alert rules — durable Postgres-backed config. */

export type AlertRulePriority = "P0" | "P1" | "P2" | "P3";

export type AlertRuleIconKey =
  | "attendance"
  | "warning"
  | "complaint"
  | "security"
  | "emergency";

export type AlertRuleConfig = {
  thresholdPct?: number;
  consecutiveExams?: number;
};

export type AlertRuleRow = {
  id: string;
  institute_id: string;
  name: string;
  icon_key: AlertRuleIconKey;
  description: string;
  priority: AlertRulePriority;
  channels: string[];
  audience: string;
  active: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AlertRuleDto = {
  id: string;
  instituteId: string;
  name: string;
  iconKey: AlertRuleIconKey;
  desc: string;
  priority: AlertRulePriority;
  channels: string[];
  audience: string;
  active: boolean;
  config?: AlertRuleConfig;
  createdAt: string;
  updatedAt: string;
};

export type CreateAlertRuleInput = {
  instituteId: string;
  name: string;
  iconKey?: AlertRuleIconKey;
  desc?: string;
  priority?: AlertRulePriority;
  channels?: string[];
  audience?: string;
  active?: boolean;
  config?: AlertRuleConfig;
};

export type UpdateAlertRuleInput = {
  name?: string;
  iconKey?: AlertRuleIconKey;
  desc?: string;
  priority?: AlertRulePriority;
  channels?: string[];
  audience?: string;
  active?: boolean;
  config?: AlertRuleConfig;
};

export type AlertFireDto = {
  id: string;
  ruleId: string;
  title: string;
  at: string;
  complaintId?: string;
  resolvedAt?: string | null;
  detail?: string;
};

export type AlertEvaluateResultDto = {
  fired: AlertFireDto[];
};
