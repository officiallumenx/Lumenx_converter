import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { ensureDbOk } from "../../db/errors.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findTeacherById,
  findTeacherByPhoneInInstitute,
  insertTeacher,
  listTeachers,
  softDeleteTeacher,
  toTeacherUpdatePatch,
  updateTeacherFields,
} from "./repository.js";
import {
  findClassById,
  findSectionById,
  findSubjectById,
  listSectionsByClassTeacherId,
  updateSectionFields,
} from "../academics/repository.js";
import {
  findActiveAssignmentBySectionSubject,
  insertTeacherAssignment,
  softDeleteTeacherAssignmentsForTeacher,
} from "../timetable/repository.js";
import type {
  CreateTeacherInput,
  CreateTeacherResult,
  ListTeachersFilter,
  TeacherDto,
  TeacherRow,
  UpdateTeacherInput,
} from "./types.js";

export type UpdateTeacherResult = TeacherDto & {
  classTeacherSectionIds?: string[];
};
import { canonicalPhoneDigits } from "../identity/phone.js";
import { ensureTeacherConnectIdentity } from "../auth-credentials/connect-login.js";
import { isOtpDemoMode } from "../otp-delivery/index.js";
import { loadEnv } from "../../config/env.js";

export const TEACHER_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
] as const;

export const TEACHER_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toTeacherDto(row: TeacherRow): TeacherDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    legacyCode: row.legacy_code,
    employeeId: row.employee_id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    department: row.department,
    qualification: row.qualification,
    dateOfBirth: row.date_of_birth,
    joinedOn: row.joined_on,
    teachingScope: row.teaching_scope,
    portalAccessLevel: row.portal_access_level,
    status: row.status,
    subjects: row.subjects,
    assignedSectionLabels: row.assigned_section_labels,
    sourceCareerApplicationId: row.source_career_application_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return TEACHER_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...TEACHER_STAFF_WRITE_ROLES]);
}

function resolveOwnTeacherIds(actor: Actor, instituteId: string): Set<string> {
  return new Set(
    actor.teachers
      .filter((t) => t.instituteId === instituteId)
      .map((t) => t.teacherId),
  );
}

async function assertCanReadTeacher(
  actor: Actor,
  row: TeacherRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;

  const own = resolveOwnTeacherIds(actor, row.institute_id);
  if (own.has(row.id)) return;

  // Learners/parents: no teacher directory access.
  throw AppError.forbidden("Insufficient permissions");
}

export async function listTeachersForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTeachersFilter,
): Promise<TeacherDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listTeachers(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    return rows.map(toTeacherDto);
  }

  const own = resolveOwnTeacherIds(actor, instituteId);
  if (own.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  return rows.filter((r) => own.has(r.id)).map(toTeacherDto);
}

export async function getTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
): Promise<TeacherDto> {
  const row = await findTeacherById(admin, teacherId);
  if (!row) throw AppError.notFound("Teacher not found");

  await assertCanReadTeacher(actor, row);
  return toTeacherDto(row);
}

