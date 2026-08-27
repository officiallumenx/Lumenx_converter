import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateEventInput,
  EventRow,
  ListEventsFilter,
  UpdateEventInput,
} from "./types.js";

export const EVENT_COLS =
  "id, institute_id, title, kind, custom_kind_label, source, starts_on, ends_on, start_time, end_time, audience_scope, audience_label, class_id, section_id, location, description, reminder, banner_asset_path, registration_required, recurrence, rsvp_count, published, published_at, cancelled, cancellation_reason, cancelled_at, created_by_user_id, created_at, updated_at, deleted_at";

export async function listEvents(
  admin: SupabaseClient,
  filter: ListEventsFilter,
): Promise<EventRow[]> {
  let query = admin
    .from("event")
    .select(EVENT_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.source) query = query.eq("source", filter.source);
  if (filter.kind) query = query.eq("kind", filter.kind);
  if (filter.published !== undefined) {
    query = query.eq("published", filter.published);
  }
  if (!filter.includeCancelled) query = query.eq("cancelled", false);
  if (filter.from) query = query.gte("starts_on", filter.from);
  if (filter.to) query = query.lte("starts_on", filter.to);

  const result = await query;
  return ensureDbOk(result) as EventRow[];
}

export async function listCalendarEvents(
  admin: SupabaseClient,
  filter: Omit<ListEventsFilter, "source" | "includeCancelled">,
): Promise<EventRow[]> {
  // Mirror calendar_event view filters (view remains for PostgREST clients).
  const rows = await listEvents(admin, {
    ...filter,
    includeCancelled: false,
  });
  return rows.filter(
    (row) =>
      row.source === "calendar" ||
      row.kind === "holiday" ||
      row.kind === "exam" ||
      row.kind === "meeting" ||
      row.kind === "function",
  );
}

export async function findEventById(
  admin: SupabaseClient,
  id: string,
): Promise<EventRow | null> {
  const result = await admin
    .from("event")
    .select(EVENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EventRow | null) ?? null;
}

export async function insertEvent(
  admin: SupabaseClient,
  input: CreateEventInput & { createdByUserId: string },
): Promise<EventRow> {
  const published = input.published === true;
  const now = new Date().toISOString();
  const result = await admin
    .from("event")
    .insert({
      institute_id: input.instituteId,
      title: input.title.trim(),
      kind: input.kind,
      custom_kind_label:
        input.kind === "custom" ? (input.customKindLabel?.trim() ?? null) : null,
      source: input.source,
      starts_on: input.startsOn,
      ends_on: input.endsOn ?? null,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      audience_scope: input.audienceScope ?? "all",
      audience_label: input.audienceLabel ?? null,
      class_id: input.classId ?? null,
      section_id: input.sectionId ?? null,
      location: input.location ?? null,
      description: input.description ?? null,
      reminder: input.reminder ?? "none",
      banner_asset_path: input.bannerAssetPath ?? null,
      registration_required: input.registrationRequired ?? false,
      recurrence: input.recurrence ?? null,
      rsvp_count: 0,
      published,
      published_at: published ? now : null,
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
      created_by_user_id: input.createdByUserId,
    })
    .select(EVENT_COLS)
    .single();
  return ensureDbOk(result) as EventRow;
}

export function toEventUpdatePatch(input: UpdateEventInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.customKindLabel !== undefined) {
    patch.custom_kind_label = input.customKindLabel;
  }
  if (input.source !== undefined) patch.source = input.source;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;
  if (input.audienceScope !== undefined) {
    patch.audience_scope = input.audienceScope;
  }
  if (input.audienceLabel !== undefined) {
    patch.audience_label = input.audienceLabel;
  }
  if (input.classId !== undefined) patch.class_id = input.classId;
  if (input.sectionId !== undefined) patch.section_id = input.sectionId;
  if (input.location !== undefined) patch.location = input.location;
  if (input.description !== undefined) patch.description = input.description;
  if (input.reminder !== undefined) patch.reminder = input.reminder;
  if (input.bannerAssetPath !== undefined) {
    patch.banner_asset_path = input.bannerAssetPath;
  }
  if (input.registrationRequired !== undefined) {
    patch.registration_required = input.registrationRequired;
  }
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  return patch;
}

export async function updateEventFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<EventRow | null> {
  const result = await admin
    .from("event")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(EVENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EventRow | null) ?? null;
}

export async function softDeleteEvent(
  admin: SupabaseClient,
  id: string,
): Promise<EventRow | null> {
  const result = await admin
    .from("event")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(EVENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EventRow | null) ?? null;
}
