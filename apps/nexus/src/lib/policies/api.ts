/**
 * Nexus platform policies API — call only in API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type {
  DerivedPlatformAlertDto,
  PolicyRuleDto,
  StorageQuotaDto,
  UpdatePolicyRuleInput,
  UpsertStorageQuotaInput,
} from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus policies API is only available in API auth mode");
  }
}

export async function listPolicyRules(
  client: NexusApiClient = getNexusApiClient(),
): Promise<PolicyRuleDto[]> {
  assertApiMode();
  return client.get<PolicyRuleDto[]>("/api/nexus/policies/rules");
}

export async function updatePolicyRule(
  ruleId: string,
  input: UpdatePolicyRuleInput,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PolicyRuleDto> {
  assertApiMode();
  return client.request<PolicyRuleDto>(`/api/nexus/policies/rules/${ruleId}`, {
    method: "PATCH",
    body: {
      name: input.name,
      description: input.description,
      condition_text: input.conditionText,
      severity_default: input.severityDefault,
      enabled: input.enabled,
    },
  });
}

export async function listDerivedPlatformAlerts(
  client: NexusApiClient = getNexusApiClient(),
): Promise<DerivedPlatformAlertDto[]> {
  assertApiMode();
  return client.get<DerivedPlatformAlertDto[]>("/api/nexus/policies/alerts");
}

export async function handlePlatformAlert(
  alertKey: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<{ alertKey: string; handledAt: string }> {
  assertApiMode();
  return client.request<{ alertKey: string; handledAt: string }>(
    `/api/nexus/policies/alerts/${encodeURIComponent(alertKey)}/handle`,
    { method: "POST" },
  );
}

export async function reopenPlatformAlert(
  alertKey: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<{ alertKey: string; reopenedAt: string | null }> {
  assertApiMode();
  return client.request<{ alertKey: string; reopenedAt: string | null }>(
    `/api/nexus/policies/alerts/${encodeURIComponent(alertKey)}/reopen`,
    { method: "POST" },
  );
}

export async function listStorageQuotas(
  client: NexusApiClient = getNexusApiClient(),
): Promise<StorageQuotaDto[]> {
  assertApiMode();
  return client.get<StorageQuotaDto[]>("/api/nexus/policies/storage-quotas");
}

export async function upsertStorageQuota(
  input: UpsertStorageQuotaInput,
  client: NexusApiClient = getNexusApiClient(),
): Promise<StorageQuotaDto> {
  assertApiMode();
  return client.request<StorageQuotaDto>("/api/nexus/policies/storage-quotas", {
    method: "PUT",
    body: {
      plan: input.plan,
      limit_gb: input.limitGb,
      warning_pct: input.warningPct,
    },
  });
}
