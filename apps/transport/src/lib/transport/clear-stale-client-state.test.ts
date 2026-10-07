import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubMapStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("clear-stale-client-state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wipes lumenx.transport.* and supabase auth via clearTransportClientData", async () => {
    stubMapStorage();
    localStorage.setItem("lumenx.transport.ops-outbox.v2", '{"events":[]}');
    localStorage.setItem("lumenx.transport.supabase.auth.v1", '{"access_token":"x"}');
    localStorage.setItem("ues_transport_session", '{"id":"1"}');
    localStorage.setItem("lumenx-transport-theme", "dark");
    localStorage.setItem("keep.other.app", "1");

    const { clearTransportClientData } = await import("./clear-stale-client-state");
    clearTransportClientData();

    expect(localStorage.getItem("lumenx.transport.ops-outbox.v2")).toBeNull();
    expect(localStorage.getItem("lumenx.transport.supabase.auth.v1")).toBeNull();
    expect(localStorage.getItem("ues_transport_session")).toBeNull();
    expect(localStorage.getItem("lumenx-transport-theme")).toBeNull();
    expect(localStorage.getItem("keep.other.app")).toBe("1");
  });

  it("getTransportLocalStorage returns null when Storage access throws", async () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("no storage");
      },
    });

    const { getTransportLocalStorage } = await import("./clear-stale-client-state");
    expect(getTransportLocalStorage()).toBeNull();
  });
});
