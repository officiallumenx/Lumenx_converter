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
} from "../src/domains/otp-delivery/challenge-repository.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  resetEnvCache();
  loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
});

afterEach(() => {
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("login OTP challenge repository", () => {
  it("upserts by purpose+key and verifies hash", async () => {
    const db = emptyMockDb();
    db.institute = [{ id: INST, deleted_at: null }];
    const { admin } = createMockSupabaseClients({ db, tokens: {} });

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: `${INST}:9876512345`,
      channel: "sms",
      destination: "9876512345",
      subjectId: "ba111111-1111-4111-8111-111111111111",
      otp: "123456",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });

    expect(db.login_otp_challenge).toHaveLength(1);
    const row = await findLoginOtpChallenge(
      admin,
      "parent_login",
      `${INST}:9876512345`,
    );
    expect(row?.otp_hash).toBe(
      hashLoginOtp("parent_login", `${INST}:9876512345`, "123456"),
    );

    await upsertLoginOtpChallenge(admin, {
      purpose: "parent_login",
      instituteId: INST,
      challengeKey: `${INST}:9876512345`,
      channel: "sms",
      destination: "9876512345",
      subjectId: "ba111111-1111-4111-8111-111111111111",
      otp: "654321",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastSentAt: new Date().toISOString(),
    });
    expect(db.login_otp_challenge).toHaveLength(1);
    expect(db.login_otp_challenge[0]?.otp_hash).toBe(
      hashLoginOtp("parent_login", `${INST}:9876512345`, "654321"),
    );

    await deleteLoginOtpChallenge(admin, "parent_login", `${INST}:9876512345`);
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

    await deleteExpiredLoginOtpChallenges(admin, new Date().toISOString());
    expect(db.login_otp_challenge).toHaveLength(1);
    expect(db.login_otp_challenge[0]?.challenge_key).toBe(`${INST}:c@d.com`);
  });
});
