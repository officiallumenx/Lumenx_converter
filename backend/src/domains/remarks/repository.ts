import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateStudentRemarkInput,
  ListStudentRemarksFilter,
  RemarkType,
  StudentRemarkRow,
  UpdateStudentRemarkInput,
} from "./types.js";

export async function findStudentRemarkById(
  admin: SupabaseClient,
  id: string,
): Promise<StudentRemarkRow | null> {
  const result = await admin
    .from("student_remark")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentRemarkRow | null) ?? null;
}

export async function listStudentRemarks(
  admin: SupabaseClient,
  filter: ListStudentRemarksFilter,
): Promise<StudentRemarkRow[]> {
  let query = admin
    .from("student_remark")
    .select("*")
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (filter.studentId) {
    query = query.eq("student_id", filter.studentId);
  }
  const result = await query;
  if (result.error) ensureDbOk(result);
  return (result.data ?? []) as StudentRemarkRow[];
}

export async function insertStudentRemark(
  admin: SupabaseClient,
  input: CreateStudentRemarkInput & {
    authorTeacherId: string;
    authorUserId: string;
  },
): Promise<StudentRemarkRow> {
  const result = await admin
    .from("student_remark")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      author_teacher_id: input.authorTeacherId,
      author_user_id: input.authorUserId,
      remark_type: input.type satisfies RemarkType,
      body: input.text.trim(),
    })
    .select("*")
    .single();
  if (result.error) ensureDbOk(result);
  return result.data as StudentRemarkRow;
}

export async function updateStudentRemarkBody(
  admin: SupabaseClient,
  id: string,
  input: UpdateStudentRemarkInput,
): Promise<StudentRemarkRow> {
  const result = await admin
    .from("student_remark")
    .update({ body: input.text.trim() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  if (result.error) ensureDbOk(result);
  return result.data as StudentRemarkRow;
}

export async function softDeleteStudentRemark(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const result = await admin
    .from("student_remark")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}
