import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type { ReportJobRow, ReportJobStatus } from "./types.js";

export const REPORT_JOB_LIST_COLS =
  "id, institute_id, report_id, status, file_name, content_type, error_message, created_by_user_id, created_at, updated_at, completed_at, deleted_at";

export const REPORT_JOB_FULL_COLS = `${REPORT_JOB_LIST_COLS}, content_text`;

export async function listReportJobs(
  admin: SupabaseClient,
  instituteId: string,
  limit = 100,
): Promise<ReportJobRow[]> {
  const result = await admin
    .from("report_job")
    .select(REPORT_JOB_LIST_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = ensureDbOk(result) as ReportJobRow[];
  return rows.map((r) => ({ ...r, content_text: null }));
}

export async function findReportJobById(
  admin: SupabaseClient,
  id: string,
): Promise<ReportJobRow | null> {
  const result = await admin
    .from("report_job")
    .select(REPORT_JOB_FULL_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ReportJobRow | null) ?? null;
}

export async function insertReportJob(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    reportId: string;
    createdByUserId: string;
  },
): Promise<ReportJobRow> {
  const result = await admin
    .from("report_job")
    .insert({
      institute_id: input.instituteId,
      report_id: input.reportId,
      status: "queued" satisfies ReportJobStatus,
      created_by_user_id: input.createdByUserId,
    })
    .select(REPORT_JOB_FULL_COLS)
    .single();
  return ensureDbOk(result) as ReportJobRow;
}

export async function updateReportJobFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ReportJobRow | null> {
  const result = await admin
    .from("report_job")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(REPORT_JOB_FULL_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ReportJobRow | null) ?? null;
}
