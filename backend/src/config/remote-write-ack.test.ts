import { describe, expect, it } from "vitest";
import {
  REMOTE_WRITE_ACK_PHRASE,
  assertRemoteWriteAck,
  looksLikeHostedSupabaseUrl,
} from "../../scripts/assert-remote-write-ack.mjs";

describe("assertRemoteWriteAck", () => {
  it("detects hosted supabase hosts", () => {
    expect(looksLikeHostedSupabaseUrl("https://abcd.supabase.co")).toBe(true);
    expect(looksLikeHostedSupabaseUrl("http://127.0.0.1:54321")).toBe(false);
  });

  it("allows local / non-hosted URLs without ack", () => {
    expect(() =>
      assertRemoteWriteAck({
        SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).not.toThrow();
  });

  it("skips when LUMENX_ENV=staging (staging guard owns confirmation)", () => {
    expect(() =>
      assertRemoteWriteAck({
        LUMENX_ENV: "staging",
        SUPABASE_URL: "https://abcd1234567890abcd.supabase.co",
      }),
    ).not.toThrow();
  });

  it("refuses hosted writes without ack + matching project ref", () => {
    expect(() =>
      assertRemoteWriteAck({
        SUPABASE_URL: "https://abcd1234567890abcd.supabase.co",
      }),
    ).toThrow(/ALLOW_REMOTE_DB_WRITES/);
  });

  it("accepts hosted writes with matching ack", () => {
    const ref = "abcd1234567890abcd";
    expect(() =>
      assertRemoteWriteAck({
        SUPABASE_URL: `https://${ref}.supabase.co`,
        ALLOW_REMOTE_DB_WRITES: REMOTE_WRITE_ACK_PHRASE,
        REMOTE_WRITE_PROJECT_REF: ref,
      }),
    ).not.toThrow();
  });

  it("rejects mismatched REMOTE_WRITE_PROJECT_REF", () => {
    expect(() =>
      assertRemoteWriteAck({
        SUPABASE_URL: "https://abcd1234567890abcd.supabase.co",
        ALLOW_REMOTE_DB_WRITES: REMOTE_WRITE_ACK_PHRASE,
        REMOTE_WRITE_PROJECT_REF: "otherref1234567890ab",
      }),
    ).toThrow(/does not match/);
  });
});
