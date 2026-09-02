import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { findStudentById } from "../students/repository.js";
import { resolveAccessibleStudentIds } from "../homework/service.js";
import { listActiveEnrollmentsForStudents } from "../homework/repository.js";
import { listTeacherAssignments } from "../timetable/repository.js";
import { findTeacherById } from "./repository.js";
import type {
  PortalLearnerFacultyDto,
  PortalLearnerFacultyMemberDto,
  PortalTeacherAssignmentSummaryDto,
  PortalTeacherSelfDto,
  TeacherRow,
} from "./types.js";

async function loadSubjectLabel(
  admin: SupabaseClient,
  subjectId: string,
): Promise<string> {
  const res = await admin
    .from("subject")
    .select("name, code")
    .eq("id", subjectId)
    .maybeSingle();
  const row = res.data as { name: string | null; code: string | null } | null;
  return row?.name?.trim() || row?.code?.trim() || "Subject";
}

async function loadClassSectionLabels(
  admin: SupabaseClient,
  input: { classId: string; sectionId: string },
): Promise<{ classLabel: string; sectionLabel: string }> {
  const sectionRes = await admin
    .from("section")
    .select("code, name")
    .eq("id", input.sectionId)
    .maybeSingle();
  const sectionRow = sectionRes.data as { code: string | null; name: string | null } | null;
  const sectionLabel =
    sectionRow?.code?.trim() || sectionRow?.name?.trim() || "Section";

  const classRes = await admin
    .from("class")
    .select("code, name, grade_label")
    .eq("id", input.classId)
    .maybeSingle();
  const classRow = classRes.data as {
    code: string | null;
    name: string | null;
    grade_label: string | null;
  } | null;
  const classLabel =
    classRow?.grade_label?.trim() ||
    classRow?.name?.trim() ||
    classRow?.code?.trim() ||
    "Class";

  return { classLabel, sectionLabel };
}

function learnerFacultyFromTeacher(
  teacher: TeacherRow,
  subjects: string[],
  isClassTeacher: boolean,
): PortalLearnerFacultyMemberDto {
  const contactVisible = teacher.status === "active";
  return {
    id: teacher.id,
    displayName: teacher.display_name,
    department: teacher.department,
    qualification: teacher.qualification,
    subjects,
    isClassTeacher,
    phone: contactVisible ? teacher.phone : null,
    email: contactVisible ? teacher.email : null,
    status: teacher.status,
  };
}

export async function getLearnerFacultyForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<PortalLearnerFacultyDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (!accessible.has(input.studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [input.studentId],
  });
  const enrollment = enrollments[0];
  if (!enrollment) {
    return {
      instituteId,
      studentId: input.studentId,
      sectionId: null,
      classLabel: null,
      sectionLabel: null,
      teachers: [],
    };
  }

  const labels = await loadClassSectionLabels(admin, {
    classId: enrollment.class_id,
    sectionId: enrollment.section_id,
  });

  const assignments = await listTeacherAssignments(admin, {
    instituteId,
    sectionId: enrollment.section_id,
    academicYearId: enrollment.academic_year_id,
    status: "active",
  });

  const byTeacher = new Map<
    string,
    { subjects: Set<string>; isClassTeacher: boolean }
  >();

  for (const assignment of assignments) {
    const subject = await loadSubjectLabel(admin, assignment.subject_id);
    const bucket = byTeacher.get(assignment.teacher_id) ?? {
      subjects: new Set<string>(),
      isClassTeacher: false,
    };
    bucket.subjects.add(subject);
    byTeacher.set(assignment.teacher_id, bucket);
  }

  const teachers: PortalLearnerFacultyMemberDto[] = [];
  for (const [teacherId, meta] of byTeacher) {
    const teacher = await findTeacherById(admin, teacherId);
    if (!teacher || teacher.institute_id !== instituteId || teacher.deleted_at) {
      continue;
    }
    if (teacher.status === "pending") continue;

    const sectionKey = `${labels.classLabel}-${labels.sectionLabel}`.toLowerCase();
    const assignedLabels = (teacher.assigned_section_labels ?? []).map((label) =>
      label.toLowerCase(),
    );
    const isClassTeacher =
      teacher.teaching_scope === "dual_role" ||
      assignedLabels.some((label) => sectionKey.includes(label) || label.includes(sectionKey));

    if (isClassTeacher) {
      meta.isClassTeacher = true;
    }

    const subjectList = [
      ...new Set([
        ...meta.subjects,
        ...((teacher.subjects ?? []).map((s) => s.trim()).filter(Boolean) as string[]),
      ]),
    ].sort((a, b) => a.localeCompare(b));

    teachers.push(
      learnerFacultyFromTeacher(teacher, subjectList, meta.isClassTeacher),
    );
  }

  teachers.sort((a, b) => {
    if (a.isClassTeacher !== b.isClassTeacher) {
      return a.isClassTeacher ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    instituteId,
    studentId: input.studentId,
    sectionId: enrollment.section_id,
    classLabel: labels.classLabel,
    sectionLabel: labels.sectionLabel,
    teachers,
  };
}

export async function getTeacherSelfPortalForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; teacherId?: string },
): Promise<PortalTeacherSelfDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const teacherId =
    input.teacherId ?? requireTeacherIdentity(actor, instituteId).teacherId;

  const ownIds = new Set(
    actor.teachers
      .filter((t) => t.instituteId === instituteId)
      .map((t) => t.teacherId),
  );
  const isStaff =
    actor.isPlatformOperator ||
    actor.memberships.some((m) =>
      m.instituteId === instituteId &&
      m.roles.some((role) =>
        [
          "institute_admin",
          "principal",
          "vice_principal",
          "coordinator",
        ].includes(role),
      ),
    );

  if (!isStaff && !ownIds.has(teacherId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const teacher = await findTeacherById(admin, teacherId);
  if (!teacher || teacher.institute_id !== instituteId) {
    throw AppError.notFound("Teacher not found");
  }

  const assignments = await listTeacherAssignments(admin, {
    instituteId,
    teacherId,
    status: "active",
  });

  const bySection = new Map<string, PortalTeacherAssignmentSummaryDto>();
  for (const assignment of assignments) {
    const labels = await loadClassSectionLabels(admin, {
      classId: assignment.class_id,
      sectionId: assignment.section_id,
    });
    const subject = await loadSubjectLabel(admin, assignment.subject_id);
    const existing = bySection.get(assignment.section_id) ?? {
      sectionId: assignment.section_id,
      classLabel: labels.classLabel,
      sectionLabel: labels.sectionLabel,
      subjects: [],
    };
    if (!existing.subjects.includes(subject)) {
      existing.subjects.push(subject);
    }
    bySection.set(assignment.section_id, existing);
  }

  const assignmentSummaries = [...bySection.values()].sort((a, b) =>
    `${a.classLabel}-${a.sectionLabel}`.localeCompare(
      `${b.classLabel}-${b.sectionLabel}`,
    ),
  );

  return {
    instituteId,
    teacherId: teacher.id,
    displayName: teacher.display_name,
    employeeId: teacher.employee_id,
    legacyCode: teacher.legacy_code,
    email: teacher.email,
    phone: teacher.phone,
    department: teacher.department,
    qualification: teacher.qualification,
    teachingScope: teacher.teaching_scope,
    portalAccessLevel: teacher.portal_access_level,
    status: teacher.status,
    subjects: teacher.subjects,
    assignedSectionLabels: teacher.assigned_section_labels,
    joinedOn: teacher.joined_on,
    assignments: assignmentSummaries,
  };
}
