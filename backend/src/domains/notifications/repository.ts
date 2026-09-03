import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  DeviceTokenRow,
  EmitNotificationInput,
  ListInboxFilter,
  ListTemplatesFilter,
  NotificationAudience,
  NotificationRow,
  RecipientRow,
  RegisterDeviceTokenInput,
  TemplateRow,
} from "./types.js";

const NOTIFICATION_COLS =
  "id, institute_id, template_id, category, priority, title, body, payload, deep_link, dedupe_key, created_by_user_profile_id, created_at, updated_at, deleted_at";

const RECIPIENT_COLS =
  "id, institute_id, notification_id, user_profile_id, read_at, starred_at, created_at, updated_at, deleted_at";

const TEMPLATE_COLS =
  "id, institute_id, template_key, category, audience, title, body, priority, deep_link, status, version, allowed_variables, created_at, updated_at, deleted_at";

const DEVICE_COLS =
  "id, user_profile_id, app, platform, token, valid, last_seen_at, created_at, updated_at, deleted_at";

export async function findNotificationById(
  admin: SupabaseClient,
  id: string,
): Promise<NotificationRow | null> {
  const result = await admin
    .from("notification")
    .select(NOTIFICATION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as NotificationRow | null) ?? null;
}

export async function findRecipientById(
  admin: SupabaseClient,
  id: string,
): Promise<RecipientRow | null> {
  const result = await admin
    .from("notification_recipient")
    .select(RECIPIENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecipientRow | null) ?? null;
}

export async function listRecipientsForUser(
  admin: SupabaseClient,
  filter: { instituteId: string; unreadOnly?: boolean; userProfileId: string },
): Promise<RecipientRow[]> {
  let query = admin
    .from("notification_recipient")
    .select(RECIPIENT_COLS)
    .eq("institute_id", filter.instituteId)
    .eq("user_profile_id", filter.userProfileId)
    .is("deleted_at", null);

  if (filter.unreadOnly) {
    query = query.is("read_at", null);
  }

  const result = await query;
  return ensureDbOk(result) as RecipientRow[];
}

export async function listRecipientsForUserAll(
  admin: SupabaseClient,
  filter: {
    userProfileId: string;
    instituteId?: string;
    unreadOnly?: boolean;
  },
): Promise<RecipientRow[]> {
  let query = admin
    .from("notification_recipient")
    .select(RECIPIENT_COLS)
    .eq("user_profile_id", filter.userProfileId)
    .is("deleted_at", null);

  if (filter.instituteId) {
    query = query.eq("institute_id", filter.instituteId);
  }
  if (filter.unreadOnly) {
    query = query.is("read_at", null);
  }

  const result = await query.order("created_at", { ascending: false });
  return ensureDbOk(result) as RecipientRow[];
}

export async function userHasNotificationRecipientAtInstitute(
  admin: SupabaseClient,
  userProfileId: string,
  instituteId: string,
): Promise<boolean> {
  const result = await admin
    .from("notification_recipient")
    .select("id")
    .eq("user_profile_id", userProfileId)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .limit(1);
  const rows = ensureDbOk(result) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function listNotificationsByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<NotificationRow[]> {
  if (ids.length === 0) return [];
  const result = await admin
    .from("notification")
    .select(NOTIFICATION_COLS)
    .in("id", ids)
    .is("deleted_at", null);
  return ensureDbOk(result) as NotificationRow[];
}

export async function insertNotification(
  admin: SupabaseClient,
  input: EmitNotificationInput & { createdByUserProfileId: string },
): Promise<NotificationRow> {
  const result = await admin
    .from("notification")
    .insert({
      institute_id: input.instituteId,
      template_id: input.templateId ?? null,
      category: input.category,
      priority: input.priority ?? "normal",
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      deep_link: input.deepLink ?? null,
      dedupe_key: input.dedupeKey ?? null,
      created_by_user_profile_id: input.createdByUserProfileId,
    })
    .select(NOTIFICATION_COLS)
    .single();
  return ensureDbOk(result) as NotificationRow;
}

export async function insertRecipients(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    notificationId: string;
    userProfileIds: string[];
  },
): Promise<RecipientRow[]> {
  if (input.userProfileIds.length === 0) return [];
  const result = await admin
    .from("notification_recipient")
    .insert(
      input.userProfileIds.map((user_profile_id) => ({
        institute_id: input.instituteId,
        notification_id: input.notificationId,
        user_profile_id,
      })),
    )
    .select(RECIPIENT_COLS);
  return ensureDbOk(result) as RecipientRow[];
}

