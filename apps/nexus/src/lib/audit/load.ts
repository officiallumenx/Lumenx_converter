import { ApiClientError } from "@/lib/api";
import { isNexusApiMode } from "@/lib/auth-mode";
import { listAuditRecords } from "@/lib/audit-log-store";
import { listPlatformAuditEvents } from "./api";
import { auditEventDtosToListItems, demoAuditRecordsToListItems } from "./map";
import type { PlatformAuditListItem } from "./types";

export type PlatformAuditLoadState =
  | { status: "loading" }
  | { status: "ready"; source: "api" | "demo"; items: PlatformAuditListItem[] }
  | { status: "empty"; source: "api" | "demo" }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forbidden: boolean;
    };

/** Load platform audit log — API mode never falls back to demo localStorage. */
export async function loadPlatformAuditLog(): Promise<PlatformAuditLoadState> {
  if (isNexusApiMode()) {
    try {
      const dtos = await listPlatformAuditEvents({ limit: 200 });
      const items = auditEventDtosToListItems(dtos);
      return items.length === 0
        ? { status: "empty", source: "api" }
        : { status: "ready", source: "api", items };
    } catch (err) {
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
        message: err instanceof Error ? err.message : "Unable to load audit log.",
        unauthorized: false,
        forbidden: false,
      };
    }
  }

  const demoItems = demoAuditRecordsToListItems(listAuditRecords());
  return demoItems.length === 0
    ? { status: "empty", source: "demo" }
    : { status: "ready", source: "demo", items: demoItems };
}

export function computeAuditStats(items: PlatformAuditListItem[]) {
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  return {
    total: items.length,
    last24h: items.filter((r) => new Date(r.at).getTime() >= last24h).length,
    institutes: items.filter((r) => r.action.startsWith("institute_")).length,
    commercial: items.filter((r) =>
      ["plan_changed", "billing_changed", "module_enabled", "module_disabled"].includes(
        r.action,
      ),
    ).length,
    governance: items.filter((r) =>
      [
        "policy_changed",
        "support_status_changed",
        "platform_setting_changed",
        "registration_approved",
        "registration_rejected",
      ].includes(r.action),
    ).length,
  };
}
