import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { evaluateAlertRules, listAlertFires, listAlertRules } from "./api";
import type { AlertFireDto, AlertRuleDto } from "./types";

export type AlertRulesLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AlertRulesState = {
  status: AlertRulesLoadStatus;
  rules: AlertRuleDto[];
  /** Empty on load — evaluate is an explicit user action, not a side effect of open. */
  fired: AlertFireDto[];
  errorMessage: string | null;
};

export async function loadAlertRules(
  activeInstituteId: string | null,
): Promise<AlertRulesState> {
  if (!isApiAuthMode()) {
    return { status: "demo", rules: [], fired: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", rules: [], fired: [], errorMessage: null };
  }
  try {
    const [rules, fired] = await Promise.all([
      listAlertRules(activeInstituteId),
      listAlertFires(activeInstituteId),
    ]);
    return {
      status: rules.length === 0 ? "empty" : "ready",
      rules,
      fired,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load alert rules";
    if (status === 403) {
      return { status: "forbidden", rules: [], fired: [], errorMessage: message };
    }
    return { status: "error", rules: [], fired: [], errorMessage: message };
  }
}

/** Explicit evaluate — not called from loadAlertRules. */
export async function runAlertRulesEvaluation(
  activeInstituteId: string,
): Promise<AlertFireDto[]> {
  if (!isApiAuthMode()) {
    throw new Error("Alert rules API is only available in API auth mode");
  }
  if (!isInstituteUuid(activeInstituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const result = await evaluateAlertRules(activeInstituteId);
  return result.fired;
}
