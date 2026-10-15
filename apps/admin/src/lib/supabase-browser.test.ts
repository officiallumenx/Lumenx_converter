import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("localStorage", memoryStorage);
  vi.stubGlobal("window", { localStorage: memoryStorage });
}

describe("getSupabaseAccessToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VITE_E2E_SAFE_AUTH", "");
    installMemoryLocalStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns a token that appears after storage hydration", async () => {
    localStorage.setItem(
      "lumenx.admin.supabase.auth.v1",
      JSON.stringify({ refresh_token: "refresh-1" }),
    );
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

  it("reads seeded localStorage token when VITE_E2E_SAFE_AUTH is enabled", async () => {
    vi.stubEnv("VITE_E2E_SAFE_AUTH", "1");
    localStorage.setItem(
      "lumenx.admin.supabase.auth.v1",
      JSON.stringify({
        access_token: "e2e-safe-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const getSession = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
        },
      }),
    }));

    const { getSupabaseAccessToken } = await import("./supabase-browser");
    await expect(getSupabaseAccessToken()).resolves.toBe("e2e-safe-token");
    expect(getSession).not.toHaveBeenCalled();
  });

  it("returns null without calling Supabase when VITE_E2E_SAFE_AUTH has no seed", async () => {
    vi.stubEnv("VITE_E2E_SAFE_AUTH", "1");
    const getSession = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
        },
      }),
    }));

    const { getSupabaseAccessToken } = await import("./supabase-browser");
    await expect(getSupabaseAccessToken()).resolves.toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("skips hosted refresh when localStorage has no refresh token", async () => {
    const refreshSession = vi.fn();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        auth: {
          getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
          refreshSession,
        },
      }),
    }));

    const { tryRefreshSupabaseSession } = await import("./supabase-browser");
    await expect(tryRefreshSupabaseSession()).resolves.toBe(false);
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