export async function createTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeacherInput,
): Promise<CreateTeacherResult> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const displayName = input.displayName.trim();
  const department = input.department.trim();
  if (!displayName || !department) {
    throw AppError.validation("display_name and department are required", {
      display_name: !displayName ? ["Required"] : undefined,
      department: !department ? ["Required"] : undefined,
    });
  }
  const phone = canonicalPhoneDigits(input.phone ?? "");
  if (!phone) {
    throw AppError.validation("A valid 10-digit mobile number is required", {
      phone: ["Invalid"],
    });
  }

  const phoneOwner = await findTeacherByPhoneInInstitute(
    admin,
    phone,
    instituteId,
  );
  if (phoneOwner) {
    throw AppError.conflict(
      "A teacher with this mobile number already exists in this institute",
    );
  }

  const assignments = input.assignments ?? [];
  const classTeacherSectionIds = [
    ...new Set((input.classTeacherSectionIds ?? []).filter(Boolean)),
  ];

  // Deduplicate assignment pairs in the request.
  const uniqueAssignments = new Map<
    string,
    { sectionId: string; subjectId: string }
  >();
  for (const link of assignments) {
    uniqueAssignments.set(`${link.sectionId}:${link.subjectId}`, {
      sectionId: link.sectionId,
      subjectId: link.subjectId,
    });
  }

  type ResolvedAssignment = {
    sectionId: string;
    subjectId: string;
    academicYearId: string;
    classId: string;
    sectionLabel: string;
    subjectLabel: string;
  };
  const resolvedAssignments: ResolvedAssignment[] = [];
  const classTeacherLabels: string[] = [];
  const sectionCache = new Map<
    string,
    NonNullable<Awaited<ReturnType<typeof findSectionById>>>
  >();

  async function loadSection(sectionId: string) {
    const cached = sectionCache.get(sectionId);
    if (cached) return cached;
    const section = await findSectionById(admin, sectionId);
    if (!section || section.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: [`Section not found: ${sectionId}`],
      });
    }
    sectionCache.set(sectionId, section);
    return section;
  }

  for (const sectionId of classTeacherSectionIds) {
    const section = await loadSection(sectionId);
    const klass = await findClassById(admin, section.class_id);
    const classCode = klass?.code?.trim() || klass?.name?.trim() || "Class";
    classTeacherLabels.push(`${classCode}-${section.code}`);
  }

  for (const link of uniqueAssignments.values()) {
    const section = await loadSection(link.sectionId);
    const subject = await findSubjectById(admin, link.subjectId);
    if (!subject || subject.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        subject_id: [`Subject not found: ${link.subjectId}`],
      });
    }

    const existing = await findActiveAssignmentBySectionSubject(admin, {
      sectionId: section.id,
      subjectId: subject.id,
    });
    if (existing) {
      const klass = await findClassById(admin, section.class_id);
      const classCode = klass?.code?.trim() || klass?.name?.trim() || "Class";
      const subjectLabel =
        subject.name?.trim() || subject.code?.trim() || "Subject";
      throw AppError.conflict(
        `${subjectLabel} is already assigned to another teacher in ${classCode}-${section.code}`,
      );
    }

    const klass = await findClassById(admin, section.class_id);
    const classCode = klass?.code?.trim() || klass?.name?.trim() || "Class";
    resolvedAssignments.push({
      sectionId: section.id,
      subjectId: subject.id,
      academicYearId: section.academic_year_id,
      classId: section.class_id,
      sectionLabel: `${classCode}-${section.code}`,
      subjectLabel: subject.name?.trim() || subject.code?.trim() || "Subject",
    });
  }

  const assignedSectionLabels = [
    ...new Set([
      ...(input.assignedSectionLabels ?? []).map((l) => l.trim()).filter(Boolean),
      ...classTeacherLabels,
      ...resolvedAssignments.map((a) => a.sectionLabel),
    ]),
  ];

  const row = await insertTeacher(admin, {
    ...input,
    instituteId,
    displayName,
    department,
    phone,
    assignedSectionLabels:
      assignedSectionLabels.length > 0
        ? assignedSectionLabels
        : input.assignedSectionLabels,
  });

  const assignmentIds: string[] = [];
  const classTeacherRollback: Array<{
    sectionId: string;
    previousTeacherId: string | null;
  }> = [];
  try {
    for (const link of resolvedAssignments) {
      const created = await insertTeacherAssignment(admin, {
        instituteId,
        academicYearId: link.academicYearId,
        classId: link.classId,
        sectionId: link.sectionId,
        subjectId: link.subjectId,
        teacherId: row.id,
        status: "active",
      });
      assignmentIds.push(created.id);
    }

    for (const sectionId of classTeacherSectionIds) {
      const section = await loadSection(sectionId);
      classTeacherRollback.push({
        sectionId,
        previousTeacherId: section.class_teacher_id ?? null,
      });
      await updateSectionFields(admin, sectionId, {
        class_teacher_id: row.id,
      });
    }
  } catch (error) {
    // Roll back partial create so Admin does not leave an orphan teacher.
    await softDeleteTeacherAssignmentsForTeacher(admin, row.id).catch(
      () => undefined,
    );
    for (const item of classTeacherRollback) {
      await updateSectionFields(admin, item.sectionId, {
        class_teacher_id: item.previousTeacherId,
      }).catch(() => undefined);
    }
    await softDeleteTeacher(admin, row.id).catch(() => undefined);
    throw error;
  }

  // Provision Connect login identity (user_profile + membership) so the teacher
  // can sign in and /me exposes identities.teachers for My Classes / Students.
  try {
    await ensureTeacherConnectIdentity(admin, instituteId, phone);
  } catch {
    // Directory + assignments already committed; login can still be repaired via
    // Admin credential reset. Do not roll back the teacher row.
  }

  const linked = await findTeacherById(admin, row.id);
  return {
    ...toTeacherDto(linked ?? row),
    assignmentIds,
    classTeacherSectionIds,
  };
}

export async function updateTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
  patch: UpdateTeacherInput,
): Promise<UpdateTeacherResult> {
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toTeacherUpdatePatch(patch);
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
  }
  if (typeof fieldPatch.department === "string") {
    fieldPatch.department = fieldPatch.department.trim();
  }

  const hasClassTeacherUpdate = patch.classTeacherSectionIds !== undefined;
  if (Object.keys(fieldPatch).length === 0 && !hasClassTeacherUpdate) {
    return toTeacherDto(existing);
  }

  let row = existing;
  if (Object.keys(fieldPatch).length > 0) {
    const updated = await updateTeacherFields(admin, teacherId, fieldPatch);
    if (!updated) throw AppError.notFound("Teacher not found");
    row = updated;
  }

  let classTeacherSectionIds: string[] | undefined;
  if (hasClassTeacherUpdate) {
    const desired = [
      ...new Set((patch.classTeacherSectionIds ?? []).filter(Boolean)),
    ];
    const current = await listSectionsByClassTeacherId(admin, {
      instituteId: existing.institute_id,
      teacherId,
    });
    const desiredSet = new Set(desired);

    for (const section of current) {
      if (!desiredSet.has(section.id)) {
        await updateSectionFields(admin, section.id, {
          class_teacher_id: null,
        });
      }
    }

    for (const sectionId of desired) {
      const section = await findSectionById(admin, sectionId);
      if (!section || section.institute_id !== existing.institute_id) {
        throw AppError.validation("Referenced resource is invalid", {
          section_id: [`Section not found: ${sectionId}`],
        });
      }
      if (section.class_teacher_id !== teacherId) {
        await updateSectionFields(admin, sectionId, {
          class_teacher_id: teacherId,
        });
      }
    }
    classTeacherSectionIds = desired;
  }

  return {
    ...toTeacherDto(row),
    ...(classTeacherSectionIds !== undefined ? { classTeacherSectionIds } : {}),
  };
}

