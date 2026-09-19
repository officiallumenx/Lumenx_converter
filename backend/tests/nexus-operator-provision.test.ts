import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "../src/auth/types.js";

const repo = vi.hoisted(() => ({
  findOperatorByHandle: vi.fn(),
  insertOperator: vi.fn(),
}));

vi.mock("../src/domains/nexus/repository.js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  findOperatorByHandle: repo.findOperatorByHandle,
  insertOperator: repo.insertOperator,
}));

import { provisionOperatorForActor } from "../src/domains/nexus/service.js";

const rootActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  platformRoleCode: "nexus_root",
  isPlatformOperator: true,
  memberships: [],
} as Actor;
const operationsActor = {
  ...rootActor,
  platformRoleCode: "operations",
} as Actor;

function input() {
  return {
    email: "New.Operator@example.com",
    phone: "9876543210",
    temporaryPassword: "TempPass@123",
    roleCode: "support",
    handle: "support.new",
    displayName: "New Operator",
  };
}

function harness(options?: { firebaseCreateError?: Error }) {
  const deleteSupabase = vi.fn().mockResolvedValue({ error: null });
  const createSupabase = vi.fn().mockResolvedValue({
    data: { user: { id: "22222222-2222-4222-8222-222222222222" } },
    error: null,
  });
  const profileInsert = vi.fn().mockResolvedValue({ error: null });
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: profileInsert,
  };
  const admin = {
    from: vi.fn().mockReturnValue(profileQuery),
    auth: { admin: { createUser: createSupabase, deleteUser: deleteSupabase } },
  };
  const deleteFirebase = vi.fn().mockResolvedValue(undefined);
  const firebase = {
    getUserByEmail: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
    getUserByPhoneNumber: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
    createUser: options?.firebaseCreateError
      ? vi.fn().mockRejectedValue(options.firebaseCreateError)
      : vi.fn().mockResolvedValue({ uid: "22222222-2222-4222-8222-222222222222" }),
    deleteUser: deleteFirebase,
  };
  return { admin, firebase, createSupabase, deleteSupabase, deleteFirebase };
}

describe("Nexus operator provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.findOperatorByHandle.mockResolvedValue(null);
    repo.insertOperator.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      user_id: "22222222-2222-4222-8222-222222222222",
      role_code: "support",
      handle: "support.new",
      display_name: "New Operator",
      status: "invited",
      created_at: "2026-09-08T00:00:00.000Z",
      updated_at: "2026-09-08T00:00:00.000Z",
      deleted_at: null,
    });
  });

  it("rejects lower roles before any identity mutation", async () => {
    const h = harness();
    await expect(
      provisionOperatorForActor(h.admin as never, h.firebase as never, operationsActor, input()),
    ).rejects.toThrow();
    expect(h.createSupabase).not.toHaveBeenCalled();
    expect(h.firebase.createUser).not.toHaveBeenCalled();
  });

  it("returns first-login workflow after creating linked identities", async () => {
    const h = harness();
    const result = await provisionOperatorForActor(
      h.admin as never,
      h.firebase as never,
      rootActor,
      input(),
    );
    expect(result.operator.status).toBe("invited");
    expect(result.credentials).toMatchObject({
      email: "new.operator@example.com",
      phone: expect.any(String),
      username: "support.new",
      firstLoginPending: true,
      requiresEmailOtp: true,
      requiresMobileOtp: true,
      requiresPasswordAndPin: true,
      pinSet: false,
    });
    expect(h.firebase.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "22222222-2222-4222-8222-222222222222",
        phoneNumber: "+919876543210",
      }),
    );
  });

  it("compensates Supabase auth when Firebase creation fails", async () => {
    const h = harness({ firebaseCreateError: new Error("firebase unavailable") });
    await expect(
      provisionOperatorForActor(h.admin as never, h.firebase as never, rootActor, input()),
    ).rejects.toThrow("firebase unavailable");
    expect(h.deleteSupabase).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(repo.insertOperator).not.toHaveBeenCalled();
  });
});
