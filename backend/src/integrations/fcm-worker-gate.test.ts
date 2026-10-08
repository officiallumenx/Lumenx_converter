import { describe, expect, it } from "vitest";
import {
  looksLikeHostedSupabaseUrl,
  shouldStartFcmWorker,
} from "./fcm-worker-gate.js";
import type { Env } from "../config/env.js";

function env(partial: Partial<Env>): Env {
  return partial as Env;
}

describe("fcm-worker-gate", () => {
  it("detects hosted Supabase URLs", () => {
    expect(
      looksLikeHostedSupabaseUrl("https://abcd.supabase.co"),
    ).toBe(true);
    expect(looksLikeHostedSupabaseUrl("http://127.0.0.1:54321")).toBe(false);
  });

  it("blocks non-production worker against hosted Supabase by default", () => {
    const gate = shouldStartFcmWorker(
      env({
        NODE_ENV: "development",
        FCM_WORKER_ENABLED: true,
        FCM_ALLOW_PROD_OUTBOX: false,
        SUPABASE_URL: "https://xyz.supabase.co",
      }),
    );
    expect(gate.start).toBe(false);
    expect(gate.reason).toMatch(/refused/i);
  });

  it("allows production Railway worker when enabled", () => {
    const gate = shouldStartFcmWorker(
      env({
        NODE_ENV: "production",
        FCM_WORKER_ENABLED: true,
        SUPABASE_URL: "https://xyz.supabase.co",
      }),
    );
    expect(gate.start).toBe(true);
  });

  it("allows explicit escape hatch", () => {
    const gate = shouldStartFcmWorker(
      env({
        NODE_ENV: "development",
        FCM_WORKER_ENABLED: true,
        FCM_ALLOW_PROD_OUTBOX: true,
        SUPABASE_URL: "https://xyz.supabase.co",
      }),
    );
    expect(gate.start).toBe(true);
  });
});
