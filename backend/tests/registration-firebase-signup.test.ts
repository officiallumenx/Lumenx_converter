import { describe, expect, it, vi } from "vitest";
import type { Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";
import {
  completeFirebasePhoneSignup,
  verifyFirebasePhoneSignup,
} from "../src/domains/registrations/firebase-signup.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

const NOW = 2_000_000_000;

function decoded(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    uid: "firebase-phone-uid",
    sub: "firebase-phone-uid",
    aud: "test",
    auth_time: NOW - 30,
    exp: NOW + 3_000,
    firebase: {
      identities: { phone: ["+919876543210"] },
      sign_in_provider: "phone",
    },
    iat: NOW - 30,
    iss: "https://securetoken.google.com/test",
    phone_number: "+919876543210",
    ...overrides,
  };
}

function fakeAuth(
  token: DecodedIdToken,
  emailOwner: { uid: string } | null = null,
) {
  const verifyIdToken = vi.fn().mockResolvedValue(token);
  const getUserByEmail = emailOwner
    ? vi.fn().mockResolvedValue(emailOwner as UserRecord)
    : vi.fn().mockRejectedValue(
        Object.assign(new Error("not found"), { code: "auth/user-not-found" }),
      );
  return {
    auth: { verifyIdToken, getUserByEmail } as unknown as Auth,
    verifyIdToken,
  };
}

describe("Firebase-backed Admin registration", () => {
  it("accepts a fresh phone token matching the normalized submitted phone", async () => {
    const { auth, verifyIdToken } = fakeAuth(decoded());

    await expect(
      verifyFirebasePhoneSignup(auth, {
        idToken: "verified-token",
        phone: "98765 43210",
        email: "ADMIN@School.edu",
        nowSeconds: NOW,
      }),
    ).resolves.toEqual({ firebaseUid: "firebase-phone-uid" });
    expect(verifyIdToken).toHaveBeenCalledWith("verified-token", true);
  });

  it("rejects a verified token for a different phone", async () => {
    const { auth } = fakeAuth(decoded({ phone_number: "+919999999999" }));
    await expect(
      verifyFirebasePhoneSignup(auth, {
        idToken: "verified-token",
        phone: "+91 98765 43210",
        email: "admin@school.edu",
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("rejects a stale phone-auth token", async () => {
    const { auth } = fakeAuth(decoded({ auth_time: NOW - 301 }));
    await expect(
      verifyFirebasePhoneSignup(auth, {
        idToken: "stale-token",
        phone: "+919876543210",
        email: "admin@school.edu",
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("does not overwrite an unrelated Firebase email owner", async () => {
    const { auth } = fakeAuth(decoded(), { uid: "unrelated-firebase-uid" });
    await expect(
      verifyFirebasePhoneSignup(auth, {
        idToken: "verified-token",
        phone: "+919876543210",
        email: "taken@school.edu",
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  });

  it("updates and links the verified phone UID instead of creating another UID", async () => {
    const db = emptyMockDb();
    db.user_profile.push({
      id: "lumenx-profile-id",
      display_name: "Admin",
      email: "admin@school.edu",
      phone: "+919876543210",
      status: "active",
      firebase_uid: null,
      firebase_linked_at: null,
      deleted_at: null,
    });
    const admin = createMockSupabaseClients({ tokens: {}, db }).admin;
    const updateUser = vi.fn().mockResolvedValue({ uid: "firebase-phone-uid" });
    const auth = { updateUser } as unknown as Auth;

    await completeFirebasePhoneSignup(admin, auth, {
      firebaseUid: "firebase-phone-uid",
      applicantUserId: "lumenx-profile-id",
      applicantName: "Admin User",
      email: "ADMIN@School.edu",
      password: "SecurePass1!",
    });

    expect(updateUser).toHaveBeenCalledWith(
      "firebase-phone-uid",
      expect.objectContaining({
        email: "admin@school.edu",
        password: "SecurePass1!",
        displayName: "Admin User",
      }),
    );
    expect(db.user_profile[0]?.firebase_uid).toBe("firebase-phone-uid");
  });
});