export async function insertInAppDeliveryAttempts(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    notificationId: string;
    recipients: RecipientRow[];
  },
): Promise<void> {
  if (input.recipients.length === 0) return;
  const result = await admin.from("notification_delivery_attempt").insert(
    input.recipients.map((r) => ({
      institute_id: input.instituteId,
      notification_id: input.notificationId,
      notification_recipient_id: r.id,
      device_token_id: null,
      channel: "in_app",
      status: "sent",
      error: null,
    })),
  );
  ensureDbOk(result);
}

export async function listValidDeviceTokensForUsers(
  admin: SupabaseClient,
  userProfileIds: string[],
): Promise<DeviceTokenRow[]> {
  if (userProfileIds.length === 0) return [];
  const result = await admin
    .from("device_token")
    .select(DEVICE_COLS)
    .in("user_profile_id", userProfileIds)
    .eq("valid", true)
    .is("deleted_at", null);
  return ensureDbOk(result) as DeviceTokenRow[];
}

export async function insertFcmDeliveryAttempts(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    notificationId: string;
    notificationRecipientId: string;
    deviceTokenId: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const result = await admin.from("notification_delivery_attempt").insert(
    rows.map((row) => ({
      institute_id: row.instituteId,
      notification_id: row.notificationId,
      notification_recipient_id: row.notificationRecipientId,
      device_token_id: row.deviceTokenId,
      channel: "fcm",
      status: "pending",
      error: null,
      attempt_count: 0,
      next_attempt_at: null,
      max_attempts: 8,
    })),
  );
  ensureDbOk(result);
}

export type DeliveryAttemptRow = {
  id: string;
  institute_id: string;
  notification_id: string;
  notification_recipient_id: string | null;
  device_token_id: string | null;
  channel: string;
  status: string;
  error: string | null;
  attempted_at: string;
  created_at: string;
  attempt_count: number;
  next_attempt_at: string | null;
  max_attempts: number;
};

export async function listPendingFcmDeliveryAttempts(
  admin: SupabaseClient,
  limit = 50,
): Promise<DeliveryAttemptRow[]> {
  const result = await admin
    .from("notification_delivery_attempt")
    .select(
      "id, institute_id, notification_id, notification_recipient_id, device_token_id, channel, status, error, attempted_at, created_at, attempt_count, next_attempt_at, max_attempts",
    )
    .eq("channel", "fcm")
    .eq("status", "pending")
    .order("attempted_at", { ascending: true })
    .limit(Math.max(limit * 3, limit));
  const rows = ensureDbOk(result) as DeliveryAttemptRow[];
  const now = Date.now();
  return rows
    .filter((row) => {
      if (row.next_attempt_at == null) return true;
      const at = new Date(row.next_attempt_at).getTime();
      return Number.isFinite(at) && at <= now;
    })
    .slice(0, limit);
}

export async function updateDeliveryAttemptStatus(
  admin: SupabaseClient,
  id: string,
  patch: {
    status: "sent" | "failed" | "skipped" | "pending";
    error?: string | null;
    attemptCount?: number;
    nextAttemptAt?: string | null;
  },
): Promise<void> {
  const update: Record<string, unknown> = {
    status: patch.status,
    error: patch.error ?? null,
    attempted_at: new Date().toISOString(),
  };
  if (patch.attemptCount !== undefined) {
    update.attempt_count = patch.attemptCount;
  }
  if (patch.nextAttemptAt !== undefined) {
    update.next_attempt_at = patch.nextAttemptAt;
  }
  const result = await admin
    .from("notification_delivery_attempt")
    .update(update)
    .eq("id", id);
  ensureDbOk(result);
}

export async function softInvalidateDeviceToken(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const result = await admin
    .from("device_token")
    .update({
      valid: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null);
  ensureDbOk(result);
}

export async function updateRecipientFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<RecipientRow | null> {
  const result = await admin
    .from("notification_recipient")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(RECIPIENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecipientRow | null) ?? null;
}

export async function softDeleteRecipient(
  admin: SupabaseClient,
  id: string,
): Promise<RecipientRow | null> {
  const result = await admin
    .from("notification_recipient")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(RECIPIENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecipientRow | null) ?? null;
}

export async function findTemplateById(
  admin: SupabaseClient,
  id: string,
): Promise<TemplateRow | null> {
  const result = await admin
    .from("notification_template")
    .select(TEMPLATE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TemplateRow | null) ?? null;
}

export async function listTemplates(
  admin: SupabaseClient,
  filter: ListTemplatesFilter,
): Promise<TemplateRow[]> {
  let query = admin
    .from("notification_template")
    .select(TEMPLATE_COLS)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.category) query = query.eq("category", filter.category);

  const result = await query;
  let rows = ensureDbOk(result) as TemplateRow[];

  if (filter.instituteId) {
    rows = rows.filter(
      (r) => r.institute_id === null || r.institute_id === filter.instituteId,
    );
  } else {
    rows = rows.filter((r) => r.institute_id === null);
  }

  return rows;
}

