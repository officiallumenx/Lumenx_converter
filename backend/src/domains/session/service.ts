import type { Actor } from "../../auth/types.js";

/** Safe public shape for GET /api/v1/me — no secrets or tokens. */
export type MeResponse = {
  user: {
    id: string;
  };
  profile: {
    id: string;
    displayName: string;
    email: string | null;
    status: string;
  };
  institutes: Array<{
    instituteId: string;
    membershipId: string;
    status: string;
    roles: string[];
  }>;
  platformOperator: {
    active: boolean;
    roleCode: string | null;
  };
  identities: {
    teachers: Array<{
      teacherId: string;
      instituteId: string;
      status: string;
    }>;
    students: Array<{
      studentId: string;
      instituteId: string;
    }>;
    parents: Array<{
      parentId: string;
      instituteId: string;
    }>;
  };
};

export function toMeResponse(actor: Actor): MeResponse {
  return {
    user: { id: actor.userId },
    profile: {
      id: actor.profileId,
      displayName: actor.displayName,
      email: actor.email,
      status: actor.profileStatus,
    },
    institutes: actor.memberships.map((m) => ({
      instituteId: m.instituteId,
      membershipId: m.membershipId,
      status: m.status,
      roles: [...m.roles],
    })),
    platformOperator: {
      active: actor.isPlatformOperator,
      roleCode: actor.platformRoleCode,
    },
    identities: {
      teachers: actor.teachers.map((t) => ({
        teacherId: t.teacherId,
        instituteId: t.instituteId,
        status: t.status,
      })),
      students: actor.students.map((s) => ({
        studentId: s.studentId,
        instituteId: s.instituteId,
      })),
      parents: actor.parents.map((p) => ({
        parentId: p.parentId,
        instituteId: p.instituteId,
      })),
    },
  };
}
