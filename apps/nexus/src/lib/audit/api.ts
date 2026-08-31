/**
 * Platform audit log API — Nexus operators only (/api/nexus/audit).
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type { ListPlatformAuditParams, PlatformAuditEventDto } from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus audit API is only available in API auth mode");
  }
}

export async function listPlatformAuditEvents(
  params: ListPlatformAuditParams = {},
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformAuditEventDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  if (params.action?.trim()) query.set("action", params.action.trim());
  if (params.entityType?.trim()) query.set("entity_type", params.entityType.trim());
  if (params.entityId?.trim()) query.set("entity_id", params.entityId.trim());
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const rows = await client.get<PlatformAuditEventDto[]>(`/api/nexus/audit${suffix}`);
  return rows.map((row) => ({ ...row, scope: "platform" as const }));
}

export async function getPlatformAuditEvent(
  id: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformAuditEventDto> {
  assertApiMode();
  const row = await client.get<PlatformAuditEventDto>(`/api/nexus/audit/${id}`);
  return { ...row, scope: "platform" };
}
