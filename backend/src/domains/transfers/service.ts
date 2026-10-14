import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { recordInstituteAuditForActor } from "../audit/service.js";
import {
  findAcademicYearById,
  findClassById,
  findSectionById,
  insertEnrollment,
} from "../academics/repository.js";
import {
  findStudentById,
  insertStudent,
  updateStudentFields,
} from "../students/repository.js";
import type { StudentGender } from "../students/types.js";
import {
  findPendingTransferForStudent,
  findTransferByClientRequestId,
  findTransferById,
  insertTransferRequest,
  listTransfersForInstitute,
  updateTransferFields,
} from "./repository.js";
import type {
  AcceptTransferInput,
  InitiateTransferInput,
  StudentTransferRequestDto,
  StudentTransferRequestRow,
  TransferSharedFields,
} from "./types.js";

const TRANSFER_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "admissions_officer",
] as const;

function assertTransferWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...TRANSFER_WRITE_ROLES]);
}

function normalizeSharedFields(
  raw: TransferSharedFields,
): TransferSharedFields {
  return {
    firstName: Boolean(raw.firstName),
    surname: Boolean(raw.surname),
    displayName: Boolean(raw.displayName),
    gender: Boolean(raw.gender),
    dateOfBirth: Boolean(raw.dateOfBirth),
    bloodGroup: Boolean(raw.bloodGroup),
    admissionNumber: Boolean(raw.admissionNumber),
  };
}

export function toTransferDto(
  row: StudentTransferRequestRow,
  preview?: { displayName: string | null; admissionNumber: string | null },
): StudentTransferRequestDto {
  return {
    id: row.id,
    sourceInstituteId: row.source_institute_id,
    destinationInstituteId: row.destination_institute_id,
    sourceStudentId: row.source_student_id,
    destinationStudentId: row.destination_student_id,
    destinationAcademicYearId: row.destination_academic_year_id,
    destinationClassId: row.destination_class_id,
    destinationSectionId: row.destination_section_id,
    status: row.status,
    effectiveOn: row.effective_on,
    initiatedByUserId: row.initiated_by_user_id,
    decidedByUserId: row.decided_by_user_id,
    decisionReason: row.decision_reason,
    sharedFields: (row.shared_fields ?? {}) as TransferSharedFields,
    clientRequestId: row.client_request_id,
    sourceStudentPreview: preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function previewForActor(
  admin: SupabaseClient,
  actor: Actor,
  row: StudentTransferRequestRow,
): Promise<{ displayName: string | null; admissionNumber: string | null } | undefined> {
  const canSource =
    actor.isPlatformOperator ||
    actor.memberships.some((m) => m.instituteId === row.source_institute_id);
  const canDest =
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) => m.instituteId === row.destination_institute_id,
    );
  if (!canSource && !canDest) return undefined;

  const student = await findStudentById(admin, row.source_student_id);
  if (!student) return undefined;

  // Destination sees only explicitly shared identity fields.
  if (canDest && !canSource) {
    const shared = normalizeSharedFields(row.shared_fields ?? {});
    return {
      displayName: shared.displayName ? student.display_name : null,
      admissionNumber: shared.admissionNumber ? student.admission_number : null,
    };
  }
  return {
    displayName: student.display_name,
    admissionNumber: student.admission_number,
  };
}

export async function initiateTransferForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: InitiateTransferInput,
): Promise<StudentTransferRequestDto> {
  const sourceInstituteId = requireInstituteId(actor, input.sourceInstituteId);
  assertTransferWriter(actor, sourceInstituteId);

  if (input.destinationInstituteId === sourceInstituteId) {
    throw AppError.validation("destination_institute_id must differ", {
      destination_institute_id: ["Must be a different institute"],
    });
  }

  const student = await findStudentById(admin, input.sourceStudentId);
  if (!student || student.institute_id !== sourceInstituteId) {
    throw AppError.notFound("Student not found in source institute");
  }

  const sharedFields = normalizeSharedFields(input.sharedFields);
  if (!sharedFields.firstName || !sharedFields.surname || !sharedFields.gender) {
    throw AppError.validation(
      "shared_fields must include firstName, surname, and gender at minimum",
      { shared_fields: ["Insufficient approved fields"] },
    );
  }

  if (input.clientRequestId?.trim()) {
    const prior = await findTransferByClientRequestId(
      admin,
      sourceInstituteId,
      input.clientRequestId.trim(),
    );
    if (prior) {
      return toTransferDto(prior, await previewForActor(admin, actor, prior));
    }
  }

  const pending = await findPendingTransferForStudent(
    admin,
    input.sourceStudentId,
  );
  if (pending) {
    throw AppError.conflict(
      "A pending transfer already exists for this student",
    );
  }

  const row = await insertTransferRequest(admin, {
    sourceInstituteId,
    destinationInstituteId: input.destinationInstituteId,
    sourceStudentId: input.sourceStudentId,
    effectiveOn: input.effectiveOn?.trim() || null,
    initiatedByUserId: actor.userId,
    sharedFields,
    clientRequestId: input.clientRequestId?.trim() || null,
  });

  await recordInstituteAuditForActor(admin, actor, {
    instituteId: sourceInstituteId,
    action: "transfer.initiated",
    entityType: "student_transfer_request",
    entityId: row.id,
    metadata: {
      destination_institute_id: input.destinationInstituteId,
      source_student_id: input.sourceStudentId,
    },
  });

  return toTransferDto(row, await previewForActor(admin, actor, row));
}

