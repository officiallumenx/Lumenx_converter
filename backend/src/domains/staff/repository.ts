import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateStaffAccountInput,
  ListStaffAccountsFilter,
  StaffAccountRow,
  UpdateStaffAccountInput,
} from "./types.js";

const STAFF_COLS =
  "id, institute_id, user_profile_id, legacy_code, employee_id, display_name, phone, email, department, job_title, date_of_birth, joined_on, status, source_career_application_id, created_at, updated_at, deleted_at";

export async function listStaffAccounts(
  admin: SupabaseClient,
  filter: ListStaffAccountsFilter,
): Promise<StaffAccountRow[]> {
  let query = admin
    .from("staff_account")
    .select(STAFF_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  let rows = ensureDbOk(result) as StaffAccountRow[];

  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.display_name,
          r.phone,
          r.email,
          r.employee_id,
          r.legacy_code,
          r.department,
          r.job_title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
  }

  return rows;
}

export async function findStaffAccountById(
  admin: SupabaseClient,
  id: string,
): Promise<StaffAccountRow | null> {
  const result = await admin
    .from("staff_account")
    .select(STAFF_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAccountRow | null) ?? null;
}

export async function insertStaffAccount(
  admin: SupabaseClient,
  input: CreateStaffAccountInput,
): Promise<StaffAccountRow> {
  const result = await admin
    .from("staff_account")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: null,
      legacy_code: input.legacyCode ?? null,
      employee_id: input.employeeId ?? null,
      display_name: input.displayName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      department: input.department,
      job_title: input.jobTitle ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      joined_on: input.joinedOn ?? null,
      status: input.status ?? "active",
      source_career_application_id: null,
    })
    .select(STAFF_COLS)
    .single();
  return ensureDbOk(result) as StaffAccountRow;
}

export async function updateStaffAccountFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StaffAccountRow | null> {
  const result = await admin
    .from("staff_account")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(STAFF_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAccountRow | null) ?? null;
}

export async function softDeleteStaffAccount(
  admin: SupabaseClient,
  id: string,
): Promise<StaffAccountRow | null> {
  const result = await admin
    .from("staff_account")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(STAFF_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAccountRow | null) ?? null;
}

export function toStaffAccountUpdatePatch(
  input: UpdateStaffAccountInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.department !== undefined) patch.department = input.department;
  if (input.status !== undefined) patch.status = input.status;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.jobTitle !== undefined) patch.job_title = input.jobTitle;
  if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
  if (input.joinedOn !== undefined) patch.joined_on = input.joinedOn;
  if (input.employeeId !== undefined) patch.employee_id = input.employeeId;
  if (input.legacyCode !== undefined) patch.legacy_code = input.legacyCode;
  return patch;
}
