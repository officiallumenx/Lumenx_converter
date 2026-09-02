import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_PINS_STORAGE_KEY, DEMO_SECURITY_PIN } from "./app-lock-store";

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

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("app-lock policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    store.clear();
  });

  it("requires app lock only in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { isAppLockRequired, isLocalPinStorageAllowed } = await import(
      "./app-lock-policy"
    );
    expect(isAppLockRequired()).toBe(true);
    expect(isLocalPinStorageAllowed()).toBe(true);
  });

  it("disables app lock in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { isAppLockRequired, isLocalPinStorageAllowed } = await import(
      "./app-lock-policy"
    );
    expect(isAppLockRequired()).toBe(false);
    expect(isLocalPinStorageAllowed()).toBe(false);
  });

  it("redirects forgot-pin to password reset in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { resolveAppLockDemoRouteBlock } = await import("./app-lock-policy");
    expect(resolveAppLockDemoRouteBlock("/forgot-pin")).toBe("/forgot-password");
    expect(resolveAppLockDemoRouteBlock("/login")).toBeNull();
  });
});

describe("verifyUserPin API mode isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    store.clear();
  });

  it("rejects demo PIN 123456 for API users without stored PIN", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { verifyUserPin } = await import("./app-lock-store");
    expect(verifyUserPin(USER_ID, DEMO_SECURITY_PIN, "user@school.edu")).toBe(
      false,
    );
  });

  it("does not persist PIN in localStorage during API mode signup save", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { saveUserPin } = await import("./app-lock-store");
    saveUserPin(USER_ID, "654321", "user@school.edu");
    expect(store.get(USER_PINS_STORAGE_KEY)).toBeUndefined();
  });

  it("accepts demo PIN for demo users without stored PIN", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { verifyUserPin } = await import("./app-lock-store");
    expect(verifyUserPin(USER_ID, DEMO_SECURITY_PIN, "user@school.edu")).toBe(
      true,
    );
  });

  it("mockVerifyAppPin never unlocks API sessions via local PIN", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { mockVerifyAppPin } = await import("./app-lock-store");
    await expect(mockVerifyAppPin(USER_ID, DEMO_SECURITY_PIN)).resolves.toBe(
      false,
    );
  });
});

describe("demo PIN storage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    store.clear();
  });

  it("stores plaintext PIN only in demo mode (local convenience)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { saveUserPin, verifyUserPin } = await import("./app-lock-store");
    saveUserPin(USER_ID, "987654", "user@school.edu");
    expect(verifyUserPin(USER_ID, "987654", "user@school.edu")).toBe(true);
    const raw = store.get(USER_PINS_STORAGE_KEY);
    expect(raw).toContain("987654");
  });
});
