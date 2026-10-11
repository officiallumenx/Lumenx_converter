import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Child } from "@lumenx/types";
import {
  clearAllLinkedChildrenCaches,
  clearLinkedChildrenCacheForUser,
  readLinkedChildrenCache,
  writeLinkedChildrenCache,
} from "./linked-children-cache";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function installMemoryLocalStorage() {
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
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

function child(id: string, name: string): Child {
  return {
    id,
    name,
    initials: "AB",
    className: "Class 5",
    section: "A",
    rollNo: "1",
    attendance: 90,
    avgScore: 80,
    trend: "flat",
    accent: "primary",
    photoUrl: null,
  };
}

describe("linked-children warm cache", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  afterEach(() => {
    clearAllLinkedChildrenCaches();
  });

  it("restores children for the same user and institute", () => {
    writeLinkedChildrenCache(USER_A, INST_A, [child("c1", "Kid A")]);
    const restored = readLinkedChildrenCache(USER_A, INST_A);
    expect(restored).toHaveLength(1);
    expect(restored?.[0]?.name).toBe("Kid A");
  });

  it("does not leak across users or institutes", () => {
    writeLinkedChildrenCache(USER_A, INST_A, [child("c1", "Kid A")]);
    expect(readLinkedChildrenCache(USER_B, INST_A)).toBeNull();
    expect(readLinkedChildrenCache(USER_A, INST_B)).toBeNull();
  });

  it("clearLinkedChildrenCacheForUser removes only that user", () => {
    writeLinkedChildrenCache(USER_A, INST_A, [child("c1", "Kid A")]);
    writeLinkedChildrenCache(USER_B, INST_A, [child("c2", "Kid B")]);
    clearLinkedChildrenCacheForUser(USER_A);
    expect(readLinkedChildrenCache(USER_A, INST_A)).toBeNull();
    expect(readLinkedChildrenCache(USER_B, INST_A)?.[0]?.name).toBe("Kid B");
  });
});
