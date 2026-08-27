import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_INSTITUTE_STORAGE_KEY,
  resolveActiveInstitute,
  selectActiveInstitute,
} from "@/lib/active-institute";
import { ApiClientError } from "@/lib/api";
import type { InstituteDto } from "./types";

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

function institute(
  id: string,
  name: string,
  status: InstituteDto["status"] = "active",
): InstituteDto {
  return {
    id,
    code: name.slice(0, 4).toUpperCase(),
    name,
    kind: "school",
    status,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

describe("loadInstituteContext mode branching", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("demo mode returns demo state without calling institutes API or /me", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listSpy = vi.fn();
    const meSpy = vi.fn();
    vi.doMock("./api", () => ({
      listInstitutes: listSpy,
      getInstitute: vi.fn(),
    }));
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: meSpy,
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.mode).toBe("demo");
    expect(state.status).toBe("demo");
    expect(state.displayLabel).toBeNull();
    expect(listSpy).not.toHaveBeenCalled();
    expect(meSpy).not.toHaveBeenCalled();
  });

  it("API mode loads institutes and auto-selects single membership", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => ({
        user: { id: "u1" },
        profile: {
          id: "p1",
          displayName: "Admin",
          email: "a@b.edu",
          status: "active",
        },
        institutes: [
          { instituteId: A, membershipId: "m1", status: "active", roles: ["principal"] },
        ],
        platformOperator: { active: false, roleCode: null },
        identities: { teachers: [], students: [], parents: [], staff: [] },
      })),
    }));
    vi.doMock("./api", () => ({
      listInstitutes: vi.fn(async () => [institute(A, "Alpha School")]),
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.mode).toBe("api");
    expect(state.status).toBe("ready");
    expect(state.activeInstituteId).toBe(A);
    expect(state.displayLabel).toContain("Alpha School");
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(A);
  });

  it("API mode with multiple memberships and no store needs selection", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => ({
        user: { id: "u1" },
        profile: {
          id: "p1",
          displayName: "Admin",
          email: "a@b.edu",
          status: "active",
        },
        institutes: [
          { instituteId: A, membershipId: "m1", status: "active", roles: ["principal"] },
          { instituteId: B, membershipId: "m2", status: "active", roles: ["staff"] },
        ],
        platformOperator: { active: false, roleCode: null },
        identities: { teachers: [], students: [], parents: [], staff: [] },
      })),
    }));
    vi.doMock("./api", () => ({
      listInstitutes: vi.fn(async () => [
        institute(A, "Alpha School"),
        institute(B, "Beta College"),
      ]),
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.status).toBe("needs_selection");
    expect(state.activeInstitute).toBeNull();
    expect(state.institutes).toHaveLength(2);
  });

  it("API mode reuses valid stored UUID among many", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, B);
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => ({
        user: { id: "u1" },
        profile: {
          id: "p1",
          displayName: "Admin",
          email: "a@b.edu",
          status: "active",
        },
        institutes: [
          { instituteId: A, membershipId: "m1", status: "active", roles: ["principal"] },
          { instituteId: B, membershipId: "m2", status: "active", roles: ["staff"] },
        ],
        platformOperator: { active: false, roleCode: null },
        identities: { teachers: [], students: [], parents: [], staff: [] },
      })),
    }));
    vi.doMock("./api", () => ({
      listInstitutes: vi.fn(async () => [
        institute(A, "Alpha School"),
        institute(B, "Beta College"),
      ]),
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.status).toBe("ready");
    expect(state.activeInstituteId).toBe(B);
    expect(state.displayLabel).toContain("Beta College");
  });

  it("API failure does not invent demo institute identity", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => {
        throw new Error("Network request failed");
      }),
    }));
    const listSpy = vi.fn();
    vi.doMock("./api", () => ({
      listInstitutes: listSpy,
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.mode).toBe("api");
    expect(state.status).toBe("error");
    expect(state.displayLabel).toBeNull();
    expect(state.activeInstitute).toBeNull();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it("403 on list institutes surfaces forbidden without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => ({
        user: { id: "u1" },
        profile: {
          id: "p1",
          displayName: "Admin",
          email: "a@b.edu",
          status: "active",
        },
        institutes: [
          { instituteId: A, membershipId: "m1", status: "active", roles: ["principal"] },
        ],
        platformOperator: { active: false, roleCode: null },
        identities: { teachers: [], students: [], parents: [], staff: [] },
      })),
    }));
    vi.doMock("./api", () => ({
      listInstitutes: vi.fn(async () => {
        throw new ApiClientError({
          status: 403,
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }),
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.status).toBe("forbidden");
    expect(state.displayLabel).toBeNull();
  });

  it("401 surfaces error state (unauthorized cleanup remains on client)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/me-bridge", () => ({
      fetchMe: vi.fn(async () => {
        throw new ApiClientError({
          status: 401,
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
        });
      }),
    }));
    vi.doMock("./api", () => ({
      listInstitutes: vi.fn(),
      getInstitute: vi.fn(),
    }));

    const { loadInstituteContext } = await import("./context");
    const state = await loadInstituteContext();
    expect(state.status).toBe("error");
    expect(state.errorMessage).toMatch(/Invalid or expired/i);
    expect(state.displayLabel).toBeNull();
  });
});

describe("chooseActiveInstitute + resolve helpers", () => {
  beforeEach(() => {
    store.clear();
  });

  it("rejects non-member selection", () => {
    expect(() =>
      selectActiveInstitute(A, [{ instituteId: B, status: "active" }]),
    ).toThrow(/not available/);
  });

  it("rejects inactive membership via resolve", () => {
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, A);
    const result = resolveActiveInstitute(
      [{ instituteId: A, status: "ended" }],
      A,
    );
    expect(result.reason).toBe("none");
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("does not persist nonexistent institute", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { chooseActiveInstitute } = await import("./context");
    expect(() =>
      chooseActiveInstitute(
        A,
        [{ instituteId: A, status: "active" }],
        [institute(B, "Beta")],
      ),
    ).toThrow(/not available/);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("does not persist inactive institute", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { chooseActiveInstitute } = await import("./context");
    expect(() =>
      chooseActiveInstitute(
        A,
        [{ instituteId: A, status: "active" }],
        [institute(A, "Alpha", "inactive")],
      ),
    ).toThrow(/not available/);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("does not persist unauthorized institute even if listed", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { chooseActiveInstitute } = await import("./context");
    expect(() =>
      chooseActiveInstitute(
        A,
        [{ instituteId: B, status: "active" }],
        [institute(A, "Alpha")],
      ),
    ).toThrow(/not available/);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("chooseActiveInstitute persists and returns DTO for valid active authorized", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { chooseActiveInstitute } = await import("./context");
    const institutes = [institute(A, "Alpha"), institute(B, "Beta")];
    const chosen = chooseActiveInstitute(
      B,
      [
        { instituteId: A, status: "active" },
        { instituteId: B, status: "active" },
      ],
      institutes,
    );
    expect(chosen.id).toBe(B);
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(B);
  });
});