export async function listDeviceTokensForUser(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<DeviceTokenRow[]> {
  const result = await admin
    .from("device_token")
    .select(DEVICE_COLS)
    .eq("user_profile_id", userProfileId)
    .is("deleted_at", null);
  return ensureDbOk(result) as DeviceTokenRow[];
}

export async function findDeviceTokenById(
  admin: SupabaseClient,
  id: string,
): Promise<DeviceTokenRow | null> {
  const result = await admin
    .from("device_token")
    .select(DEVICE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DeviceTokenRow | null) ?? null;
}

export async function upsertDeviceToken(
  admin: SupabaseClient,
  userProfileId: string,
  input: RegisterDeviceTokenInput,
): Promise<DeviceTokenRow> {
  const existingResult = await admin
    .from("device_token")
    .select(DEVICE_COLS)
    .eq("token", input.token)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingResult.error) ensureDbOk(existingResult);
  const existing = existingResult.data as DeviceTokenRow | null;

  if (existing) {
    const result = await admin
      .from("device_token")
      .update({
        user_profile_id: userProfileId,
        app: input.app,
        platform: input.platform,
        valid: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .is("deleted_at", null)
      .select(DEVICE_COLS)
      .single();
    return ensureDbOk(result) as DeviceTokenRow;
  }

  const result = await admin
    .from("device_token")
    .insert({
      user_profile_id: userProfileId,
      app: input.app,
      platform: input.platform,
      token: input.token,
      valid: true,
      last_seen_at: new Date().toISOString(),
    })
    .select(DEVICE_COLS)
    .single();
  return ensureDbOk(result) as DeviceTokenRow;
}

export async function softDeleteDeviceToken(
  admin: SupabaseClient,
  id: string,
): Promise<DeviceTokenRow | null> {
  const result = await admin
    .from("device_token")
    .update({
      deleted_at: new Date().toISOString(),
      valid: false,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select(DEVICE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DeviceTokenRow | null) ?? null;
}

export async function findProfilesByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const result = await admin
    .from("user_profile")
    .select("id")
    .in("id", ids)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

export async function findActiveMemberUserIds(
  admin: SupabaseClient,
  instituteId: string,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const result = await admin
    .from("membership")
    .select("user_id")
    .eq("institute_id", instituteId)
    .in("user_id", userIds)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ user_id: string }>;
  return new Set(rows.map((r) => r.user_id));
}

const AUDIENCE_ROLE_CODES: Record<
  Exclude<NotificationAudience, "everyone">,
  string
> = {
  students: "student",
  parents: "parent",
  teachers: "teacher",
};

/**
 * Active institute members for a role audience.
 * Scoped strictly to institute_id + status=active; never crosses tenants.
 */
export async function listActiveMemberUserIdsForAudience(
  admin: SupabaseClient,
  instituteId: string,
  audience: NotificationAudience,
): Promise<string[]> {
  const membershipResult = await admin
    .from("membership")
    .select("id, user_id")
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const memberships = ensureDbOk(membershipResult) as Array<{
    id: string;
    user_id: string;
  }>;
  if (memberships.length === 0) return [];

  if (audience === "everyone") {
    return [...new Set(memberships.map((m) => m.user_id))];
  }

  const roleCode = AUDIENCE_ROLE_CODES[audience];
  const membershipIds = memberships.map((m) => m.id);
  const rolesResult = await admin
    .from("membership_role")
    .select("membership_id, role_code")
    .in("membership_id", membershipIds)
    .eq("role_code", roleCode);
  const roleRows = ensureDbOk(rolesResult) as Array<{
    membership_id: string;
    role_code: string;
  }>;
  const matched = new Set(roleRows.map((r) => r.membership_id));
  return [
    ...new Set(
      memberships.filter((m) => matched.has(m.id)).map((m) => m.user_id),
    ),
  ];
}
