/**
 * Alert rules API — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AlertEvaluateResultDto,
  AlertRuleDto,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Alert rules API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listAlertRules(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertRuleDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<AlertRuleDto[]>(`/api/v1/alert-rules?${query.toString()}`);
}

export async function createAlertRule(
  input: CreateAlertRuleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertRuleDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AlertRuleDto>("/api/v1/alert-rules", {
    institute_id: input.instituteId.trim(),
    name: input.name,
    icon_key: input.iconKey,
    desc: input.desc,
    priority: input.priority,
    channels: input.channels,
    audience: input.audience,
    active: input.active,
  });
}

export async function updateAlertRule(
  ruleId: string,
  input: UpdateAlertRuleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertRuleDto> {
  assertApiMode();
  if (!isInstituteUuid(ruleId)) {
    throw new Error("rule id must be a valid UUID");
  }
  return client.patch<AlertRuleDto>(`/api/v1/alert-rules/${ruleId}`, {
    name: input.name,
    icon_key: input.iconKey,
    desc: input.desc,
    priority: input.priority,
    channels: input.channels,
    audience: input.audience,
    active: input.active,
    config: input.config
      ? {
          threshold_pct: input.config.thresholdPct,
          consecutive_exams: input.config.consecutiveExams,
        }
      : undefined,
  });
}

export async function deleteAlertRule(
  ruleId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(ruleId)) {
    throw new Error("rule id must be a valid UUID");
  }
  await client.delete(`/api/v1/alert-rules/${ruleId.trim()}`);
}

export async function evaluateAlertRules(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertEvaluateResultDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.post<AlertEvaluateResultDto>(
    `/api/v1/alert-rules/evaluate?${query.toString()}`,
    {},
  );
}

export async function listAlertFires(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertFireDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<AlertFireDto[]>(`/api/v1/alert-rules/fires?${query.toString()}`);
}

export async function resolveAlertFire(
  fireId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AlertFireDto> {
  assertApiMode();
  if (!isInstituteUuid(fireId)) {
    throw new Error("fire id must be a valid UUID");
  }
  return client.patch<AlertFireDto>(`/api/v1/alert-rules/fires/${fireId.trim()}/resolve`, {});
}