export async function deleteTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
): Promise<void> {
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteTeacher(admin, teacherId);
  if (!deleted) {
    throw AppError.conflict("Teacher was already deleted");
  }

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "teacher",
    entityId: teacherId,
    module: "Teachers",
    title: existing.display_name?.trim() || "Teacher",
    subtitle: existing.employee_id,
  });
}

export type ResetTeacherCredentialsResult = {
  ok: true;
  pinCleared: boolean;
  email: string | null;
  delivery: "demo" | "email" | "pin_only";
  /** Only returned in OTP demo mode when a recovery link was generated. */
  recoveryLink: string | null;
};

function isDeliverableEmail(value: string | null | undefined): value is string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) return false;
  if (
    email.endsWith(".invalid") ||
    email.endsWith("@portal.lumenx.local") ||
    email.endsWith("@portal.lumenx.internal") ||
    email.endsWith("@connect.lumenx.invalid")
  ) {
    return false;
  }
  return true;
}

async function sendTeacherRecoveryEmail(
  to: string,
  recoveryLink: string,
): Promise<boolean> {
  const env = loadEnv();
  if (env.OTP_EMAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.OTP_EMAIL_FROM) {
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.OTP_EMAIL_FROM,
      to: [to],
      subject: "LumenX password reset",
      text: [
        "Your institute admin requested a password reset for your LumenX account.",
        "",
        "Open this link to set a new password:",
        recoveryLink,
        "",
        "If you did not expect this, contact your institute admin.",
      ].join("\n"),
    }),
  });
  return res.ok;
}

/**
 * Admin-initiated credential reset for a teacher:
 * - Clears Connect PIN so the next login requires a new PIN
 * - Optionally emails a password recovery link when a real email is present
 */
export async function resetTeacherCredentialsForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
): Promise<ResetTeacherCredentialsResult> {
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertStaffWriter(actor, existing.institute_id);

  let userId = existing.user_profile_id;
  if (!userId) {
    const phone = canonicalPhoneDigits(existing.phone ?? "");
    if (!phone) {
      throw AppError.validation(
        "Teacher needs a phone number or linked login before credentials can be reset",
        { phone: ["Required"] },
      );
    }
    await ensureTeacherConnectIdentity(admin, existing.institute_id, phone);
    const refreshed = await findTeacherById(admin, teacherId);
    userId = refreshed?.user_profile_id ?? null;
  }
  if (!userId) {
    throw AppError.conflict("Unable to resolve teacher login account");
  }

  const pinDelete = await admin
    .from("connect_login_credential")
    .delete()
    .eq("user_profile_id", userId)
    .eq("institute_id", existing.institute_id)
    .eq("role", "teacher");
  if (pinDelete.error) ensureDbOk(pinDelete);

  const profileClear = await admin
    .from("user_profile")
    .update({
      pin_hash: null,
      pin_salt: null,
      pin_set_at: null,
      first_login_completed_at: null,
    })
    .eq("id", userId)
    .is("deleted_at", null);
  if (profileClear.error) ensureDbOk(profileClear);

  const email = isDeliverableEmail(existing.email)
    ? existing.email.trim().toLowerCase()
    : null;

  let recoveryLink: string | null = null;
  let delivery: ResetTeacherCredentialsResult["delivery"] = "pin_only";

  if (email) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const authEmail = authUser.user?.email?.trim().toLowerCase() ?? null;
    const linkEmail =
      isDeliverableEmail(authEmail) ? authEmail : email;

    if (
      authEmail &&
      authEmail !== linkEmail &&
      (authEmail.endsWith(".invalid") || authEmail.includes("@portal.lumenx."))
    ) {
      const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
        email: linkEmail,
      });
      if (emailError) {
        throw AppError.validation(
          emailError.message || "Unable to update login email for password reset",
        );
      }
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: linkEmail,
    });
    if (!linkError) {
      const actionLink =
        (linkData.properties as { action_link?: string } | null)?.action_link ??
        null;
      if (isOtpDemoMode()) {
        delivery = "demo";
        recoveryLink = actionLink;
      } else if (actionLink) {
        const sent = await sendTeacherRecoveryEmail(linkEmail, actionLink);
        delivery = sent ? "email" : "pin_only";
      }
    }
  }

  return {
    ok: true,
    pinCleared: true,
    email,
    delivery,
    recoveryLink,
  };
}
