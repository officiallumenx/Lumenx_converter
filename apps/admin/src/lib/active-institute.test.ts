import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  accessibleInstituteIds,
  clearStoredActiveInstituteId,
  resolveActiveInstitute,
  selectActiveInstitute,
  ACTIVE_INSTITUTE_STORAGE_KEY,
} from "./active-institute";

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

describe("active institute", () => {
  beforeEach(() => {
    store.clear();
  });

  it("auto-selects when exactly one accessible institute", () => {
    const result = resolveActiveInstitute(
      [{ instituteId: A, status: "active" }],
      null,
    );
    expect(result).toEqual({ instituteId: A, reason: "single" });
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(A);
  });

  it("keeps valid stored institute among many", () => {
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, B);
    const result = resolveActiveInstitute(
      [
        { instituteId: A, status: "active" },
        { instituteId: B, status: "active" },
      ],
      B,
    );
    expect(result.reason).toBe("stored");
    expect(result.instituteId).toBe(B);
  });

  it("clears invalid stored institute", () => {
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, A);
    const result = resolveActiveInstitute(
      [{ instituteId: B, status: "active" }],
      A,
    );
    expect(result.instituteId).toBe(B);
    expect(result.reason).toBe("single");
  });

  it("returns none when zero accessible institutes", () => {
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, A);
    const result = resolveActiveInstitute(
      [{ instituteId: A, status: "ended" }],
      A,
    );
    expect(result).toEqual({ instituteId: null, reason: "none" });
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("needs selection when multiple and no valid store", () => {
    const result = resolveActiveInstitute(
      [
        { instituteId: A, status: "active" },
        { instituteId: B, status: "active" },
      ],
      null,
    );
    expect(result).toEqual({ instituteId: null, reason: "needs_selection" });
  });

  it("rejects select outside memberships", () => {
    expect(() =>
      selectActiveInstitute(A, [{ instituteId: B, status: "active" }]),
    ).toThrow(/not available/);
  });

  it("filters non-uuid and inactive from accessible list", () => {
    expect(
      accessibleInstituteIds([
        { instituteId: "ins-test1school", status: "active" },
        { instituteId: A, status: "active" },
        { instituteId: B, status: "invited" },
      ]),
    ).toEqual([A]);
  });

  it("clearStoredActiveInstituteId removes key", () => {
    store.set(ACTIVE_INSTITUTE_STORAGE_KEY, A);
    clearStoredActiveInstituteId();
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBeUndefined();
  });

  it("allowInstituteIds lets platform-style selection without memberships", () => {
    const result = resolveActiveInstitute([], null, {
      allowInstituteIds: [A, B],
    });
    expect(result).toEqual({ instituteId: null, reason: "needs_selection" });
    selectActiveInstitute(A, [], { allowInstituteIds: [A, B] });
    expect(store.get(ACTIVE_INSTITUTE_STORAGE_KEY)).toBe(A);
  });
});
