import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type { GradeSchemeRow } from "./grade-scheme-types.js";

const COLUMNS =
  "id, institute_id, name, academic_year_id, is_default, bands, created_by_user_id, created_at, updated_at, deleted_at";

export async function listGradeSchemes(
  admin: SupabaseClient,
  filter: { instituteId: string },
): Promise<GradeSchemeRow[]> {
  const result = await admin
    .from("grade_scheme")
    .select(COLUMNS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as GradeSchemeRow[];
}

export async function findGradeSchemeById(
  admin: SupabaseClient,
  id: string,
): Promise<GradeSchemeRow | null> {
  const result = await admin
    .from("grade_scheme")
    .select(COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GradeSchemeRow | null) ?? null;
}

export async function insertGradeScheme(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    name: string;
    academicYearId: string | null;
    isDefault: boolean;
    bands: unknown;
    createdByUserId: string;
  },
): Promise<GradeSchemeRow> {
  const result = await admin
    .from("grade_scheme")
    .insert({
      institute_id: input.instituteId,
      name: input.name,
      academic_year_id: input.academicYearId,
      is_default: input.isDefault,
      bands: input.bands,
      created_by_user_id: input.createdByUserId,
    })
    .select(COLUMNS)
    .single();
  return ensureDbOk(result) as GradeSchemeRow;
}

export async function updateGradeSchemeFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<GradeSchemeRow> {
  const result = await admin
    .from("grade_scheme")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLUMNS)
    .single();
  return ensureDbOk(result) as GradeSchemeRow;
}

export async function softDeleteGradeScheme(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const result = await admin
    .from("grade_scheme")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}
