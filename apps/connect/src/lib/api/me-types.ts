/** Mirrors backend GET /api/v1/me. */

export type MeInstituteMembership = {
  instituteId: string;
  membershipId: string;
  status: string;
  roles: string[];
};

export type MeResponse = {
  user: { id: string };
  profile: {
    id: string;
    displayName: string;
    email: string | null;
    status: string;
  };
  institutes: MeInstituteMembership[];
  platformOperator: {
    active: boolean;
    roleCode: string | null;
  };
  identities: {
    teachers: Array<{ teacherId: string; instituteId: string; status: string }>;
    students: Array<{ studentId: string; instituteId: string }>;
    parents: Array<{ parentId: string; instituteId: string }>;
    staff: Array<{
      staffAccountId: string;
      instituteId: string;
      status: string;
    }>;
  };
};
