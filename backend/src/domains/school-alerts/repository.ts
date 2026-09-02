import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  SchoolAlertRecipientRow,
  SchoolAlertRow,
} from "./types.js";

const ALERT_COLS =
  "id, institute_id, title, summary, detail, severity, category, source_label, student_id, rule_id, created_by_user_profile_id, created_at, updated_at, deleted_at";

const RECIPIENT_COLS =
  "id, institute_id, school_alert_id, user_profile_id, student_id, read_at, acknowledged_at, created_at, updated_at, deleted_at";

export async function insertSchoolAlert(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    title: string;
    summary: string;
    detail: string;
    severity: string;
    category: string;
    sourceLabel: string;
    studentId?: string | null;
    ruleId?: string | null;
    createdByUserProfileId?: string | null;
  },
): Promise<SchoolAlertRow> {
  const res = await admin
    .from("school_alert")
    .insert({
      institute_id: input.instituteId,
      title: input.title,
      summary: input.summary,
      detail: input.detail,
      severity: input.severity,
      category: input.category,
      source_label: input.sourceLabel,
      student_id: input.studentId ?? null,
      rule_id: input.ruleId ?? null,
      created_by_user_profile_id: input.createdByUserProfileId ?? null,
    })
    .select(ALERT_COLS)
    .single();
  return ensureDbOk(res, "Failed to create school alert") as SchoolAlertRow;
}

export async function insertSchoolAlertRecipients(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    schoolAlertId: string;
    userProfileId: string;
    studentId?: string | null;
  }>,
): Promise<SchoolAlertRecipientRow[]> {
  if (rows.length === 0) return [];
  const res = await admin
    .from("school_alert_recipient")
    .insert(
      rows.map((row) => ({
        institute_id: row.instituteId,
        school_alert_id: row.schoolAlertId,
        user_profile_id: row.userProfileId,
        student_id: row.studentId ?? null,
      })),
    )
    .select(RECIPIENT_COLS);
  return ensureDbOk(res, "Failed to create school alert recipients") as SchoolAlertRecipientRow[];
}

export async function listRecipientsForUser(
  admin: SupabaseClient,
  input: { instituteId: string; userProfileId: string },
): Promise<SchoolAlertRecipientRow[]> {
  const res = await admin
    .from("school_alert_recipient")
    .select(RECIPIENT_COLS)
    .eq("institute_id", input.instituteId)
    .eq("user_profile_id", input.userProfileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (res.data ?? []) as SchoolAlertRecipientRow[];
}

export async function findAlertsByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<SchoolAlertRow[]> {
  if (ids.length === 0) return [];
  const res = await admin
    .from("school_alert")
    .select(ALERT_COLS)
    .in("id", ids)
    .is("deleted_at", null);
  return (res.data ?? []) as SchoolAlertRow[];
}

export async function findRecipientById(
  admin: SupabaseClient,
  recipientId: string,
): Promise<SchoolAlertRecipientRow | null> {
  const res = await admin
    .from("school_alert_recipient")
    .select(RECIPIENT_COLS)
    .eq("id", recipientId)
    .is("deleted_at", null)
    .maybeSingle();
  return (res.data as SchoolAlertRecipientRow | null) ?? null;
}

export async function acknowledgeRecipient(
  admin: SupabaseClient,
  recipientId: string,
): Promise<SchoolAlertRecipientRow | null> {
  const now = new Date().toISOString();
  const res = await admin
    .from("school_alert_recipient")
    .update({
      read_at: now,
      acknowledged_at: now,
    })
    .eq("id", recipientId)
    .is("deleted_at", null)
    .select(RECIPIENT_COLS)
    .maybeSingle();
  return (res.data as SchoolAlertRecipientRow | null) ?? null;
}

export async function acknowledgeAllForUser(
  admin: SupabaseClient,
  input: { instituteId: string; userProfileId: string },
): Promise<number> {
  const now = new Date().toISOString();
  const res = await admin
    .from("school_alert_recipient")
    .update({
      read_at: now,
      acknowledged_at: now,
    })
    .eq("institute_id", input.instituteId)
    .eq("user_profile_id", input.userProfileId)
    .is("deleted_at", null)
    .is("acknowledged_at", null)
    .select("id");
  return res.data?.length ?? 0;
}

export async function listRecentSchoolAlerts(
  admin: SupabaseClient,
  instituteId: string,
  limit = 25,
): Promise<SchoolAlertRow[]> {
  const res = await admin
    .from("school_alert")
    .select(ALERT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (res.data ?? []) as SchoolAlertRow[];
}

export async function countRecipientsForAlert(
  admin: SupabaseClient,
  schoolAlertId: string,
): Promise<number> {
  const res = await admin
    .from("school_alert_recipient")
    .select("id")
    .eq("school_alert_id", schoolAlertId)
    .is("deleted_at", null);
  return res.data?.length ?? 0;
}
