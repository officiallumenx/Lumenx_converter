/** Mirrors backend policies domain — keep in sync with backend/src/domains/policies/types.ts */

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

export type DerivedPlatformAlertDto = {
  id: string;
  kind: PolicyRuleKind;
  title: string;
  summary: string;
  severity: PolicySeverity;
  instituteId: string | null;
  instituteName: string | null;
  ruleId: string;
  detectedAt: string;
  handledAt: string | null;
  handledByUserId: string | null;
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
