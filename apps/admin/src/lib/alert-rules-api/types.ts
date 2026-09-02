/** Mirrors backend alert-rules DTOs. */

export type AlertRulePriority = "P0" | "P1" | "P2" | "P3";

export type AlertRuleIconKey =
  | "attendance"
  | "warning"
  | "complaint"
  | "security"
  | "emergency";

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
  config?: {
    thresholdPct?: number;
    consecutiveExams?: number;
  };
  createdAt: string;
  updatedAt: string;
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

export type CreateAlertRuleInput = {
  instituteId: string;
  name: string;
  iconKey?: AlertRuleIconKey;
  desc?: string;
  priority?: AlertRulePriority;
  channels?: string[];
  audience?: string;
  active?: boolean;
};

export type UpdateAlertRuleInput = {
  name?: string;
  iconKey?: AlertRuleIconKey;
  desc?: string;
  priority?: AlertRulePriority;
  channels?: string[];
  audience?: string;
  active?: boolean;
  config?: AlertRuleDto["config"];
};
