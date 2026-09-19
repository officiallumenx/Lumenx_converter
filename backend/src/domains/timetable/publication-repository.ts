import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type { TimetablePublicationRow } from "./publication-types.js";

const COLUMNS =
  "id, institute_id, academic_year_id, class_id, section_id, published_at, published_by_user_id, note, slot_count, created_at, updated_at, deleted_at";

export async function listTimetablePublications(
  admin: SupabaseClient,
  filter: { instituteId: string; sectionId?: string },
): Promise<TimetablePublicationRow[]> {
  let query = admin
    .from("timetable_publication")
    .select(COLUMNS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (filter.sectionId) {
    query = query.eq("section_id", filter.sectionId);
  }

  const result = await query;
  return ensureDbOk(result) as TimetablePublicationRow[];
}

export async function findTimetablePublicationById(
  admin: SupabaseClient,
  id: string,
): Promise<TimetablePublicationRow | null> {
  const result = await admin
    .from("timetable_publication")
    .select(COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TimetablePublicationRow | null) ?? null;
}

export async function insertTimetablePublication(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    publishedByUserId: string;
    note: string | null;
    slotCount: number;
  },
): Promise<TimetablePublicationRow> {
  const result = await admin
    .from("timetable_publication")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      section_id: input.sectionId,
      published_by_user_id: input.publishedByUserId,
      note: input.note,
      slot_count: input.slotCount,
    })
    .select(COLUMNS)
    .single();
  return ensureDbOk(result) as TimetablePublicationRow;
}
