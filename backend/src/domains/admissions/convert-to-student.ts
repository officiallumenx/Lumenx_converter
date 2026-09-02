import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { createParentForActor } from "../parents/service.js";
import { createStudentForActor } from "../students/service.js";
import type { GuardianRelationship } from "../parents/types.js";
import type { StudentGender } from "../students/types.js";
import {
  findApplicationById,
  updateApplicationFields,
} from "./repository.js";
import type { AdmissionApplicationDto } from "./types.js";
import { toApplicationDto } from "./service.js";

export type ConvertApplicationToStudentInput = {
  firstName: string;
  surname: string;
  gender: StudentGender;
  address: string;
  dateOfBirth?: string | null;
  classLabel: string;
  sectionLabel: string;
  rollNo?: string | null;
  admissionNumber?: string | null;
  bloodGroup?: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail?: string | null;
  parentPassword?: string;
  parentRelationship: GuardianRelationship;
  createParentAccount: boolean;
};

export async function convertApplicationToStudentForActor(
  admin: SupabaseClient,
  actor: Actor,
  applicationId: string,
  input: ConvertApplicationToStudentInput,
): Promise<{ application: AdmissionApplicationDto; studentId: string; parentId?: string }> {
  const application = await findApplicationById(admin, applicationId);
  if (!application) {
    throw AppError.notFound("Admission application not found");
  }
  if (application.converted_student_id) {
    throw AppError.conflict("Application was already converted to a student");
  }
  if (application.status !== "approved") {
    throw AppError.validation("Application must be approved before conversion", {
      status: ["Must be approved"],
    });
  }

  const instituteId = application.institute_id;
  requireInstituteId(actor, instituteId);
  assertInstituteAccess(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [
    "institute_admin",
    "principal",
    "vice_principal",
    "coordinator",
    "admissions_officer",
  ]);

  const student = await createStudentForActor(admin, actor, {
    instituteId,
    firstName: input.firstName.trim(),
    surname: input.surname.trim(),
    gender: input.gender,
    address: input.address.trim(),
    dateOfBirth: input.dateOfBirth ?? null,
    classLabel: input.classLabel.trim(),
    sectionLabel: input.sectionLabel.trim(),
    rollNo: input.rollNo ?? null,
    admissionNumber: input.admissionNumber ?? null,
    bloodGroup: input.bloodGroup ?? null,
    sourceAdmissionApplicationId: applicationId,
  });

  let parentId: string | undefined;
  if (input.createParentAccount) {
    const phone = input.parentPhone.replace(/\D/g, "");
    if (phone.length !== 10) {
      throw AppError.validation("parent phone must contain exactly 10 digits", {
        parent_phone: ["Invalid"],
      });
    }

    const parent = await createParentForActor(admin, actor, {
      instituteId,
      name: input.parentName.trim(),
      phone,
      email: input.parentEmail ?? null,
      address: input.address.trim() || null,
      initialLinks: [
        {
          studentId: student.id,
          relationship: input.parentRelationship,
          isPrimary: true,
          isEmergencyContact: true,
        },
      ],
    });
    parentId = parent.id;
  }

  const updatedApp = await updateApplicationFields(admin, applicationId, {
    converted_student_id: student.id,
  });
  if (!updatedApp) throw AppError.notFound("Admission application not found");

  return {
    application: toApplicationDto(updatedApp),
    studentId: student.id,
    parentId,
  };
}
