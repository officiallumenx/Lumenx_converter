import { describe, expect, it } from "vitest";
import {
  membershipDtoToListItem,
  membershipIdentityLabel,
  toggleRoleCode,
} from "./map";
import { collectMembershipCandidates } from "./membership-candidates";

describe("membershipIdentityLabel", () => {
  it("prefers display name, then email, then user id", () => {
    expect(
      membershipIdentityLabel({
        displayName: "Ada",
        email: "ada@school.edu",
        userId: "u1",
      }),
    ).toBe("Ada");
    expect(
      membershipIdentityLabel({
        displayName: null,
        email: "ada@school.edu",
        userId: "u1",
      }),
    ).toBe("ada@school.edu");
    expect(
      membershipIdentityLabel({
        displayName: null,
        email: null,
        userId: "u1",
      }),
    ).toBe("u1");
  });
});

describe("membershipDtoToListItem", () => {
  it("maps profile enrichment fields", () => {
    const item = membershipDtoToListItem({
      id: "m1",
      userId: "u1",
      instituteId: "i1",
      status: "active",
      roles: ["institute_admin", "teacher"],
      displayName: "Ada Lovelace",
      email: "ada@school.edu",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(item.identityLabel).toBe("Ada Lovelace");
    expect(item.rolesLabel).toBe("institute admin, teacher");
    expect(item.email).toBe("ada@school.edu");
  });
});

describe("toggleRoleCode", () => {
  it("adds and removes catalog codes without inventing values", () => {
    expect(toggleRoleCode(["teacher"], "institute_admin")).toEqual([
      "teacher",
      "institute_admin",
    ]);
    expect(toggleRoleCode(["teacher", "institute_admin"], "teacher")).toEqual([
      "institute_admin",
    ]);
  });
});

describe("collectMembershipCandidates", () => {
  it("only includes people with existing user_profile_id and excludes current members", () => {
    const rows = collectMembershipCandidates({
      teachers: [
        { userProfileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", displayName: "T1" },
        { userProfileId: null, displayName: "No link" },
      ],
      students: [
        {
          userProfileId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          displayName: "S1",
        },
        {
          userProfileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          displayName: "Same as teacher",
        },
      ],
      existingUserIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(rows[0]?.source).toBe("teacher");
  });
});
