import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { insertTeacher } from "../teachers/repository.js";
import { toTeacherDto } from "../teachers/service.js";
import type {
  PortalAccessLevel,
  TeacherDto,
  TeacherStatus,
  TeachingScope,
} from "../teachers/types.js";
import {
  findApplicationById,
  updateApplicationFields,
} from "./repository.js";
import type { CareerApplicationDto } from "./types.js";
import { CAREER_WRITE_ROLES, toApplicationDto } from "./service.js";

export type ConvertApplicationToTeacherInput = {
  displayName: string;
  department: string;
  teachingScope: TeachingScope;
  portalAccessLevel: PortalAccessLevel;
  status?: TeacherStatus;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  dateOfBirth?: string | null;
  employeeId?: string | null;
  joinedOn?: string | null;
};

const CONVERTIBLE_STATUSES = new Set(["selected", "offer_accepted"]);

export async function convertApplicationToTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  applicationId: string,
  input: ConvertApplicationToTeacherInput,
): Promise<{ application: CareerApplicationDto; teacher: TeacherDto }> {
  const application = await findApplicationById(admin, applicationId);
  if (!application) {
    throw AppError.notFound("Career application not found");
  }
  if (application.converted_teacher_id) {
    throw AppError.conflict("Application was already converted to a teacher");
  }
  if (!CONVERTIBLE_STATUSES.has(application.status)) {
    throw AppError.validation(
      "Application must be selected (or offer accepted) before conversion",
      { status: ["Must be selected or offer_accepted"] },
    );
  }

  const instituteId = application.institute_id;
  requireInstituteId(actor, instituteId);
  assertInstituteAccess(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...CAREER_WRITE_ROLES]);

  const displayName = input.displayName.trim();
  const department = input.department.trim();
  if (!displayName || !department) {
    throw AppError.validation("display_name and department are required", {
      display_name: !displayName ? ["Required"] : undefined,
      department: !department ? ["Required"] : undefined,
    });
  }

  const teacherRow = await insertTeacher(admin, {
    instituteId,
    displayName,
    department,
    teachingScope: input.teachingScope,
    portalAccessLevel: input.portalAccessLevel,
    status: input.status ?? "active",
    phone: input.phone ?? null,
    email: input.email ?? null,
    qualification: input.qualification ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    employeeId: input.employeeId ?? null,
    joinedOn: input.joinedOn ?? null,
    sourceCareerApplicationId: applicationId,
  });
  const teacher = toTeacherDto(teacherRow);

  const patch: Record<string, unknown> = {
    converted_teacher_id: teacher.id,
  };
  if (application.status !== "selected") {
    patch.status = "selected";
  }

  const updatedApp = await updateApplicationFields(admin, applicationId, patch);
  if (!updatedApp) throw AppError.notFound("Career application not found");

  return {
    application: toApplicationDto(updatedApp),
    teacher,
  };
}
