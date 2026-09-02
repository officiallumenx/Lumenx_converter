import { ApiClientError } from "@/lib/api";
import { isNexusApiMode } from "@/lib/auth-mode";
import {
  listDerivedPlatformAlerts,
  listPolicyRules,
  listStorageQuotas,
} from "./api";
import {
  mapDerivedAlertToUi,
  mapRuleDtoToUiRule,
  storageQuotasToPlanLimits,
  defaultWarningPct,
} from "./map";
import type { PlatformAlert, PlatformAlertRule } from "@/lib/platform-policies-alerts-store";
import type { PlanStorageLimits } from "@/lib/storage-quota-store";

export type PoliciesLoadState =
  | { status: "loading" }
  | {
      status: "ready";
      source: "api";
      rules: PlatformAlertRule[];
      alerts: PlatformAlert[];
      quotas: PlanStorageLimits;
      warningPct: number;
    }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forbidden: boolean;
    };

export type StorageQuotasLoadState =
  | { status: "loading" }
  | {
      status: "ready";
      source: "api";
      limits: PlanStorageLimits;
      warningPct: number;
    }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forbidden: boolean;
    };

function toErrorState(err: unknown): {
  status: "error";
  message: string;
  unauthorized: boolean;
  forbidden: boolean;
} {
  if (err instanceof ApiClientError) {
    return {
      status: "error",
      message: err.message,
      unauthorized: err.status === 401 || err.code === "UNAUTHENTICATED",
      forbidden: err.status === 403 || err.code === "FORBIDDEN",
    };
  }
  return {
    status: "error",
    message: err instanceof Error ? err.message : "Unable to load policies.",
    unauthorized: false,
    forbidden: false,
  };
}

/** Load rules + derived alerts for /policies — API mode never falls back to demo. */
export async function loadPoliciesWorkspace(): Promise<PoliciesLoadState> {
  if (!isNexusApiMode()) {
    throw new Error("loadPoliciesWorkspace is API mode only");
  }
  try {
    const [ruleDtos, alertDtos, quotaDtos] = await Promise.all([
      listPolicyRules(),
      listDerivedPlatformAlerts(),
      listStorageQuotas(),
    ]);
    return {
      status: "ready",
      source: "api",
      rules: ruleDtos.map(mapRuleDtoToUiRule),
      alerts: alertDtos.map(mapDerivedAlertToUi),
      quotas: storageQuotasToPlanLimits(quotaDtos),
      warningPct: defaultWarningPct(quotaDtos),
    };
  } catch (err) {
    return toErrorState(err);
  }
}

/** Load plan storage quotas for /storage API editor. */
export async function loadStorageQuotasFromApi(): Promise<StorageQuotasLoadState> {
  if (!isNexusApiMode()) {
    throw new Error("loadStorageQuotasFromApi is API mode only");
  }
  try {
    const quotaDtos = await listStorageQuotas();
    return {
      status: "ready",
      source: "api",
      limits: storageQuotasToPlanLimits(quotaDtos),
      warningPct: defaultWarningPct(quotaDtos),
    };
  } catch (err) {
    return toErrorState(err);
  }
}

export function computePolicyAlertStats(
  alerts: PlatformAlert[],
  rules: PlatformAlertRule[],
) {
  const active = alerts.filter((a) => a.lifecycle === "active" && !a.handledAt);
  const handled = alerts.filter((a) => a.lifecycle === "handled" || a.handledAt);
  return {
    active: active.length,
    handled: handled.length,
    critical: active.filter((a) => a.severity === "critical").length,
    high: active.filter((a) => a.severity === "high").length,
    rulesEnabled: rules.filter((r) => r.enabled).length,
    rulesTotal: rules.length,
  };
}
