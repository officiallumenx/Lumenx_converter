import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AnnouncementRow,
  AnnouncementStatus,
  CreateAnnouncementInput,
  ListAnnouncementsFilter,
  UpdateAnnouncementInput,
} from "./types.js";

export const ANNOUNCEMENT_COLS =
  "id, institute_id, title, body, audience_scope, audience_label, class_id, section_id, activity_team_id, status, scheduled_at, published_at, archived_at, pinned, pin_until, views, created_by_user_id, created_at, updated_at, deleted_at";

export async function listAnnouncements(
  admin: SupabaseClient,
  filter: ListAnnouncementsFilter,
): Promise<AnnouncementRow[]> {
  let query = admin
    .from("announcement")
    .select(ANNOUNCEMENT_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.audienceScope) {
    query = query.eq("audience_scope", filter.audienceScope);
  }
  if (filter.pinned !== undefined) query = query.eq("pinned", filter.pinned);

  const result = await query;
  return ensureDbOk(result) as AnnouncementRow[];
}

export async function findAnnouncementById(
  admin: SupabaseClient,
  id: string,
): Promise<AnnouncementRow | null> {
  const result = await admin
    .from("announcement")
    .select(ANNOUNCEMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AnnouncementRow | null) ?? null;
}

export async function insertAnnouncement(
  admin: SupabaseClient,
  input: CreateAnnouncementInput & {
    createdByUserId: string;
    status: AnnouncementStatus;
    scheduledAt: string | null;
    publishedAt: string | null;
  },
): Promise<AnnouncementRow> {
  const result = await admin
    .from("announcement")
    .insert({
      institute_id: input.instituteId,
      title: input.title.trim(),
      body: input.body ?? null,
      audience_scope: input.audienceScope ?? "all",
      audience_label: input.audienceLabel ?? null,
      class_id: input.classId ?? null,
      section_id: input.sectionId ?? null,
      activity_team_id: input.activityTeamId ?? null,
      status: input.status,
      scheduled_at: input.scheduledAt,
      published_at: input.publishedAt,
      archived_at: null,
      pinned: input.pinned ?? false,
      pin_until: input.pinUntil ?? null,
      views: 0,
      created_by_user_id: input.createdByUserId,
    })
    .select(ANNOUNCEMENT_COLS)
    .single();
  return ensureDbOk(result) as AnnouncementRow;
}

export function toAnnouncementUpdatePatch(
  input: UpdateAnnouncementInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.body !== undefined) patch.body = input.body;
  if (input.audienceScope !== undefined) {
    patch.audience_scope = input.audienceScope;
  }
  if (input.audienceLabel !== undefined) {
    patch.audience_label = input.audienceLabel;
  }
  if (input.classId !== undefined) patch.class_id = input.classId;
  if (input.sectionId !== undefined) patch.section_id = input.sectionId;
  if (input.activityTeamId !== undefined) {
    patch.activity_team_id = input.activityTeamId;
  }
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  if (input.pinned !== undefined) patch.pinned = input.pinned;
  if (input.pinUntil !== undefined) patch.pin_until = input.pinUntil;
  return patch;
}

export async function updateAnnouncementFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AnnouncementRow | null> {
  const result = await admin
    .from("announcement")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ANNOUNCEMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AnnouncementRow | null) ?? null;
}

export async function softDeleteAnnouncement(
  admin: SupabaseClient,
  id: string,
): Promise<AnnouncementRow | null> {
  const result = await admin
    .from("announcement")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ANNOUNCEMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AnnouncementRow | null) ?? null;
}

export async function listDueScheduledAnnouncements(
  admin: SupabaseClient,
  instituteId: string,
  nowIso: string,
): Promise<AnnouncementRow[]> {
  const result = await admin
    .from("announcement")
    .select(ANNOUNCEMENT_COLS)
    .eq("institute_id", instituteId)
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .is("deleted_at", null);
  return ensureDbOk(result) as AnnouncementRow[];
}

/** Cross-institute due scheduled announcements for the background worker. */
export async function listAllDueScheduledAnnouncements(
  admin: SupabaseClient,
  nowIso: string,
): Promise<AnnouncementRow[]> {
  const result = await admin
    .from("announcement")
    .select(ANNOUNCEMENT_COLS)
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .is("deleted_at", null);
  return ensureDbOk(result) as AnnouncementRow[];
}

export async function incrementAnnouncementViews(
  admin: SupabaseClient,
  id: string,
): Promise<AnnouncementRow | null> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) return null;

  const result = await admin
    .from("announcement")
    .update({ views: existing.views + 1 })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ANNOUNCEMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AnnouncementRow | null) ?? null;
}
