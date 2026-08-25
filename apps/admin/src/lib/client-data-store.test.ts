import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageStore } from "./client-data-store";

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

describe("createLocalStorageStore snapshot identity", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns the same object when storage is empty (useSyncExternalStore safe)", () => {
    const data = createLocalStorageStore<{ n: number }>({
      storageKey: "lx-test-empty",
      eventName: "lx-test-empty-changed",
      seed: () => ({ n: 1 }),
    });

    const first = data.load();
    const second = data.load();
    expect(second).toBe(first);
  });

  it("returns the same object after persist", () => {
    const data = createLocalStorageStore<{ n: number }>({
      storageKey: "lx-test-persist",
      eventName: "lx-test-persist-changed",
      seed: () => ({ n: 0 }),
    });

    const written = data.set({ n: 7 });
    expect(data.load()).toBe(written);
    expect(data.load()).toBe(data.load());
  });
});
