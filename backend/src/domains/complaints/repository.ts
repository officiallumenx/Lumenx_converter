import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  ComplaintRow,
  ComplaintStatus,
  CreateComplaintInput,
  ListComplaintsFilter,
  UpdateComplaintInput,
} from "./types.js";

export const COMPLAINT_COLS =
  "id, institute_id, title, body, category, priority, status, destination, requested_by_user_id, student_id, teacher_id, response_note, created_at, updated_at, deleted_at";

export async function listComplaints(
  admin: SupabaseClient,
  filter: ListComplaintsFilter,
): Promise<ComplaintRow[]> {
  let query = admin
    .from("complaint")
    .select(COMPLAINT_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.destination) query = query.eq("destination", filter.destination);
  if (filter.priority) query = query.eq("priority", filter.priority);
  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);

  const result = await query;
  return ensureDbOk(result) as ComplaintRow[];
}

export async function findComplaintById(
  admin: SupabaseClient,
  id: string,
): Promise<ComplaintRow | null> {
  const result = await admin
    .from("complaint")
    .select(COMPLAINT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ComplaintRow | null) ?? null;
}

export async function insertComplaint(
  admin: SupabaseClient,
  input: CreateComplaintInput & {
    requestedByUserId: string;
    teacherId: string | null;
    status: ComplaintStatus;
  },
): Promise<ComplaintRow> {
  const result = await admin
    .from("complaint")
    .insert({
      institute_id: input.instituteId,
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category.trim(),
      priority: input.priority ?? "medium",
      status: input.status,
      destination: input.destination ?? null,
      requested_by_user_id: input.requestedByUserId,
      student_id: input.studentId ?? null,
      teacher_id: input.teacherId,
      response_note: null,
    })
    .select(COMPLAINT_COLS)
    .single();
  return ensureDbOk(result) as ComplaintRow;
}

export function toComplaintUpdatePatch(
  input: UpdateComplaintInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.body !== undefined) patch.body = input.body.trim();
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.destination !== undefined) patch.destination = input.destination;
  return patch;
}

export async function updateComplaintFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ComplaintRow | null> {
  const result = await admin
    .from("complaint")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COMPLAINT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ComplaintRow | null) ?? null;
}

export async function softDeleteComplaint(
  admin: SupabaseClient,
  id: string,
): Promise<ComplaintRow | null> {
  const result = await admin
    .from("complaint")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(COMPLAINT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ComplaintRow | null) ?? null;
}

/** True when teacher has an active assignment on a section where the student is enrolled. */
export async function teacherCoversStudent(
  admin: SupabaseClient,
  input: { instituteId: string; teacherId: string; studentId: string },
): Promise<boolean> {
  const enrollResult = await admin
    .from("enrollment")
    .select("section_id")
    .eq("institute_id", input.instituteId)
    .eq("student_id", input.studentId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollResult) as Array<{ section_id: string }>;
  if (enrollments.length === 0) return false;

  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];
  const assignResult = await admin
    .from("teacher_assignment")
    .select("id")
    .eq("institute_id", input.instituteId)
    .eq("teacher_id", input.teacherId)
    .eq("status", "active")
    .is("deleted_at", null)
    .in("section_id", sectionIds);
  const assignments = ensureDbOk(assignResult) as Array<{ id: string }>;
  return assignments.length > 0;
}
