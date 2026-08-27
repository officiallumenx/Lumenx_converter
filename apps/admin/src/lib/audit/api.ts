/**
 * Institute audit API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AuditEventDto, ListAuditParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Audit API is only available in API auth mode");
  }
}

export async function listInstituteAudit(
  params: ListAuditParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AuditEventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.actorUserId) query.set("actor_user_id", params.actorUserId);
  if (params.entityType) query.set("entity_type", params.entityType);
  if (params.entityId) query.set("entity_id", params.entityId);
  if (params.action) query.set("action", params.action);
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  return client.get<AuditEventDto[]>(`/api/v1/audit?${query.toString()}`);
}
