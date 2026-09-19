import { describe, expect, it, vi } from "vitest";
import type { Auth, UserRecord } from "firebase-admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureOwnedFirebaseIdentity } from "../src/domains/auth-credentials/app-signup.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

const USER_ID = "44444444-4444-4444-8444-444444444444";

describe("backend-owned Firebase signup identity", () => {
  it("never overwrites an unrelated Firebase password merely by email", async () => {
    const updateUser = vi.fn();
    const auth = {
      getUser: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
      getUserByEmail: vi.fn().mockResolvedValue({
        uid: "unrelated-firebase-uid",
        email: "person@example.com",
      }),
      updateUser,
      createUser: vi.fn(),
    } as unknown as Auth;

    await expect(ensureOwnedFirebaseIdentity(
      {} as SupabaseClient,
      auth,
      USER_ID,
      {
        email: "person@example.com",
        password: "NewPassword123!",
        displayName: "Person",
      },
    )).rejects.toMatchObject({ status: 409 });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recovers a Firebase user created by an interrupted prior attempt", async () => {
    const db = emptyMockDb();
    db.user_profile.push({
      id: USER_ID,
      display_name: "Person",
      email: "person@example.com",
      phone: null,
      status: "active",
      firebase_uid: null,
      firebase_linked_at: null,
      deleted_at: null,
    });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const recovered = {
      uid: USER_ID,
      email: "person@example.com",
    } as UserRecord;
    const auth = {
      getUser: vi.fn().mockResolvedValue(recovered),
      getUserByEmail: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(recovered),
      createUser: vi.fn(),
    } as unknown as Auth;

    const uid = await ensureOwnedFirebaseIdentity(
      clients.admin,
      auth,
      USER_ID,
      {
        email: "person@example.com",
        password: "NewPassword123!",
        displayName: "Person",
      },
    );
    expect(uid).toBe(USER_ID);
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(db.user_profile[0]?.firebase_uid).toBe(USER_ID);
  });
});
