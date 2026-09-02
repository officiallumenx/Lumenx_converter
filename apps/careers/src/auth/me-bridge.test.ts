import { describe, expect, it } from "vitest";
import type { MeResponse } from "@/lib/api/me-types";
import {
  careersUserFromMe,
  pickRecruiterMembership,
  resolveCareersAccountType,
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

const jobSeekerMe: MeResponse = {
  ...principalMe,
  institutes: [],
};

describe("pickRecruiterMembership", () => {
  it("returns active institute membership with recruiter role", () => {
    const m = pickRecruiterMembership(principalMe.institutes);
    expect(m?.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("prefers preferred institute when eligible", () => {
    const institutes = [
      ...principalMe.institutes,
      {
        instituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        membershipId: "m2",
        status: "active" as const,
        roles: ["teacher" as const],
      },
    ];
    const m = pickRecruiterMembership(
      institutes,
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(m?.instituteId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });
});

describe("resolveCareersAccountType", () => {
  it("maps institute staff to recruiter", () => {
    expect(resolveCareersAccountType(principalMe)).toBe("recruiter");
  });

  it("maps users without institute membership to job_seeker", () => {
    expect(resolveCareersAccountType(jobSeekerMe)).toBe("job_seeker");
  });

  it("honors forceAccountType override", () => {
    expect(
      resolveCareersAccountType(jobSeekerMe, { forceAccountType: "recruiter" }),
    ).toBe("recruiter");
  });
});

describe("careersUserFromMe", () => {
  it("maps /me into CareersUser for recruiters", () => {
    const user = careersUserFromMe(principalMe, {
      instituteName: "Alpha School",
      preferredInstituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(user.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(user.accountType).toBe("recruiter");
    expect(user.authSource).toBe("api");
    expect(user.organizationName).toBe("Alpha School");
    expect(user.activeInstituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(user.emailVerified).toBe(true);
  });

  it("maps /me into CareersUser for job seekers", () => {
    const user = careersUserFromMe(jobSeekerMe);
    expect(user.accountType).toBe("job_seeker");
    expect(user.organizationId).toBeUndefined();
  });
});
