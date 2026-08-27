import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_INSTITUTE_STORAGE_KEY,
  writeStoredActiveInstituteId,
} from "@/lib/active-institute";
import { saveSession, loadSession, clearSession } from "@/auth/auth-store";
import type { AuthUser } from "@/auth/types";

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

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const apiUser: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@school.edu",
  name: "Admin",
  initials: "AD",
  role: "principal",
  title: "principal",
  instituteId: "",
  instituteName: "",
  isVerified: true,
  mfaEnabled: false,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("checkApplyApiActiveInstitute / tryApply", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("rejects invalid UUID without mutating session", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const {
      checkApplyApiActiveInstitute,
      tryApplyApiActiveInstituteSession,
    } = await import("./api-active-institute");
    writeStoredActiveInstituteId(A);
    saveSession(apiUser, false, { authSource: "api" });

    expect(checkApplyApiActiveInstitute("LX-INST-001", "Forged")).toEqual({
      ok: false,
      reason: "invalid_uuid",
    });
    expect(tryApplyApiActiveInstituteSession("LX-INST-001", "Forged")).toBeNull();
    expect(loadSession()?.instituteId).toBe("");
  });

  it("rejects arbitrary UUID that is not the validated active preference", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const {
      checkApplyApiActiveInstitute,
      tryApplyApiActiveInstituteSession,
    } = await import("./api-active-institute");
    writeStoredActiveInstituteId(A);
    saveSession(apiUser, false, { authSource: "api" });

    expect(checkApplyApiActiveInstitute(B, "Other School")).toEqual({
      ok: false,
      reason: "not_active_preference",
    });
    expect(tryApplyApiActiveInstituteSession(B, "Other School")).toBeNull();
    expect(loadSession()?.instituteId).toBe("");
    expect(loadSession()?.instituteName).toBe("");
  });

  it("applies when institute matches validated stored active preference", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { tryApplyApiActiveInstituteSession } = await import(
      "./api-active-institute"
    );
    writeStoredActiveInstituteId(A);
    saveSession(apiUser, false, { authSource: "api" });

    const next = tryApplyApiActiveInstituteSession(A, "Alpha School");
    expect(next?.instituteId).toBe(A);
    expect(next?.instituteName).toBe("Alpha School");
    expect(loadSession()?.instituteId).toBe(A);
    expect(loadSession()?.instituteName).toBe("Alpha School");
  });

  it("clearApiActiveInstituteSession removes stale presentation", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const {
      tryApplyApiActiveInstituteSession,
      clearApiActiveInstituteSession,
    } = await import("./api-active-institute");
    writeStoredActiveInstituteId(A);
    saveSession(apiUser, false, { authSource: "api" });
    tryApplyApiActiveInstituteSession(A, "Alpha School");

    const cleared = clearApiActiveInstituteSession();
    expect(cleared?.instituteId).toBe("");
    expect(cleared?.instituteName).toBe("");
    expect(loadSession()?.instituteId).toBe("");
    // Preference key may still exist until active-institute helpers clear it —
    // presentation must not claim validated institute.
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(A);
  });

  it("does nothing in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { tryApplyApiActiveInstituteSession } = await import(
      "./api-active-institute"
    );
    writeStoredActiveInstituteId(A);
    saveSession(apiUser, false, { authSource: "demo" });
    expect(tryApplyApiActiveInstituteSession(A, "Alpha")).toBeNull();
    clearSession();
  });
});
