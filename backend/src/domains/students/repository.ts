import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { AppError } from "../../errors/app-error.js";
import { createLogger } from "../../logger/logger.js";
import {
  clampListLimit,
  decodeNameIdCursor,
  nameIdCursorOrFilter,
  nextNameIdCursorFromRows,
} from "../../lib/name-id-cursor.js";
import type {
  CreateStudentInput,
  ListStudentsFilter,
  StudentRow,
  UpdateStudentInput,
} from "./types.js";

const log = createLogger("info");

/** Full select once migration 20261014120000 is applied. */
const STUDENT_COLS =
  "id, institute_id, user_profile_id, legacy_code, admission_number, source_admission_application_id, first_name, surname, display_name, gender, date_of_birth, address, class_label, section_label, roll_no, status, access_status, blood_group, emergency_contact, house, photo_asset_path, id_card_issued_on, id_card_valid_till, graduated_on, created_at, updated_at, deleted_at";

/**
 * Compat select when hosted DB has not yet applied records retention migration.
 * Does not weaken auth — only omits a nullable retention column.
 */
const STUDENT_COLS_WITHOUT_GRADUATED_ON =
  "id, institute_id, user_profile_id, legacy_code, admission_number, source_admission_application_id, first_name, surname, display_name, gender, date_of_birth, address, class_label, section_label, roll_no, status, access_status, blood_group, emergency_contact, house, photo_asset_path, id_card_issued_on, id_card_valid_till, created_at, updated_at, deleted_at";

/** Process-local: prefer full cols until Postgres 42703 proves column missing. */
let studentColsMode: "full" | "compat_missing_graduated_on" = "full";
let loggedMissingGraduatedOn = false;

/** Test/ops: whether selects are running without graduated_on. */
export function isStudentGraduatedOnSelectCompatActive(): boolean {
  return studentColsMode === "compat_missing_graduated_on";
}

/** Test helper — reset compat detection between cases. */
export function resetStudentSelectCompatForTests(): void {
  studentColsMode = "full";
  loggedMissingGraduatedOn = false;
}

function studentSelectCols(): string {
  return studentColsMode === "full"
    ? STUDENT_COLS
    : STUDENT_COLS_WITHOUT_GRADUATED_ON;
}

function isMissingGraduatedOnColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code !== "42703" && error.code !== "PGRST204") return false;
  return /graduated_on/i.test(error.message ?? "");
}

function normalizeStudentRow(row: StudentRow | Record<string, unknown>): StudentRow {
  const r = row as StudentRow;
  return {
    ...r,
    graduated_on: r.graduated_on ?? null,
  };
}

function normalizeStudentRows(rows: StudentRow[]): StudentRow[] {
  return rows.map((r) => normalizeStudentRow(r));
}

function noteMissingGraduatedOnColumn(): void {
  studentColsMode = "compat_missing_graduated_on";
  if (loggedMissingGraduatedOn) return;
  loggedMissingGraduatedOn = true;
  log.warn({
    msg: "student_schema_missing_graduated_on",
    migration: "20261014120000_records_retention_transfer.sql",
    action:
      "Apply pending Supabase migration; transport roster uses temporary select without graduated_on",
  });
}

export async function listGuardianStudentIds(
  admin: SupabaseClient,
  parentId: string,
  instituteId: string,
): Promise<string[]> {
  const result = await admin
    .from("guardian_link")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ student_id: string }>;
  return rows.map((r) => r.student_id);
}

export type StudentListPage = {
  rows: StudentRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const STUDENTS_LIST_DEFAULT_LIMIT = 100;
export const STUDENTS_LIST_MAX_LIMIT = 200;

function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_,]/g, " ").trim().slice(0, 200);
}

