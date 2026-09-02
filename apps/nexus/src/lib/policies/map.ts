import type {
  AlertSeverity,
  PlatformAlert,
  PlatformAlertKind,
  PlatformAlertRule,
} from "@/lib/platform-policies-alerts-store";
import type { DerivedPlatformAlertDto, PolicyRuleDto, StorageQuotaDto } from "./types";
import type { PlanStorageLimits } from "@/lib/storage-quota-store";

export function mapRuleDtoToUiRule(dto: PolicyRuleDto): PlatformAlertRule {
  return {
    id: dto.id,
    kind: dto.kind as PlatformAlertKind,
    name: dto.name,
    description: dto.description,
    condition: dto.conditionText,
    severityDefault: dto.severityDefault as AlertSeverity,
    enabled: dto.enabled,
    updatedAt: dto.updatedAt,
  };
}

export function mapDerivedAlertToUi(dto: DerivedPlatformAlertDto): PlatformAlert {
  const handled = Boolean(dto.handledAt);
  return {
    id: dto.id,
    kind: dto.kind as PlatformAlertKind,
    title: dto.title,
    summary: dto.summary,
    severity: dto.severity as AlertSeverity,
    lifecycle: handled ? "handled" : "active",
    instituteId: dto.instituteId,
    instituteName: dto.instituteName,
    createdAt: dto.detectedAt,
    updatedAt: dto.detectedAt,
    handledAt: dto.handledAt,
    handledBy: dto.handledByUserId,
    ruleId: dto.ruleId,
  };
}

export function storageQuotasToPlanLimits(quotas: StorageQuotaDto[]): PlanStorageLimits {
  const byPlan = Object.fromEntries(quotas.map((q) => [q.plan, q.limitGb])) as Partial<
    Record<"core" | "plus" | "max", number>
  >;
  return {
    core: byPlan.core ?? 50,
    plus: byPlan.plus ?? 200,
    max: byPlan.max ?? 500,
  };
}

export function planLimitsToUpserts(
  limits: PlanStorageLimits,
  warningPct: number,
): Array<{ plan: "core" | "plus" | "max"; limitGb: number; warningPct: number }> {
  return (["core", "plus", "max"] as const).map((plan) => ({
    plan,
    limitGb: limits[plan],
    warningPct,
  }));
}

export function defaultWarningPct(quotas: StorageQuotaDto[]): number {
  return quotas[0]?.warningPct ?? 80;
}
