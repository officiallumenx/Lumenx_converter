import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findActiveMemberUserIds,
  findDeviceTokenById,
  findNotificationById,
  findProfilesByIds,
  findRecipientById,
  findTemplateById,
  insertInAppDeliveryAttempts,
  insertNotification,
  insertRecipients,
  listActiveMemberUserIdsForAudience,
  listDeviceTokensForUser,
  listNotificationsByIds,
  listRecipientsForUser,
  listTemplates,
  softDeleteDeviceToken,
  softDeleteRecipient,
  updateRecipientFields,
  upsertDeviceToken,
} from "./repository.js";
import type {
  DeviceTokenDto,
  DeviceTokenRow,
  EmitNotificationInput,
  InboxItemDto,
  ListInboxFilter,
  ListTemplatesFilter,
  NotificationRow,
  RecipientRow,
  RegisterDeviceTokenInput,
  TemplateDto,
  TemplateRow,
  UpdateRecipientInput,
} from "./types.js";

export const NOTIFICATION_EMIT_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const NOTIFICATION_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toInboxItemDto(
  recipient: RecipientRow,
  notification: NotificationRow,
): InboxItemDto {
  return {
    id: recipient.id,
    instituteId: recipient.institute_id,
    notificationId: recipient.notification_id,
    userProfileId: recipient.user_profile_id,
    readAt: recipient.read_at,
    starredAt: recipient.starred_at,
    createdAt: recipient.created_at,
    updatedAt: recipient.updated_at,
    notification: {
      id: notification.id,
      category: notification.category,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      payload: notification.payload ?? {},
      deepLink: notification.deep_link,
      templateId: notification.template_id,
      createdAt: notification.created_at,
    },
  };
}

export function toTemplateDto(row: TemplateRow): TemplateDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    templateKey: row.template_key,
    category: row.category,
    audience: row.audience,
    title: row.title,
    body: row.body,
    priority: row.priority,
    deepLink: row.deep_link,
    status: row.status,
    version: row.version,
    allowedVariables: row.allowed_variables,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDeviceTokenDto(row: DeviceTokenRow): DeviceTokenDto {
  return {
    id: row.id,
    userProfileId: row.user_profile_id,
    app: row.app,
    platform: row.platform,
    token: row.token,
    valid: row.valid,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return NOTIFICATION_STAFF_READ_ROLES.some((role) =>
    membership.roles.includes(role),
  );
}

function assertCanEmit(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...NOTIFICATION_EMIT_ROLES]);
}

async function buildInboxItems(
  admin: SupabaseClient,
  recipients: RecipientRow[],
): Promise<InboxItemDto[]> {
  const notifications = await listNotificationsByIds(
    admin,
    recipients.map((r) => r.notification_id),
  );
  const byId = new Map(notifications.map((n) => [n.id, n]));
  const items: InboxItemDto[] = [];
  for (const recipient of recipients) {
    const notification = byId.get(recipient.notification_id);
    if (!notification) continue;
    items.push(toInboxItemDto(recipient, notification));
  }
  return items;
}

// ── Inbox ────────────────────────────────────────────────────────

export async function listInboxForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListInboxFilter,
): Promise<InboxItemDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const recipients = await listRecipientsForUser(admin, {
    ...filter,
    instituteId,
    userProfileId: actor.userId,
  });
  return buildInboxItems(admin, recipients);
}

export async function getInboxItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  recipientId: string,
): Promise<InboxItemDto> {
  const recipient = await findRecipientById(admin, recipientId);
  if (!recipient) throw AppError.notFound("Notification not found");

  assertInstituteAccess(actor, recipient.institute_id);

  const isOwner = recipient.user_profile_id === actor.userId;
  if (!isOwner && !isStaffReader(actor, recipient.institute_id)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const notification = await findNotificationById(
    admin,
    recipient.notification_id,
  );
  if (!notification) throw AppError.notFound("Notification not found");

  return toInboxItemDto(recipient, notification);
}

export async function updateInboxItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  recipientId: string,
  patch: UpdateRecipientInput,
): Promise<InboxItemDto> {
  const recipient = await findRecipientById(admin, recipientId);
  if (!recipient) throw AppError.notFound("Notification not found");

  if (recipient.user_profile_id !== actor.userId) {
    throw AppError.forbidden("Can only update own inbox items");
  }
  assertInstituteAccess(actor, recipient.institute_id);

  const fieldPatch: Record<string, unknown> = {};
  if (patch.read !== undefined) {
    fieldPatch.read_at = patch.read ? new Date().toISOString() : null;
  }
  if (patch.starred !== undefined) {
    fieldPatch.starred_at = patch.starred ? new Date().toISOString() : null;
  }

  const updated =
    Object.keys(fieldPatch).length === 0
      ? recipient
      : await updateRecipientFields(admin, recipientId, fieldPatch);
  if (!updated) throw AppError.notFound("Notification not found");

  const notification = await findNotificationById(
    admin,
    updated.notification_id,
  );
  if (!notification) throw AppError.notFound("Notification not found");
  return toInboxItemDto(updated, notification);
}

