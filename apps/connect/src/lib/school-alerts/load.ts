import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  acknowledgeAllPortalSchoolAlerts,
  acknowledgePortalSchoolAlert,
  listPortalSchoolAlerts,
} from "./api";
import { portalSchoolAlertsToSchoolAlerts } from "./map";
import type { SchoolAlert } from "@lumenx/types";

export type SchoolAlertsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "needs_institute"
  | "forbidden";

export async function loadPortalSchoolAlerts(input: {
  instituteId: string | null;
}): Promise<{
  status: SchoolAlertsLoadStatus;
  alerts: SchoolAlert[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", alerts: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", alerts: [], errorMessage: null };
  }
  try {
    const dtos = await listPortalSchoolAlerts({ instituteId: input.instituteId });
    const alerts = portalSchoolAlertsToSchoolAlerts(dtos);
    return {
      status: alerts.length === 0 ? "empty" : "ready",
      alerts,
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
    const message = err instanceof Error ? err.message : "Failed to load alerts";
    if (status === 403) {
      return { status: "forbidden", alerts: [], errorMessage: message };
    }
    return { status: "error", alerts: [], errorMessage: message };
  }
}

export async function ackPortalSchoolAlert(recipientId: string): Promise<SchoolAlert> {
  const dto = await acknowledgePortalSchoolAlert(recipientId);
  return portalSchoolAlertsToSchoolAlerts([dto])[0]!;
}

export async function ackAllPortalSchoolAlerts(
  instituteId: string,
): Promise<number> {
  const result = await acknowledgeAllPortalSchoolAlerts(instituteId);
  return result.acknowledged;
}
