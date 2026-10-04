import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSupabaseAccessToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a token that appears after storage hydration", async () => {
    let calls = 0;
    const getSession = vi.fn(async () => {
      calls += 1;
      if (calls < 2) {
        return { data: { session: null }, error: null };
      }
      return {
        data: {
          session: {
            access_token: "hydrated-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
        error: null,
      };
    });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
        },
      }),
    }));

    const { getSupabaseAccessToken } = await import("./supabase-browser");
    vi.useFakeTimers();
    const pending = getSupabaseAccessToken();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe("hydrated-token");
    expect(getSession.mock.calls.length).toBeGreaterThan(1);
  });
});
