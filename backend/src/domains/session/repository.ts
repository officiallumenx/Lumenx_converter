import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  Actor,
  ActorMembership,
  LinkedParent,
  LinkedStudent,
  LinkedTeacher,
} from "../../auth/types.js";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  status: string;
  deleted_at: string | null;
};

type MembershipRow = {
  id: string;
  institute_id: string;
  status: string;
};

type MembershipRoleRow = {
  membership_id: string;
  role_code: string;
};

type PlatformOperatorRow = {
  user_id: string;
  role_code: string;
  status: string;
};

type TeacherRow = {
  id: string;
  institute_id: string;
  status: string;
};

type StudentRow = {
  id: string;
  institute_id: string;
};

type ParentRow = {
  id: string;
  institute_id: string;
};

/**
 * Load durable actor context for a verified auth user id (service_role).
 */
export async function loadActorByUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<Actor> {
  const profileResult = await admin
    .from("user_profile")
    .select("id, display_name, email, status, deleted_at")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileResult.error) {
    ensureDbOk(profileResult);
  }

  const profile = profileResult.data as ProfileRow | null;
  if (!profile || profile.status === "disabled") {
    throw AppError.forbidden("Profile is unavailable");
  }

  const membershipsResult = await admin
    .from("membership")
    .select("id, institute_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null);

  let membershipRows = ensureDbOk(membershipsResult) as MembershipRow[];

  if (membershipRows.length > 0) {
    const instituteIds = [...new Set(membershipRows.map((m) => m.institute_id))];
    const institutesResult = await admin
      .from("institute")
      .select("id, deleted_at")
      .in("id", instituteIds);
    const deletedInstituteIds = new Set(
      (ensureDbOk(institutesResult) as Array<{ id: string; deleted_at: string | null }>)
        .filter((r) => r.deleted_at != null)
        .map((r) => r.id),
    );
    if (deletedInstituteIds.size > 0) {
      membershipRows = membershipRows.filter(
        (m) => !deletedInstituteIds.has(m.institute_id),
      );
    }
  }

  let rolesByMembership = new Map<string, string[]>();
  if (membershipRows.length > 0) {
    const membershipIds = membershipRows.map((m) => m.id);
    const rolesResult = await admin
      .from("membership_role")
      .select("membership_id, role_code")
      .in("membership_id", membershipIds);

    const roleRows = ensureDbOk(rolesResult) as MembershipRoleRow[];
    rolesByMembership = roleRows.reduce((acc, row) => {
      const list = acc.get(row.membership_id) ?? [];
      list.push(row.role_code);
      acc.set(row.membership_id, list);
      return acc;
    }, new Map<string, string[]>());
  }

  const memberships: ActorMembership[] = membershipRows.map((m) => ({
    membershipId: m.id,
    instituteId: m.institute_id,
    status: m.status,
    roles: rolesByMembership.get(m.id) ?? [],
  }));

  const operatorResult = await admin
    .from("platform_operator")
    .select("user_id, role_code, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (operatorResult.error) {
    ensureDbOk(operatorResult);
  }
  const operator = operatorResult.data as PlatformOperatorRow | null;

  const teachersResult = await admin
    .from("teacher")
    .select("id, institute_id, status")
    .eq("user_profile_id", userId)
    .is("deleted_at", null);

  const teacherRows = ensureDbOk(teachersResult) as TeacherRow[];
  const teachers: LinkedTeacher[] = teacherRows.map((t) => ({
    teacherId: t.id,
    instituteId: t.institute_id,
    status: t.status,
  }));

  const studentsResult = await admin
    .from("student")
    .select("id, institute_id")
    .eq("user_profile_id", userId)
    .is("deleted_at", null);

  const studentRows = ensureDbOk(studentsResult) as StudentRow[];
  const students: LinkedStudent[] = studentRows.map((s) => ({
    studentId: s.id,
    instituteId: s.institute_id,
  }));

  const parentsResult = await admin
    .from("parent")
    .select("id, institute_id")
    .eq("user_profile_id", userId)
    .is("deleted_at", null);

  const parentRows = ensureDbOk(parentsResult) as ParentRow[];
  const parents: LinkedParent[] = parentRows.map((p) => ({
    parentId: p.id,
    instituteId: p.institute_id,
  }));

  return {
    userId,
    profileId: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    profileStatus: profile.status,
    memberships,
    isPlatformOperator: Boolean(operator),
    platformRoleCode: operator?.role_code ?? null,
    teachers,
    students,
    parents,
  };
}

export async function findActiveTeacherAssignment(
  admin: SupabaseClient,
  input: {
    teacherId: string;
    instituteId: string;
    sectionId: string;
    subjectId: string;
    academicYearId?: string;
  },
): Promise<{ id: string } | null> {
  let query = admin
    .from("teacher_assignment")
    .select("id")
    .eq("teacher_id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .eq("section_id", input.sectionId)
    .eq("subject_id", input.subjectId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (input.academicYearId) {
    query = query.eq("academic_year_id", input.academicYearId);
  }

  const result = await query.maybeSingle();
  if (result.error) {
    ensureDbOk(result);
  }
  const row = result.data as { id: string } | null;
  return row;
}
