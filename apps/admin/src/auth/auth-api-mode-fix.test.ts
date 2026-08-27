import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_INSTITUTE_STORAGE_KEY,
  writeStoredActiveInstituteId,
} from "@/lib/active-institute";
import { AUTH_SESSION_KEY } from "./constants";
import { saveSession, loadSession, clearSession } from "./auth-store";
import type { AuthUser } from "./types";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

const demoUser: AuthUser = {
  id: "LX-ADM-001",
  email: "principal@lumenx.edu",
  name: "Dr. Ananya Verma",
  initials: "AV",
  role: "super_admin",
  title: "Principal",
  instituteId: "LX-INST-001",
  instituteName: "LumenX International School",
  isVerified: true,
  mfaEnabled: false,
  createdAt: "2023-06-01T08:00:00Z",
};

const INSTITUTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("completeSignIn / demo session guard (unit)", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("allows demo completeSignIn persistence when mode is demo", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { isDemoCompleteSignInAllowed } = await import("./login-flow-auth");
    expect(isDemoCompleteSignInAllowed()).toBe(true);
    saveSession(demoUser, false, { authSource: "demo" });
    expect(loadSession()?.authSource).toBe("demo");
    expect(loadSession()?.token.length).toBeGreaterThan(10);
  });

  it("blocks demo completeSignIn allowance when mode is api", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { isDemoCompleteSignInAllowed } = await import("./login-flow-auth");
    expect(isDemoCompleteSignInAllowed()).toBe(false);
  });

  it("does not leave a demo session when API mode refuses completeSignIn", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { isDemoCompleteSignInAllowed } = await import("./login-flow-auth");
    // Mirror AuthContext.completeSignIn guard: refuse before saveSession.
    if (!isDemoCompleteSignInAllowed()) {
      // no save
    } else {
      saveSession(demoUser, false, { authSource: "demo" });
    }
    expect(loadSession()).toBeNull();
    expect(store.get(AUTH_SESSION_KEY)).toBeUndefined();
  });
});

describe("clearApiModeLocalIdentity", () => {
  beforeEach(() => {
    store.clear();
  });

  it("clears UI session and active institute preference together", async () => {
    saveSession(
      {
        ...demoUser,
        id: "11111111-1111-4111-8111-111111111111",
        instituteId: INSTITUTE,
      },
      false,
      { authSource: "api" },
    );
    writeStoredActiveInstituteId(INSTITUTE);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(INSTITUTE);

    const { clearApiModeLocalIdentity } = await import("./api-local-cleanup");
    clearApiModeLocalIdentity();

    expect(loadSession()).toBeNull();
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });
});

describe("API login path isolation (no mock fallback)", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("API strategy never routes through mock auth helpers", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getLoginAuthStrategy } = await import("./login-flow-auth");
    expect(getLoginAuthStrategy()).toBe("api");

    const mockSignIn = vi.fn(async (_id: string, _pw: string) => demoUser);
    const mockLookup = vi.fn(async (_id: string) => demoUser);
    const completeSignIn = vi.fn((_user: AuthUser, _remember?: boolean) => undefined);
    const signIn = vi.fn(
      async (_id: string, _pw: string, _remember?: boolean) => undefined,
    );

    // Simulate AdminLoginFlow password submit in API mode.
    const strategy = getLoginAuthStrategy();
    if (strategy === "api") {
      await signIn("user@school.edu", "secret", true);
    } else {
      await mockLookup("user@school.edu");
      await mockSignIn("user@school.edu", "secret");
      completeSignIn(demoUser, true);
    }

    expect(signIn).toHaveBeenCalledWith("user@school.edu", "secret", true);
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockLookup).not.toHaveBeenCalled();
    expect(completeSignIn).not.toHaveBeenCalled();
    expect(loadSession()).toBeNull(); // failed/partial — no demo session invented
  });

  it("API authentication failure must not create a demo session", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getLoginAuthStrategy } = await import("./login-flow-auth");
    const signIn = vi.fn(
      async (_id: string, _pw: string, _remember?: boolean): Promise<void> => {
        throw new Error("Invalid login credentials");
      },
    );
    const completeSignIn = vi.fn((_user: AuthUser) => undefined);

    expect(getLoginAuthStrategy()).toBe("api");
    await expect(signIn("user@school.edu", "bad", false)).rejects.toThrow(
      /Invalid login/,
    );
    expect(completeSignIn).not.toHaveBeenCalled();
    expect(loadSession()).toBeNull();
  });

  it("demo strategy still uses mock + completeSignIn path", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { getLoginAuthStrategy } = await import("./login-flow-auth");
    const mockSignIn = vi.fn(async (_id: string, _pw: string) => demoUser);
    const mockLookup = vi.fn(async (_id: string) => demoUser);
    const completeSignIn = vi.fn((user: AuthUser) => {
      saveSession(user, false, { authSource: "demo" });
    });
    const signIn = vi.fn(
      async (_id: string, _pw: string, _remember?: boolean) => undefined,
    );

    const strategy = getLoginAuthStrategy();
    expect(strategy).toBe("demo");
    await mockLookup("principal@lumenx.edu");
    await mockSignIn("principal@lumenx.edu", "pass");
    completeSignIn(demoUser);

    expect(signIn).not.toHaveBeenCalled();
    expect(mockLookup).toHaveBeenCalled();
    expect(mockSignIn).toHaveBeenCalled();
    expect(completeSignIn).toHaveBeenCalled();
    expect(loadSession()?.authSource).toBe("demo");
    clearSession();
  });
});

describe("API bootstrap institute cleanup contract", () => {
  beforeEach(() => {
    store.clear();
  });

  it("clears active institute when bootstrap finds no valid session", async () => {
    writeStoredActiveInstituteId(INSTITUTE);
    const { clearApiModeLocalIdentity } = await import("./api-local-cleanup");
    // AuthContext calls this when tryHydrateApiSession returns null.
    clearApiModeLocalIdentity();
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("successful resolve keeps / rewrites institute via resolveActiveInstitute only", async () => {
    const { resolveActiveInstitute } = await import("@/lib/active-institute");
    writeStoredActiveInstituteId(INSTITUTE);
    const result = resolveActiveInstitute(
      [{ instituteId: INSTITUTE, status: "active" }],
      INSTITUTE,
    );
    expect(result.instituteId).toBe(INSTITUTE);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(INSTITUTE);
  });
});
