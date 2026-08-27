import { describe, expect, it } from "vitest";
import { authUserFromMe } from "./me-bridge";
import type { MeResponse } from "@/lib/api/me-types";

const meFixture: MeResponse = {
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

describe("authUserFromMe", () => {
  it("maps /me into AuthUser with UUID ids", () => {
    const user = authUserFromMe(
      meFixture,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "Alpha School",
    );
    expect(user.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(user.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(user.instituteName).toBe("Alpha School");
    expect(user.role).toBe("principal");
    expect(user.email).toBe("principal@example.com");
    expect(user.isVerified).toBe(true);
  });
});
