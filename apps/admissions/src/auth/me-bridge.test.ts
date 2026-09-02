import { describe, expect, it } from "vitest";
import type { MeResponse } from "@/lib/api/me-types";
import {
  admissionsUserFromMe,
  pickInstituteAdminMembership,
  resolveAdmissionsAccountType,
} from "./me-bridge";

const principalMe: MeResponse = {
  user: { id: "11111111-1111-4111-8111-111111111111" },
  profile: {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Dr. Ananya Verma",
    email: "principal@example.com",
    status: "active",
  },
  institutes: [
    {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      membershipId: "m1",
      status: "active",
      roles: ["principal"],
    },
  ],
  platformOperator: { active: false, roleCode: null },
  identities: { teachers: [], students: [], parents: [], staff: [] },
};

const parentMe: MeResponse = {
  ...principalMe,
  institutes: [],
};

describe("pickInstituteAdminMembership", () => {
  it("returns active institute membership with staff role", () => {
    const m = pickInstituteAdminMembership(principalMe.institutes);
    expect(m?.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});

describe("resolveAdmissionsAccountType", () => {
  it("maps institute staff to institute_admin", () => {
    expect(resolveAdmissionsAccountType(principalMe)).toBe("institute_admin");
  });

  it("maps users without institute membership to parent", () => {
    expect(resolveAdmissionsAccountType(parentMe)).toBe("parent");
  });
});

describe("admissionsUserFromMe", () => {
  it("maps /me into AdmissionsUser for institute admins", () => {
    const user = admissionsUserFromMe(principalMe, {
      instituteName: "Alpha School",
      preferredInstituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(user.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(user.accountType).toBe("institute_admin");
    expect(user.instituteName).toBe("Alpha School");
    expect(user.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("maps /me into AdmissionsUser for parents", () => {
    const user = admissionsUserFromMe(parentMe);
    expect(user.accountType).toBe("parent");
    expect(user.instituteId).toBeUndefined();
  });
});