export async function listTransfersForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  status?: StudentTransferRequestRow["status"],
): Promise<StudentTransferRequestDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertTransferWriter(actor, instituteId);
  const rows = await listTransfersForInstitute(admin, instituteId, status);
  const out: StudentTransferRequestDto[] = [];
  for (const row of rows) {
    out.push(toTransferDto(row, await previewForActor(admin, actor, row)));
  }
  return out;
}

export async function getTransferForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<StudentTransferRequestDto> {
  const row = await findTransferById(admin, id);
  if (!row) throw AppError.notFound("Transfer request not found");
  const memberOf =
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) =>
        m.instituteId === row.source_institute_id ||
        m.instituteId === row.destination_institute_id,
    );
  if (!memberOf) throw AppError.forbidden("Insufficient permissions");
  assertTransferWriter(
    actor,
    actor.memberships.some((m) => m.instituteId === row.source_institute_id)
      ? row.source_institute_id
      : row.destination_institute_id,
  );
  return toTransferDto(row, await previewForActor(admin, actor, row));
}

export async function cancelTransferForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  reason?: string | null,
): Promise<StudentTransferRequestDto> {
  const row = await findTransferById(admin, id);
  if (!row) throw AppError.notFound("Transfer request not found");
  assertTransferWriter(actor, row.source_institute_id);
  if (row.status !== "pending") {
    throw AppError.conflict("Only pending transfers can be cancelled");
  }
  const updated = await updateTransferFields(admin, id, {
    status: "cancelled",
    decided_by_user_id: actor.userId,
    decision_reason: reason?.trim()?.slice(0, 2000) || null,
  });
  if (!updated) throw AppError.notFound("Transfer request not found");
  await recordInstituteAuditForActor(admin, actor, {
    instituteId: row.source_institute_id,
    action: "transfer.cancelled",
    entityType: "student_transfer_request",
    entityId: id,
    metadata: {},
  });
  return toTransferDto(updated, await previewForActor(admin, actor, updated));
}

export async function rejectTransferForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  reason?: string | null,
): Promise<StudentTransferRequestDto> {
  const row = await findTransferById(admin, id);
  if (!row) throw AppError.notFound("Transfer request not found");
  assertTransferWriter(actor, row.destination_institute_id);
  if (row.status !== "pending" && row.status !== "accepted") {
    throw AppError.conflict("Transfer cannot be rejected in its current state");
  }
  const updated = await updateTransferFields(admin, id, {
    status: "rejected",
    decided_by_user_id: actor.userId,
    decision_reason: reason?.trim()?.slice(0, 2000) || null,
  });
  if (!updated) throw AppError.notFound("Transfer request not found");
  await recordInstituteAuditForActor(admin, actor, {
    instituteId: row.destination_institute_id,
    action: "transfer.rejected",
    entityType: "student_transfer_request",
    entityId: id,
    metadata: {},
  });
  return toTransferDto(updated, await previewForActor(admin, actor, updated));
}

export async function acceptAndCompleteTransferForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: AcceptTransferInput,
): Promise<StudentTransferRequestDto> {
  const row = await findTransferById(admin, id);
  if (!row) throw AppError.notFound("Transfer request not found");
  assertTransferWriter(actor, row.destination_institute_id);

  if (row.status === "completed") {
    return toTransferDto(row, await previewForActor(admin, actor, row));
  }
  if (row.status !== "pending" && row.status !== "accepted") {
    throw AppError.conflict("Transfer cannot be accepted in its current state");
  }

  const year = await findAcademicYearById(admin, input.destinationAcademicYearId);
  if (!year || year.institute_id !== row.destination_institute_id) {
    throw AppError.validation("destination_academic_year_id invalid", {
      destination_academic_year_id: ["Not found in destination institute"],
    });
  }
  const klass = await findClassById(admin, input.destinationClassId);
  if (
    !klass ||
    klass.institute_id !== row.destination_institute_id ||
    klass.academic_year_id !== year.id
  ) {
    throw AppError.validation("destination_class_id invalid", {
      destination_class_id: ["Not found for destination year"],
    });
  }

  const sectionId = input.destinationSectionId?.trim();
  if (!sectionId) {
    throw AppError.validation("destination_section_id is required", {
      destination_section_id: ["Required to create destination enrollment"],
    });
  }
  const section = await findSectionById(admin, sectionId);
  if (
    !section ||
    section.institute_id !== row.destination_institute_id ||
    section.class_id !== klass.id
  ) {
    throw AppError.validation("destination_section_id invalid", {
      destination_section_id: ["Not found for destination class"],
    });
  }

  const source = await findStudentById(admin, row.source_student_id);
  if (!source || source.institute_id !== row.source_institute_id) {
    throw AppError.conflict("Source student no longer available");
  }

  const shared = normalizeSharedFields(row.shared_fields ?? {});
  let destinationStudentId = input.destinationStudentId?.trim() || null;

  if (destinationStudentId) {
    const linked = await findStudentById(admin, destinationStudentId);
    if (!linked || linked.institute_id !== row.destination_institute_id) {
      throw AppError.validation("destination_student_id invalid", {
        destination_student_id: ["Must belong to destination institute"],
      });
    }
  } else {
    const firstName = shared.firstName ? source.first_name : "Transferred";
    const surname = shared.surname ? source.surname : "Student";
    const displayName = shared.displayName
      ? source.display_name
      : `${firstName} ${surname}`.trim();
    const gender: StudentGender = shared.gender ? source.gender : "prefer_not_to_say";
    const created = await insertStudent(admin, {
      instituteId: row.destination_institute_id,
      firstName,
      surname,
      displayName,
      gender,
      address: "",
      dateOfBirth: shared.dateOfBirth ? source.date_of_birth : null,
      bloodGroup: shared.bloodGroup ? source.blood_group : null,
      admissionNumber: shared.admissionNumber ? source.admission_number : null,
      status: "active",
    });
    destinationStudentId = created.id;
  }

  await insertEnrollment(admin, {
    instituteId: row.destination_institute_id,
    academicYearId: year.id,
    studentId: destinationStudentId,
    classId: klass.id,
    sectionId,
    rollNo: "",
    enrolledOn: row.effective_on || new Date().toISOString().slice(0, 10),
    status: "active",
  });

  // Preserve source history — mark inactive/transferred, never re-home institute_id.
  await updateStudentFields(admin, source.id, {
    status: "inactive",
  });

  const updated = await updateTransferFields(admin, id, {
    status: "completed",
    destination_student_id: destinationStudentId,
    destination_academic_year_id: year.id,
    destination_class_id: klass.id,
    destination_section_id: sectionId,
    decided_by_user_id: actor.userId,
    decision_reason: input.reason?.trim()?.slice(0, 2000) || null,
    effective_on:
      row.effective_on || new Date().toISOString().slice(0, 10),
  });
  if (!updated) throw AppError.notFound("Transfer request not found");

  await recordInstituteAuditForActor(admin, actor, {
    instituteId: row.destination_institute_id,
    action: "transfer.completed",
    entityType: "student_transfer_request",
    entityId: id,
    metadata: {
      source_institute_id: row.source_institute_id,
      destination_student_id: destinationStudentId,
    },
  });

  // Source-side audit (actor may not have source write — use destination actor
  // only when they are platform or also source member; otherwise skip).
  const canAuditSource =
    actor.isPlatformOperator ||
    actor.memberships.some((m) => m.instituteId === row.source_institute_id);
  if (canAuditSource) {
    await recordInstituteAuditForActor(admin, actor, {
      instituteId: row.source_institute_id,
      action: "transfer.completed",
      entityType: "student_transfer_request",
      entityId: id,
      metadata: {
        destination_institute_id: row.destination_institute_id,
      },
    });
  }

  return toTransferDto(updated, await previewForActor(admin, actor, updated));
}
