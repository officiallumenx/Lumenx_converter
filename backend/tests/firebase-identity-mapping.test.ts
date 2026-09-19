/**
 * Phase 2 — Firebase UID ↔ existing LumenX user_profile mapping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AppError } from "../src/errors/app-error.js";
import { firebaseIdentityFromDecodedToken } from "../src/auth/firebase-identity.js";
import {
  findLumenXUserFromFirebaseUid,
  linkFirebaseIdentityToExistingUser,
  resolveActorFromFirebaseIdentity,
  resolveLumenXUserFromFirebaseIdentity,
} from "../src/domains/firebase-identity/service.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_NEW = "33333333-3333-4333-8333-333333333333";
const MEM_A = "mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm";
const MEM_B = "nnnnnnnn-nnnn-4nnn-8nnn-nnnnnnnnnnnn";
const FB_UID_A = "firebase-uid-user-a";
const FB_UID_B = "firebase-uid-user-b";
const FB_UID_NEW = "firebase-uid-new";

beforeEach(() => {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function decoded(
  overrides: Partial<DecodedIdToken> & { uid: string },
): DecodedIdToken {
  return {
    aud: "test-project",
    auth_time: 1_700_000_000,
    exp: 1_700_003_600,
    iat: 1_700_000_000,
    iss: "https://securetoken.google.com/test-project",
    sub: overrides.uid,
    firebase: { identities: {}, sign_in_provider: "custom" },
    ...overrides,
  } as DecodedIdToken;
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "SCHOOL-A",
      name: "School A",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "SCHOOL-B",
      name: "School B",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.user_profile = [
    {
      id: USER_A,
      display_name: "Alice Admin",
      email: "alice@school-a.edu",
      phone: "9876500001",
      avatar_url: null,
      status: "active",
      firebase_uid: FB_UID_A,
      firebase_linked_at: "2026-09-01T00:00:00Z",
      phone_verified_at: "2026-09-01T00:00:00Z",
      email_verified_at: "2026-09-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: USER_B,
      display_name: "Bob Teacher",
      email: "bob@school-b.edu",
      phone: "9876500002",
      avatar_url: null,
      status: "active",
      firebase_uid: null,
      firebase_linked_at: null,
      phone_verified_at: null,
      email_verified_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEM_A,
      user_id: USER_A,
      institute_id: INST_A,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: MEM_B,
      user_id: USER_B,
      institute_id: INST_B,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    {
      membership_id: MEM_A,
      role_code: "institute_admin",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      membership_id: MEM_B,
      role_code: "teacher",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  return db;
}

function adminOf(db: MockDb) {
  return createMockSupabaseClients({ tokens: {}, db }).admin;
}

describe("Existing user mapping", () => {
  it("finds LumenX user by firebase_uid", async () => {
    const admin = adminOf(baseDb());
    const mapping = await findLumenXUserFromFirebaseUid(admin, FB_UID_A);
    expect(mapping?.userProfileId).toBe(USER_A);
    expect(mapping?.source).toBe("firebase_uid");
  });

  it("resolves actor with preserved membership and roles", async () => {
    const admin = adminOf(baseDb());
    const identity = firebaseIdentityFromDecodedToken(
      decoded({ uid: FB_UID_A, email: "alice@school-a.edu", email_verified: true }),
    );
    const { mapping, actor } = await resolveActorFromFirebaseIdentity(
      admin,
      identity,
    );
    expect(mapping.userProfileId).toBe(USER_A);
    expect(actor.memberships).toHaveLength(1);
    expect(actor.memberships[0]?.instituteId).toBe(INST_A);
    expect(actor.memberships[0]?.roles).toContain("institute_admin");
  });
});

describe("New user mapping", () => {
  it("links Firebase UID onto a newly provisioned LumenX profile (no duplicate person)", async () => {
    const db = baseDb();
    db.user_profile.push({
      id: USER_NEW,
      display_name: "New Hire",
      email: "new@school-a.edu",
      phone: null,
      avatar_url: null,
      status: "active",
      firebase_uid: null,
      firebase_linked_at: null,
      phone_verified_at: null,
      email_verified_at: null,
      created_at: "2026-09-07T00:00:00Z",
      updated_at: "2026-09-07T00:00:00Z",
      deleted_at: null,
    });
    db.membership.push({
      id: "oooooooo-oooo-4ooo-8ooo-oooooooooooo",
      user_id: USER_NEW,
      institute_id: INST_A,
      status: "active",
      created_at: "2026-09-07T00:00:00Z",
      updated_at: "2026-09-07T00:00:00Z",
      deleted_at: null,
    });
    db.membership_role.push({
      membership_id: "oooooooo-oooo-4ooo-8ooo-oooooooooooo",
      role_code: "staff",
      created_at: "2026-09-07T00:00:00Z",
    });

    const admin = adminOf(db);
    const linked = await linkFirebaseIdentityToExistingUser(admin, {
      userProfileId: USER_NEW,
      firebaseUid: FB_UID_NEW,
    });
    expect(linked.source).toBe("linked_now");
    expect(linked.userProfileId).toBe(USER_NEW);

    const profile = db.user_profile.find((p) => p.id === USER_NEW);
    expect(profile?.firebase_uid).toBe(FB_UID_NEW);
    expect(db.user_profile.filter((p) => p.firebase_uid === FB_UID_NEW)).toHaveLength(
      1,
    );

    const { actor } = await resolveActorFromFirebaseIdentity(
      admin,
      firebaseIdentityFromDecodedToken(decoded({ uid: FB_UID_NEW })),
    );
    expect(actor.memberships[0]?.roles).toContain("staff");
  });

  it("auto-links unique verified email candidate", async () => {
    const admin = adminOf(baseDb());
    const identity = firebaseIdentityFromDecodedToken(
      decoded({
        uid: FB_UID_B,
        email: "bob@school-b.edu",
        email_verified: true,
      }),
    );
    const mapping = await resolveLumenXUserFromFirebaseIdentity(admin, identity, {
      allowCandidateLookup: true,
      autoLink: true,
    });
    expect(mapping.userProfileId).toBe(USER_B);
    expect(mapping.source).toBe("linked_now");
  });
});

describe("Duplicate Firebase UID", () => {
  it("rejects linking a UID already bound to another profile", async () => {
    const admin = adminOf(baseDb());
    await expect(
      linkFirebaseIdentityToExistingUser(admin, {
        userProfileId: USER_B,
        firebaseUid: FB_UID_A,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/already linked to another/i),
    });
  });

  it("rejects linking a second Firebase UID onto an already-linked profile", async () => {
    const admin = adminOf(baseDb());
    await expect(
      linkFirebaseIdentityToExistingUser(admin, {
        userProfileId: USER_A,
        firebaseUid: FB_UID_B,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/already linked to a different Firebase/i),
    });
  });

  it("is idempotent when re-linking the same UID", async () => {
    const admin = adminOf(baseDb());
    const mapping = await linkFirebaseIdentityToExistingUser(admin, {
      userProfileId: USER_A,
      firebaseUid: FB_UID_A,
    });
    expect(mapping.userProfileId).toBe(USER_A);
    expect(mapping.source).toBe("firebase_uid");
  });
});

describe("Unknown Firebase user", () => {
  it("returns null from find and 404 from resolve", async () => {
    const admin = adminOf(baseDb());
    expect(await findLumenXUserFromFirebaseUid(admin, "unknown-uid")).toBeNull();

    const identity = firebaseIdentityFromDecodedToken(
      decoded({ uid: "unknown-uid", email: "nobody@example.com", email_verified: true }),
    );
    await expect(
      resolveLumenXUserFromFirebaseIdentity(admin, identity),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("Wrong institute / missing membership / tenant isolation", () => {
  it("rejects when required institute has no membership (wrong institute)", async () => {
    const admin = adminOf(baseDb());
    const identity = firebaseIdentityFromDecodedToken(decoded({ uid: FB_UID_A }));
    await expect(
      resolveActorFromFirebaseIdentity(admin, identity, {
        requiredInstituteId: INST_B,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringMatching(/No active membership/i),
    });
  });

  it("rejects user with no memberships for a required institute", async () => {
    const db = baseDb();
    db.user_profile.push({
      id: USER_NEW,
      display_name: "Orphan",
      email: "orphan@example.com",
      phone: null,
      avatar_url: null,
      status: "active",
      firebase_uid: "firebase-orphan",
      firebase_linked_at: "2026-09-07T00:00:00Z",
      phone_verified_at: null,
      email_verified_at: null,
      created_at: "2026-09-07T00:00:00Z",
      updated_at: "2026-09-07T00:00:00Z",
      deleted_at: null,
    });
    const admin = adminOf(db);
    await expect(
      resolveActorFromFirebaseIdentity(
        admin,
        firebaseIdentityFromDecodedToken(decoded({ uid: "firebase-orphan" })),
        { requiredInstituteId: INST_A },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not leak School B memberships when resolving School A user", async () => {
    const admin = adminOf(baseDb());
    const { actor } = await resolveActorFromFirebaseIdentity(
      admin,
      firebaseIdentityFromDecodedToken(decoded({ uid: FB_UID_A })),
      { requiredInstituteId: INST_A },
    );
    expect(actor.memberships.every((m) => m.instituteId === INST_A)).toBe(true);
    expect(actor.memberships.some((m) => m.instituteId === INST_B)).toBe(false);
  });
});

describe("Role preservation", () => {
  it("keeps membership_role codes unchanged after link", async () => {
    const db = baseDb();
    const admin = adminOf(db);
    await linkFirebaseIdentityToExistingUser(admin, {
      userProfileId: USER_B,
      firebaseUid: FB_UID_B,
    });
    const rolesBefore = db.membership_role.map((r) => ({ ...r }));
    const { actor } = await resolveActorFromFirebaseIdentity(
      admin,
      firebaseIdentityFromDecodedToken(decoded({ uid: FB_UID_B })),
    );
    expect(actor.memberships[0]?.roles).toEqual(["teacher"]);
    expect(db.membership_role).toEqual(rolesBefore);
  });
});

describe("Ambiguous identity mapping", () => {
  it("rejects when multiple profiles share the same phone digits", async () => {
    const db = baseDb();
    db.user_profile[1]!.phone = "9876500001";
    db.user_profile[1]!.firebase_uid = null;
    const admin = adminOf(db);
    const identity = firebaseIdentityFromDecodedToken(
      decoded({
        uid: "firebase-ambiguous",
        phone_number: "+919876500001",
      }),
    );
    await expect(
      resolveLumenXUserFromFirebaseIdentity(admin, identity, {
        allowCandidateLookup: true,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/Ambiguous.*phone/i),
    });
  });
});

describe("AppError surface", () => {
  it("uses typed AppError codes for security-sensitive failures", () => {
    const err = AppError.conflict("dup");
    expect(err.status).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});
