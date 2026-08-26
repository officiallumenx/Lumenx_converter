/**
 * Authenticated actor resolved after JWT verification + DB lookup.
 * Never includes tokens, keys, or service_role material.
 */

export type MembershipRoleCode = string;

export type ActorMembership = {
  membershipId: string;
  instituteId: string;
  status: string;
  roles: MembershipRoleCode[];
};

export type LinkedTeacher = {
  teacherId: string;
  instituteId: string;
  status: string;
};

export type LinkedStudent = {
  studentId: string;
  instituteId: string;
};

export type LinkedParent = {
  parentId: string;
  instituteId: string;
};

export type Actor = {
  /** auth.users.id === user_profile.id */
  userId: string;
  profileId: string;
  displayName: string;
  email: string | null;
  profileStatus: string;
  memberships: ActorMembership[];
  isPlatformOperator: boolean;
  platformRoleCode: string | null;
  teachers: LinkedTeacher[];
  students: LinkedStudent[];
  parents: LinkedParent[];
};