async function runStudentListPageQuery(
  admin: SupabaseClient,
  filter: ListStudentsFilter,
  cols: string,
) {
  const limit = clampListLimit(filter.limit);
  const cursor = decodeNameIdCursor(filter.cursor);

  let query = admin
    .from("student")
    .select(cols)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.accessStatus) query = query.eq("access_status", filter.accessStatus);
  if (filter.classLabel) query = query.eq("class_label", filter.classLabel);
  if (filter.sectionLabel) query = query.eq("section_label", filter.sectionLabel);

  const q = filter.q ? sanitizeIlikeTerm(filter.q) : "";
  if (q) {
    const pattern = `"%${q.replace(/"/g, "")}%"`;
    query = query.or(
      [
        `display_name.ilike.${pattern}`,
        `first_name.ilike.${pattern}`,
        `surname.ilike.${pattern}`,
        `admission_number.ilike.${pattern}`,
        `legacy_code.ilike.${pattern}`,
        `roll_no.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (cursor) {
    query = query.or(nameIdCursorOrFilter(cursor, "display_name"));
  }

  return query
    .order("display_name", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);
}

export async function listStudentsPage(
  admin: SupabaseClient,
  filter: ListStudentsFilter,
): Promise<StudentListPage> {
  const limit = clampListLimit(filter.limit);
  let result = await runStudentListPageQuery(admin, filter, studentSelectCols());
  if (result.error && isMissingGraduatedOnColumn(result.error)) {
    noteMissingGraduatedOnColumn();
    result = await runStudentListPageQuery(
      admin,
      filter,
      STUDENT_COLS_WITHOUT_GRADUATED_ON,
    );
  }
  const fetched = normalizeStudentRows(
    ensureDbOk(result) as unknown as StudentRow[],
  );
  const page = nextNameIdCursorFromRows(fetched, limit, (r) => r.display_name);
  return {
    rows: page.items,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

/** Internal/full fetch — pages until exhausted (no silent max-rows truncation). */
export async function listStudents(
  admin: SupabaseClient,
  filter: ListStudentsFilter,
): Promise<StudentRow[]> {
  const rows: StudentRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await listStudentsPage(admin, {
      ...filter,
      cursor,
      limit: STUDENTS_LIST_MAX_LIMIT,
    });
    rows.push(...page.rows);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function findStudentById(
  admin: SupabaseClient,
  id: string,
): Promise<StudentRow | null> {
  let result = await admin
    .from("student")
    .select(studentSelectCols())
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error && isMissingGraduatedOnColumn(result.error)) {
    noteMissingGraduatedOnColumn();
    result = await admin
      .from("student")
      .select(STUDENT_COLS_WITHOUT_GRADUATED_ON)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
  }
  if (result.error) ensureDbOk(result);
  const row = (result.data as StudentRow | null) ?? null;
  return row ? normalizeStudentRow(row) : null;
}

export async function insertStudent(
  admin: SupabaseClient,
  input: CreateStudentInput & { displayName: string },
): Promise<StudentRow> {
  const inserted = await admin
    .from("student")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: null,
      legacy_code: input.legacyCode ?? null,
      admission_number: input.admissionNumber ?? null,
      source_admission_application_id: input.sourceAdmissionApplicationId ?? null,
      first_name: input.firstName,
      surname: input.surname,
      display_name: input.displayName,
      gender: input.gender,
      date_of_birth: input.dateOfBirth ?? null,
      address: input.address,
      class_label: input.classLabel ?? null,
      section_label: input.sectionLabel ?? null,
      roll_no: input.rollNo ?? null,
      status: input.status ?? "active",
      access_status: input.accessStatus ?? "active",
      blood_group: input.bloodGroup ?? null,
      emergency_contact: input.emergencyContact ?? null,
      house: input.house ?? null,
      photo_asset_path: input.photoAssetPath ?? null,
      id_card_issued_on: input.idCardIssuedOn ?? null,
      id_card_valid_till: input.idCardValidTill ?? null,
    })
    .select("id")
    .single();
  const row = ensureDbOk(inserted) as { id: string };
  const full = await findStudentById(admin, row.id);
  if (!full) {
    throw AppError.internal("Student insert succeeded but row could not be reloaded");
  }
  return full;
}

async function selectStudentAfterWrite(
  admin: SupabaseClient,
  build: (cols: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
): Promise<StudentRow | null> {
  let result = await build(studentSelectCols());
  if (result.error && isMissingGraduatedOnColumn(result.error)) {
    noteMissingGraduatedOnColumn();
    result = await build(STUDENT_COLS_WITHOUT_GRADUATED_ON);
  }
  if (result.error) ensureDbOk(result);
  const row = (result.data as StudentRow | null) ?? null;
  return row ? normalizeStudentRow(row) : null;
}

export async function updateStudentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StudentRow | null> {
  return selectStudentAfterWrite(admin, (cols) =>
    admin
      .from("student")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select(cols)
      .maybeSingle(),
  );
}

export async function softDeleteStudent(
  admin: SupabaseClient,
  id: string,
): Promise<StudentRow | null> {
  return selectStudentAfterWrite(admin, (cols) =>
    admin
      .from("student")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select(cols)
      .maybeSingle(),
  );
}

/** Build DB patch from update input (camel → snake). */
export function toStudentUpdatePatch(input: UpdateStudentInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.firstName !== undefined) patch.first_name = input.firstName;
  if (input.surname !== undefined) patch.surname = input.surname;
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.gender !== undefined) patch.gender = input.gender;
  if (input.address !== undefined) patch.address = input.address;
  if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
  if (input.classLabel !== undefined) patch.class_label = input.classLabel;
  if (input.sectionLabel !== undefined) patch.section_label = input.sectionLabel;
  if (input.rollNo !== undefined) patch.roll_no = input.rollNo;
  if (input.status !== undefined) patch.status = input.status;
  if (input.accessStatus !== undefined) patch.access_status = input.accessStatus;
  if (input.bloodGroup !== undefined) patch.blood_group = input.bloodGroup;
  if (input.emergencyContact !== undefined) {
    patch.emergency_contact = input.emergencyContact;
  }
  if (input.house !== undefined) patch.house = input.house;
  if (input.photoAssetPath !== undefined) {
    patch.photo_asset_path = input.photoAssetPath;
  }
  if (input.admissionNumber !== undefined) {
    patch.admission_number = input.admissionNumber;
  }
  if (input.legacyCode !== undefined) patch.legacy_code = input.legacyCode;
  if (input.idCardIssuedOn !== undefined) {
    patch.id_card_issued_on = input.idCardIssuedOn;
  }
  if (input.idCardValidTill !== undefined) {
    patch.id_card_valid_till = input.idCardValidTill;
  }
  return patch;
}
