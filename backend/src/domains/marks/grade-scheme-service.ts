import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findGradeSchemeById,
  insertGradeScheme,
  listGradeSchemes,
  softDeleteGradeScheme,
  updateGradeSchemeFields,
} from "./grade-scheme-repository.js";
import type {
  CreateGradeSchemeInput,
  GradeBand,
  GradeSchemeDto,
  GradeSchemeRow,
  ListGradeSchemesFilter,
  UpdateGradeSchemeInput,
} from "./grade-scheme-types.js";
import { MARKS_STAFF_WRITE_ROLES } from "./service.js";

export function toGradeSchemeDto(row: GradeSchemeRow): GradeSchemeDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    academicYearId: row.academic_year_id,
    isDefault: row.is_default,
    bands: row.bands,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertCanWriteGradeScheme(actor: Actor, instituteId: string): void {
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...MARKS_STAFF_WRITE_ROLES]);
}

export function validateBands(bands: GradeBand[]): void {
  if (!Array.isArray(bands) || bands.length === 0) {
    throw AppError.validation("bands must be a non-empty array", {
      bands: ["Required non-empty array"],
    });
  }
  for (const band of bands) {
    if (typeof band.min !== "number" || typeof band.max !== "number") {
      throw AppError.validation("Each band must have numeric min and max", {
        bands: ["Invalid band entry"],
      });
    }
    if (!band.grade || typeof band.grade !== "string") {
      throw AppError.validation("Each band must have a grade label", {
        bands: ["Missing grade label"],
      });
    }
    if (band.min > band.max) {
      throw AppError.validation("Band min must be <= max", {
        bands: [`Band ${band.grade}: min (${band.min}) > max (${band.max})`],
      });
    }
  }
}

/**
 * Resolve a letter grade from a grade scheme's bands given a percentage.
 * Returns the first matching band or null if no band covers the value.
 */
export function resolveGradeFromScheme(
  bands: GradeBand[],
  percent: number,
): GradeBand | null {
  for (const band of bands) {
    if (percent >= band.min && percent <= band.max) {
      return band;
    }
  }
  return null;
}

export async function listGradeSchemesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListGradeSchemesFilter,
): Promise<GradeSchemeDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listGradeSchemes(admin, { instituteId });
  return rows.map(toGradeSchemeDto);
}

export async function getGradeSchemeForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<GradeSchemeDto> {
  const row = await findGradeSchemeById(admin, id);
  if (!row) throw AppError.notFound("Grade scheme not found");
  requireInstituteId(actor, row.institute_id);
  return toGradeSchemeDto(row);
}

export async function createGradeSchemeForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateGradeSchemeInput,
): Promise<GradeSchemeDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanWriteGradeScheme(actor, instituteId);
  validateBands(input.bands);

  const row = await insertGradeScheme(admin, {
    instituteId,
    name: input.name,
    academicYearId: input.academicYearId ?? null,
    isDefault: input.isDefault ?? false,
    bands: input.bands,
    createdByUserId: actor.userId,
  });
  return toGradeSchemeDto(row);
}

export async function updateGradeSchemeForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateGradeSchemeInput,
): Promise<GradeSchemeDto> {
  const existing = await findGradeSchemeById(admin, id);
  if (!existing) throw AppError.notFound("Grade scheme not found");

  const instituteId = requireInstituteId(actor, existing.institute_id);
  assertCanWriteGradeScheme(actor, instituteId);

  if (input.bands !== undefined) {
    validateBands(input.bands);
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.academicYearId !== undefined) patch.academic_year_id = input.academicYearId;
  if (input.isDefault !== undefined) patch.is_default = input.isDefault;
  if (input.bands !== undefined) patch.bands = input.bands;

  if (Object.keys(patch).length === 0) {
    return toGradeSchemeDto(existing);
  }

  const row = await updateGradeSchemeFields(admin, id, patch);
  return toGradeSchemeDto(row);
}

export async function deleteGradeSchemeForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findGradeSchemeById(admin, id);
  if (!existing) throw AppError.notFound("Grade scheme not found");

  const instituteId = requireInstituteId(actor, existing.institute_id);
  assertCanWriteGradeScheme(actor, instituteId);

  await softDeleteGradeScheme(admin, id);
}
