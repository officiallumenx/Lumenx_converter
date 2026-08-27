import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  assertPlatformOperator,
  assertPlatformRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findAuditEventById,
  insertAuditEvent,
  listAuditEvents,
} from "./repository.js";
import type {
  AppendAuditInput,
  AuditEventDto,
  AuditEventRow,
  ListAuditFilter,
} from "./types.js";

/** Matches foundation RLS readers for institute audit. */
export const AUDIT_INSTITUTE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
] as const;

/** Platform roles allowed to emit platform-scope audit from trusted server paths. */
export const AUDIT_PLATFORM_WRITE_ROLES = [
  "nexus_root",
  "operations",
  "billing",
  "support",
] as const;

const PRIVATE_CHAT_BLOCKLIST = [
  "private chat",
  "direct message",
  " dm",
  "dm ",
  "conversation",
  "chat message",
  "message thread",
  "inbox message",
  "transcript",
];

const BLOCKED_ENTITY_TYPES = new Set([
  "message",
  "chat",
  "dm",
  "thread",
  "conversation",
  "inbox",
  "direct_message",
]);

export function toAuditEventDto(row: AuditEventRow): AuditEventDto {
  return {
    id: row.id,
    scope: row.scope,
    instituteId: row.institute_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function assertNoPrivateChatContent(...parts: string[]): void {
  const haystack = ` ${parts.join(" ").toLowerCase()} `;
  for (const term of PRIVATE_CHAT_BLOCKLIST) {
    if (haystack.includes(term)) {
      throw AppError.validation(
        "Audit events must not record private communications",
      );
    }
  }
}

function normalizeText(value: string, field: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw AppError.validation(`${field} is required`);
  if (trimmed.length > max) {
    throw AppError.validation(`${field} must be at most ${max} characters`);
  }
  return trimmed;
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  const keys = Object.keys(metadata);
  if (keys.length > 40) {
    throw AppError.validation("metadata may have at most 40 keys");
  }
  const encoded = JSON.stringify(metadata);
  if (encoded.length > 8_000) {
    throw AppError.validation("metadata is too large");
  }
  assertNoPrivateChatContent(keys.join(" "), encoded);
  return metadata;
}

function assertCanReadInstitute(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...AUDIT_INSTITUTE_ROLES]);
}

/**
 * Server-side write gate for institute audit.
 * Platform operators must hold a commercial/ops write role (not analyst).
 */
function assertCanWriteInstitute(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) {
    assertPlatformRoles(actor, [...AUDIT_PLATFORM_WRITE_ROLES]);
    return;
  }
  assertInstituteRoles(actor, instituteId, [...AUDIT_INSTITUTE_ROLES]);
}

function validateAppendFields(input: {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): {
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
} {
  const action = normalizeText(input.action, "action", 200);
  const entityType = normalizeText(input.entityType, "entityType", 100);
  const entityId = normalizeText(input.entityId, "entityId", 200);

  if (BLOCKED_ENTITY_TYPES.has(entityType.toLowerCase())) {
    throw AppError.validation(
      "Audit events must not record private communications",
    );
  }

  assertNoPrivateChatContent(action, entityType, entityId);
  const metadata = sanitizeMetadata(input.metadata);
  return { action, entityType, entityId, metadata };
}

export async function listInstituteAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: Omit<ListAuditFilter, "scope"> & { instituteId: string },
): Promise<AuditEventDto[]> {
  assertCanReadInstitute(actor, filter.instituteId);
  const rows = await listAuditEvents(admin, {
    ...filter,
    scope: "institute",
  });
  return rows.map(toAuditEventDto);
}

export async function getInstituteAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AuditEventDto> {
  const row = await findAuditEventById(admin, id);
  if (!row || row.scope !== "institute" || !row.institute_id) {
    throw AppError.notFound("Audit event not found");
  }
  assertCanReadInstitute(actor, row.institute_id);
  return toAuditEventDto(row);
}

/**
 * Append institute audit from trusted server code only (not exposed on HTTP).
 */
export async function recordInstituteAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: Omit<AppendAuditInput, "scope"> & { instituteId: string },
): Promise<AuditEventDto> {
  assertCanWriteInstitute(actor, input.instituteId);
  const fields = validateAppendFields(input);

  const row = await insertAuditEvent(admin, {
    scope: "institute",
    instituteId: input.instituteId,
    actorUserId: actor.userId,
    ...fields,
  });
  return toAuditEventDto(row);
}

export async function listPlatformAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: Omit<ListAuditFilter, "scope" | "instituteId">,
): Promise<AuditEventDto[]> {
  assertPlatformOperator(actor);
  const rows = await listAuditEvents(admin, {
    ...filter,
    scope: "platform",
  });
  return rows.map(toAuditEventDto);
}

export async function getPlatformAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AuditEventDto> {
  assertPlatformOperator(actor);
  const row = await findAuditEventById(admin, id);
  if (!row || row.scope !== "platform") {
    throw AppError.notFound("Audit event not found");
  }
  return toAuditEventDto(row);
}

/**
 * Append platform audit from trusted server code only (not exposed on HTTP).
 */
export async function recordPlatformAuditForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: Omit<AppendAuditInput, "scope" | "instituteId">,
): Promise<AuditEventDto> {
  assertPlatformRoles(actor, [...AUDIT_PLATFORM_WRITE_ROLES]);
  const fields = validateAppendFields(input);

  const row = await insertAuditEvent(admin, {
    scope: "platform",
    instituteId: null,
    actorUserId: actor.userId,
    ...fields,
  });
  return toAuditEventDto(row);
}
