import { describe, expect, it } from "vitest";
import { connectQueryRoots } from "./keys";
import {
  connectPersistStorageKey,
  isConnectPersistStorageKey,
  shouldDehydrateConnectQuery,
} from "./persist";

describe("shouldDehydrateConnectQuery", () => {
  it("persists stable portal data for an authenticated user", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.parentPortal, "user-a", "inst", "child"],
        state: { status: "success" },
      }),
    ).toBe(true);
  });

  it("skips anonymous / missing user segment", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.parentPortal, "inst", "child"],
        state: { status: "success" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.parentPortal, "__none__", "inst", "child"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });

  it("skips live transport and inbox", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.transport, "user-a", "inst", "live"],
        state: { status: "success" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.inbox, "user-a", "inst", "parent"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });

  it("skips failed queries", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.homework, "user-a", "inst"],
        state: { status: "error" },
      }),
    ).toBe(false);
  });

  it("skips secret-like keys", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.prefs, "user-a", "token"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });
});

describe("connect persist storage key isolation", () => {
  it("scopes IndexedDB key by user id", () => {
    const a = connectPersistStorageKey("user-a");
    const b = connectPersistStorageKey("user-b");
    expect(a).not.toBe(b);
    expect(isConnectPersistStorageKey(a)).toBe(true);
    expect(a).toContain("user-a");
    expect(b).toContain("user-b");
  });

  it("rejects empty user id", () => {
    expect(() => connectPersistStorageKey("")).toThrow();
  });
});
