import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";
import {
  findLoginOtpChallenge,
  hashLoginOtp,
  upsertLoginOtpChallenge,
  deleteLoginOtpChallenge,
  deleteExpiredLoginOtpChallenges,
  verifyLoginOtpChallenge,
  otpHashesEqual,
  LOGIN_OTP_MAX_VERIFY_ATTEMPTS,
} from "../src/domains/otp-delivery/challenge-repository.js";
import {
  storeParentLoginOtp,
  verifyStoredParentLoginOtp,
  PARENT_LOGIN_DEMO_OTP,
} from "../src/domains/parents/parent-otp.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARENT = "ba111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error", OTP_DELIVERY_MODE: "demo" });
});

afterEach(() => {
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("login OTP challenge repository (durable Step 2)", () => {
  it("atomically upserts by purpose+key and never stores plaintext OTP", async () => {
    const db = emptyMockDb();
    db.institute = [{ id: INST, deleted_at: null }];
    const { admin } = createMockSupabaseClients({ db, tokens: {} });

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: `${INST}:9876512345`,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "123456",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });

    expect(db.login_otp_challenge).toHaveLength(1);
    expect(JSON.stringify(db.login_otp_challenge[0])).not.toContain("123456");
    expect(db.login_otp_challenge[0]?.otp_hash).toBe(
      hashLoginOtp("parent_login", `${INST}:9876512345`, "123456"),
    );
    expect(db.login_otp_challenge[0]?.attempt_count).toBe(0);

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: `${INST}:9876512345`,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "654321",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });
    expect(db.login_otp_challenge).toHaveLength(1);
    expect(db.login_otp_challenge[0]?.otp_hash).toBe(
      hashLoginOtp("parent_login", `${INST}:9876512345`, "654321"),
    );
    expect(db.login_otp_challenge[0]?.attempt_count).toBe(0);

    await deleteLoginOtpChallenge(admin, "parent_login", `${INST}:9876512345`);
    expect(db.login_otp_challenge).toHaveLength(0);
  });

  it("shares durable state across separate admin clients (multi-instance)", async () => {
    const db = emptyMockDb();
    const a = createMockSupabaseClients({ db, tokens: {} });
    const b = createMockSupabaseClients({ db, tokens: {} });

    await storeParentLoginOtp(a.admin, {
      instituteId: INST,
      phone: "9876512345",
      parentId: PARENT,
    });
    expect(db.login_otp_challenge).toHaveLength(1);

    const verified = await verifyStoredParentLoginOtp(b.admin, {
      instituteId: INST,
      phone: "9876512345",
      otp: PARENT_LOGIN_DEMO_OTP,
    });
    expect(verified?.parentId).toBe(PARENT);
    expect(db.login_otp_challenge).toHaveLength(0);
  });

  it("deletes expired challenges", async () => {
    const db = emptyMockDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();

    await upsertLoginOtpChallenge(admin, {
      purpose: "staff_login",
      instituteId: INST,
      challengeKey: `${INST}:a@b.com`,
      channel: "email",
      destination: "a@b.com",
      subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      otp: "111111",
      expiresAt: past,
      lastSentAt: past,
    });
    await upsertLoginOtpChallenge(admin, {
      purpose: "staff_login",
      instituteId: INST,
      challengeKey: `${INST}:c@d.com`,
      channel: "email",
      destination: "c@d.com",
      subjectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      otp: "222222",
      expiresAt: future,
      lastSentAt: future,
    });

    const removed = await deleteExpiredLoginOtpChallenges(
      admin,
      new Date().toISOString(),
    );
    expect(removed).toBe(1);
    expect(db.login_otp_challenge).toHaveLength(1);
    expect(db.login_otp_challenge[0]?.challenge_key).toBe(`${INST}:c@d.com`);
  });

  it("burns challenge after max failed verify attempts", async () => {
    const db = emptyMockDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const key = `${INST}:9876512345`;

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: key,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "123456",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });

    for (let i = 0; i < LOGIN_OTP_MAX_VERIFY_ATTEMPTS - 1; i += 1) {
      const miss = await verifyLoginOtpChallenge(admin, {
        purpose: "parent_login",
        challengeKey: key,
        otp: "000000",
      });
      expect(miss).toBeNull();
      expect(db.login_otp_challenge).toHaveLength(1);
      expect(Number(db.login_otp_challenge[0]?.attempt_count)).toBe(i + 1);
    }

    const burned = await verifyLoginOtpChallenge(admin, {
      purpose: "parent_login",
      challengeKey: key,
      otp: "000000",
    });
    expect(burned).toBeNull();
    expect(db.login_otp_challenge).toHaveLength(0);

    // Even the correct OTP no longer works
    const afterBurn = await verifyLoginOtpChallenge(admin, {
      purpose: "parent_login",
      challengeKey: key,
      otp: "123456",
    });
    expect(afterBurn).toBeNull();
  });

  it("rejects expired challenge on verify and cleans the row", async () => {
    const db = emptyMockDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const key = `${INST}:9876512345`;

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: key,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "123456",
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      lastSentAt: new Date(Date.now() - 10_000).toISOString(),
    });

    const miss = await verifyLoginOtpChallenge(admin, {
      purpose: "parent_login",
      challengeKey: key,
      otp: "123456",
    });
    expect(miss).toBeNull();
    expect(db.login_otp_challenge).toHaveLength(0);
  });

  it("compares otp hashes in constant-time helper", () => {
    const a = hashLoginOtp("parent_login", "k", "123456");
    expect(otpHashesEqual(a, a)).toBe(true);
    expect(otpHashesEqual(a, hashLoginOtp("parent_login", "k", "000000"))).toBe(
      false,
    );
    expect(otpHashesEqual(a, "short")).toBe(false);
  });

  it("resets attempt_count when OTP is resent", async () => {
    const db = emptyMockDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const key = `${INST}:9876512345`;

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: key,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "123456",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });
    await verifyLoginOtpChallenge(admin, {
      purpose: "parent_login",
      challengeKey: key,
      otp: "000000",
    });
    expect(Number(db.login_otp_challenge[0]?.attempt_count)).toBe(1);

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: key,
      channel: "sms",
      destination: "9876512345",
      subjectId: PARENT,
      otp: "999999",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });
    expect(Number(db.login_otp_challenge[0]?.attempt_count)).toBe(0);
  });
});