export async function deleteInboxItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  recipientId: string,
): Promise<void> {
  const recipient = await findRecipientById(admin, recipientId);
  if (!recipient) throw AppError.notFound("Notification not found");

  if (recipient.user_profile_id !== actor.userId) {
    throw AppError.forbidden("Can only delete own inbox items");
  }
  assertInstituteAccess(actor, recipient.institute_id);

  const deleted = await softDeleteRecipient(admin, recipientId);
  if (!deleted) throw AppError.conflict("Notification was already deleted");
}

// ── Emit ─────────────────────────────────────────────────────────

export async function emitNotificationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: EmitNotificationInput,
): Promise<InboxItemDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanEmit(actor, instituteId);

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw AppError.validation("title and body are required", {
      title: !title ? ["Required"] : undefined,
      body: !body ? ["Required"] : undefined,
    });
  }

  const explicitIds = input.recipientUserIds ?? [];
  const hasExplicit = explicitIds.length > 0;
  const hasAudience = Boolean(input.audience);
  if (hasExplicit === hasAudience) {
    throw AppError.validation(
      "Provide either recipient_user_ids or audience (not both, not neither)",
      {
        recipient_user_ids: ["XOR audience"],
        audience: ["XOR recipient_user_ids"],
      },
    );
  }

  let recipientIds: string[];
  if (input.audience) {
    recipientIds = await listActiveMemberUserIdsForAudience(
      admin,
      instituteId,
      input.audience,
    );
    if (recipientIds.length === 0) {
      throw AppError.validation("No active members matched audience", {
        audience: ["No recipients"],
      });
    }
  } else {
    recipientIds = [...new Set(explicitIds)];
  }

  if (recipientIds.length > 500) {
    throw AppError.validation("Too many recipients", {
      recipient_user_ids: ["Max 500"],
    });
  }

  const existingProfiles = await findProfilesByIds(admin, recipientIds);
  const missing = recipientIds.filter((id) => !existingProfiles.has(id));
  if (missing.length > 0) {
    throw AppError.validation("Referenced resource is invalid", {
      recipient_user_ids: ["One or more profiles not found"],
    });
  }

  // Audience resolution already scoped to active members; re-check for explicit IDs.
  const members = await findActiveMemberUserIds(admin, instituteId, recipientIds);
  const nonMembers = recipientIds.filter((id) => !members.has(id));
  if (nonMembers.length > 0) {
    throw AppError.validation("Referenced resource is invalid", {
      recipient_user_ids: ["One or more recipients are not active institute members"],
    });
  }

  if (input.templateId) {
    const template = await findTemplateById(admin, input.templateId);
    if (
      !template ||
      (template.institute_id !== null && template.institute_id !== instituteId)
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        template_id: ["Template not found for institute"],
      });
    }
  }

  const notification = await insertNotification(admin, {
    ...input,
    instituteId,
    title,
    body,
    createdByUserProfileId: actor.userId,
  });

  const recipients = await insertRecipients(admin, {
    instituteId,
    notificationId: notification.id,
    userProfileIds: recipientIds,
  });

  await insertInAppDeliveryAttempts(admin, {
    instituteId,
    notificationId: notification.id,
    recipients,
  });

  return recipients.map((r) => toInboxItemDto(r, notification));
}

// ── Templates ────────────────────────────────────────────────────

export async function listTemplatesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTemplatesFilter,
): Promise<TemplateDto[]> {
  if (filter.instituteId) {
    requireInstituteId(actor, filter.instituteId);
  } else if (!actor.isPlatformOperator) {
    throw AppError.validation("institute_id is required");
  }

  const rows = await listTemplates(admin, filter);
  const instituteId = filter.instituteId;

  if (instituteId && isStaffReader(actor, instituteId)) {
    return rows.map(toTemplateDto);
  }

  // Members / non-staff: published only.
  return rows
    .filter((r) => r.status === "published")
    .map(toTemplateDto);
}

// ── Device tokens ────────────────────────────────────────────────

export async function listDeviceTokensForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<DeviceTokenDto[]> {
  const rows = await listDeviceTokensForUser(admin, actor.userId);
  return rows.map(toDeviceTokenDto);
}

export async function registerDeviceTokenForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: RegisterDeviceTokenInput,
): Promise<DeviceTokenDto> {
  const token = input.token.trim();
  if (!token) {
    throw AppError.validation("token is required", {
      token: ["Required"],
    });
  }
  const row = await upsertDeviceToken(admin, actor.userId, {
    ...input,
    token,
  });
  return toDeviceTokenDto(row);
}

export async function deleteDeviceTokenForActor(
  admin: SupabaseClient,
  actor: Actor,
  tokenId: string,
): Promise<void> {
  const existing = await findDeviceTokenById(admin, tokenId);
  if (!existing) throw AppError.notFound("Device token not found");

  if (existing.user_profile_id !== actor.userId && !actor.isPlatformOperator) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const deleted = await softDeleteDeviceToken(admin, tokenId);
  if (!deleted) throw AppError.conflict("Device token was already deleted");
}
