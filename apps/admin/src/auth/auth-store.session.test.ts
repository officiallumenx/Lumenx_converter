import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSession, loadSession, clearSession, sessionToUser } from "./auth-store";
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
  instituteId: "ins-test1school",
  instituteName: "Test1School",
  isVerified: true,
  mfaEnabled: false,
  createdAt: "2023-06-01T08:00:00Z",
};

describe("demo session regression", () => {
  beforeEach(() => {
    store.clear();
  });

  it("persists demo sessions with mock token and authSource demo", () => {
    const session = saveSession(demoUser, false, { authSource: "demo" });
    expect(session.authSource).toBe("demo");
    expect(session.token.length).toBeGreaterThan(10);
    expect(session.token.split(".")).toHaveLength(3);

    const loaded = loadSession();
    expect(loaded?.userId).toBe("LX-ADM-001");
    expect(sessionToUser(loaded!).email).toBe("principal@lumenx.edu");
  });

  it("stores api sessions without embedding a JWT", () => {
    const apiUser: AuthUser = {
      ...demoUser,
      id: "11111111-1111-4111-8111-111111111111",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };
    const session = saveSession(apiUser, true, { authSource: "api" });
    expect(session.authSource).toBe("api");
    expect(session.token).toBe("");
  });

  it("clearSession removes demo identity", () => {
    saveSession(demoUser, false, { authSource: "demo" });
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
