/** Nexus policies + storage quota foundation (step 6.3). */

export type PolicyRuleKind =
  | "payment_overdue"
  | "renewal_approaching"
  | "storage_quota_exceeded"
  | "platform_incident"
  | "security_issue"
  | "sla_breach"
  | "institute_usage_risk"
  | "support_escalation";

export type PolicySeverity = "low" | "medium" | "high" | "critical";

export type StoragePlan = "core" | "plus" | "max";

export type PolicyRuleRow = {
  id: string;
  kind: PolicyRuleKind;
  name: string;
  description: string;
  condition_text: string;
  severity_default: PolicySeverity;
  enabled: boolean;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StorageQuotaRow = {
  id: string;
  plan: StoragePlan;
  limit_gb: number;
  warning_pct: number;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PolicyRuleDto = {
  id: string;
  kind: PolicyRuleKind;
  name: string;
  description: string;
  conditionText: string;
  severityDefault: PolicySeverity;
  enabled: boolean;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StorageQuotaDto = {
  id: string;
  plan: StoragePlan;
  limitGb: number;
  warningPct: number;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePolicyRuleInput = {
  kind: PolicyRuleKind;
  name: string;
  description?: string;
  conditionText?: string;
  severityDefault?: PolicySeverity;
  enabled?: boolean;
};

export type UpdatePolicyRuleInput = {
  name?: string;
  description?: string;
  conditionText?: string;
  severityDefault?: PolicySeverity;
  enabled?: boolean;
};

export type UpsertStorageQuotaInput = {
  plan: StoragePlan;
  limitGb: number;
  warningPct?: number;
};
