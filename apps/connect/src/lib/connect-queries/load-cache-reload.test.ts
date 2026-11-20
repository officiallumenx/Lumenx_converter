/**
 * Cold / warm / offline / auth reload behaviour for Connect query persistence.
 * Node + Vitest only — no device timings, no production APIs.
 */
import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const idbStore = new Map<string, string>();

vi.mock("idb-keyval", () => ({
  get: async (key: string) => idbStore.get(key) ?? undefined,
  set: async (key: string, value: string) => {
    idbStore.set(key, value);
  },
  del: async (key: string) => {
    idbStore.delete(key);
  },
  keys: async () => [...idbStore.keys()],
}));

import {
  CONNECT_QUERY_GC_TIME_MS,
  CONNECT_QUERY_STALE_TIME_MS,
  clearConnectQueryClient,
  createConnectQueryClient,
} from "./query-client";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import {
  clearAllPersistedConnectCaches,
  clearPersistedConnectCache,
  connectPersistOptions,
  connectPersistStorageKey,
  getConnectQueryPersister,
  removeForeignUserConnectQueries,
  shouldDehydrateConnectQuery,
} from "./persist";
import { sanitizePersistedQueryClient } from "./sanitize-persisted";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHILD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function portalKey(userId: string) {
  return scopedConnectKey(userId, connectQueryKeys.parentPortal(INST, CHILD));
}

function homeworkKey(userId: string) {
  return scopedConnectKey(userId, connectQueryKeys.homeworkParent(INST));
}

function inboxKey(userId: string) {
  return scopedConnectKey(userId, connectQueryKeys.inbox(INST, "parent"));
}

/** Mirrors portal UI gate: block full-screen only when no usable data yet. */
function isFullScreenLoading(opts: {
  isRestoring: boolean;
  hasData: boolean;
  queryLoading: boolean;
}): boolean {
  return opts.isRestoring || (!opts.hasData && opts.queryLoading);
}

describe("Connect load / cache / reload", () => {
  beforeEach(() => {
    idbStore.clear();
    clearConnectQueryClient();
  });

  afterEach(async () => {
    await clearAllPersistedConnectCaches();
    idbStore.clear();
    clearConnectQueryClient();
    vi.useRealTimers();
  });

  describe("A — cold start (empty cache)", () => {
    it("requires a network fetch and reports full-screen loading until data arrives", async () => {
      const client = createConnectQueryClient();
      const key = portalKey(USER_A);
      let fetches = 0;

      expect(client.getQueryData(key)).toBeUndefined();
      expect(
        isFullScreenLoading({ isRestoring: false, hasData: false, queryLoading: true }),
      ).toBe(true);

      const t0 = Date.now();
      const data = await client.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          fetches += 1;
          return { child: "A", homeworkDue: 2 };
        },
      });
      const elapsedMs = Date.now() - t0;

      expect(data).toEqual({ child: "A", homeworkDue: 2 });
      expect(fetches).toBe(1);
      expect(client.getQueryData(key)).toEqual(data);
      expect(
        isFullScreenLoading({
          isRestoring: false,
          hasData: Boolean(client.getQueryData(key)),
          queryLoading: false,
        }),
      ).toBe(false);
      // Environment-only measurement — not a product SLA.
      expect(elapsedMs).toBeGreaterThanOrEqual(0);
      expect(CONNECT_QUERY_STALE_TIME_MS).toBe(30 * 60_000);
      expect(CONNECT_QUERY_GC_TIME_MS).toBe(24 * 60 * 60_000);
    });
  });

  describe("B — warm start (in-memory + persisted)", () => {
    it("reuses fresh in-memory cache without a second network call", async () => {
      const client = createConnectQueryClient();
      const key = portalKey(USER_A);
      let fetches = 0;
      const queryFn = async () => {
        fetches += 1;
        return { child: "A", from: "network" };
      };

      await client.fetchQuery({ queryKey: key, queryFn });
      expect(fetches).toBe(1);

      // Remount-style read while still fresh (staleTime 30m).
      await client.fetchQuery({ queryKey: key, queryFn });
      expect(fetches).toBe(1);
      expect(client.getQueryData(key)).toEqual({ child: "A", from: "network" });
      expect(
        isFullScreenLoading({
          isRestoring: false,
          hasData: true,
          queryLoading: false,
        }),
      ).toBe(false);
    });

    it("does not full-screen block while background-refreshing when data exists", () => {
      expect(
        isFullScreenLoading({
          isRestoring: false,
          hasData: true,
          queryLoading: true,
        }),
      ).toBe(false);
    });

    it("persists stable portal data to IndexedDB and restores into a new QueryClient", async () => {
      const client1 = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CONNECT_QUERY_STALE_TIME_MS,
            gcTime: CONNECT_QUERY_GC_TIME_MS,
          },
        },
      });
      const key = portalKey(USER_A);
      client1.setQueryData(key, { child: "A", marks: [90] });

      const dehydrated = dehydrate(client1, {
        shouldDehydrateQuery: shouldDehydrateConnectQuery,
        shouldDehydrateMutation: () => false,
      });
      expect(dehydrated.queries.length).toBeGreaterThanOrEqual(1);

      const persister = getConnectQueryPersister(USER_A);
      await persister.persistClient({
        buster: connectPersistOptions.buster,
        timestamp: Date.now(),
        clientState: dehydrated,
      });

      expect(idbStore.has(connectPersistStorageKey(USER_A))).toBe(true);

      // Process restart: new in-memory client, same IndexedDB.
      const client2 = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CONNECT_QUERY_STALE_TIME_MS,
            gcTime: CONNECT_QUERY_GC_TIME_MS,
          },
        },
      });
      const restored = await persister.restoreClient();
      expect(restored).toBeTruthy();
      if (!restored) throw new Error("expected restored client");
      hydrate(client2, restored.clientState);

      expect(client2.getQueryData(key)).toEqual({ child: "A", marks: [90] });
      let fetches = 0;
      await client2.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          fetches += 1;
          return { child: "A", marks: [91] };
        },
      });
      // Still fresh after hydrate → no network.
      expect(fetches).toBe(0);
    });
  });

  describe("C — background / resume config", () => {
    it("disables refetch-on-focus and enables offline-first + reconnect", () => {
      const client = createConnectQueryClient();
      const defaults = client.getDefaultOptions().queries;
      expect(defaults?.refetchOnWindowFocus).toBe(false);
      expect(defaults?.refetchOnReconnect).toBe(true);
      expect(defaults?.networkMode).toBe("offlineFirst");
      expect(defaults?.refetchOnMount).toBe(true);
    });

    it("keeps screen data when a post-resume refresh fails", async () => {
      const client = createConnectQueryClient();
      const key = homeworkKey(USER_A);
      client.setQueryData(key, { items: ["cached-hw"] });

      await expect(
        client.fetchQuery({
          queryKey: key,
          queryFn: async () => {
            throw new Error("offline");
          },
          staleTime: 0,
        }),
      ).rejects.toThrow("offline");

      expect(client.getQueryData(key)).toEqual({ items: ["cached-hw"] });
    });
  });

  describe("D — offline / slow network", () => {
    it("does not claim offline UX beyond keeping prior successful data", async () => {
      const client = createConnectQueryClient();
      const key = portalKey(USER_A);
      client.setQueryData(key, { child: "stale-ok" });

      const state = client.getQueryState(key);
      expect(state?.data).toEqual({ child: "stale-ok" });
      expect(state?.status).toBe("success");

      // Simulated offline refetch leaves previous data addressable for UI.
      await expect(
        client.fetchQuery({
          queryKey: key,
          staleTime: 0,
          queryFn: async () => {
            throw new Error("Failed to fetch");
          },
        }),
      ).rejects.toThrow();
      expect(client.getQueryData(key)).toEqual({ child: "stale-ok" });
    });

    it("does not dehydrate volatile inbox / live transport for offline restore", () => {
      expect(
        shouldDehydrateConnectQuery({
          queryKey: inboxKey(USER_A),
          state: { status: "success" },
        }),
      ).toBe(false);
      expect(
        shouldDehydrateConnectQuery({
          queryKey: scopedConnectKey(
            USER_A,
            connectQueryKeys.transportLearner(INST, CHILD),
          ),
          state: { status: "success" },
        }),
      ).toBe(false);
    });
  });

  describe("E — process restart vs cleared storage", () => {
    it("survives process restart only via IndexedDB persist (not empty memory)", async () => {
      const client1 = new QueryClient();
      const key = portalKey(USER_A);
      client1.setQueryData(key, { survive: true });

      const dehydrated = dehydrate(client1, {
        shouldDehydrateQuery: shouldDehydrateConnectQuery,
      });
      const persister = getConnectQueryPersister(USER_A);
      await persister.persistClient({
        buster: connectPersistOptions.buster,
        timestamp: Date.now(),
        clientState: dehydrated,
      });

      // In-memory only restart — no restore → empty.
      const memoryOnly = new QueryClient();
      expect(memoryOnly.getQueryData(key)).toBeUndefined();

      // With restore → data returns.
      const withRestore = new QueryClient();
      const blob = await persister.restoreClient();
      expect(blob?.clientState).toBeTruthy();
      if (blob) hydrate(withRestore, blob.clientState);
      expect(withRestore.getQueryData(key)).toEqual({ survive: true });
    });

    it("cleared storage yields cold-start behaviour", async () => {
      const client1 = new QueryClient();
      const key = portalKey(USER_A);
      client1.setQueryData(key, { survive: true });
      const dehydrated = dehydrate(client1, {
        shouldDehydrateQuery: shouldDehydrateConnectQuery,
      });
      const persister = getConnectQueryPersister(USER_A);
      await persister.persistClient({
        buster: connectPersistOptions.buster,
        timestamp: Date.now(),
        clientState: dehydrated,
      });

      await clearPersistedConnectCache(USER_A);
      expect(idbStore.has(connectPersistStorageKey(USER_A))).toBe(false);

      const afterClear = await getConnectQueryPersister(USER_A).restoreClient();
      expect(afterClear).toBeUndefined();
    });
  });

  describe("F — authentication / user isolation", () => {
    it("scopes persist keys per user and clears all on logout-style wipe", async () => {
      const pA = getConnectQueryPersister(USER_A);
      const pB = getConnectQueryPersister(USER_B);
      await pA.persistClient({
        buster: connectPersistOptions.buster,
        timestamp: Date.now(),
        clientState: { mutations: [], queries: [] },
      });
      await pB.persistClient({
        buster: connectPersistOptions.buster,
        timestamp: Date.now(),
        clientState: { mutations: [], queries: [] },
      });
      expect(idbStore.has(connectPersistStorageKey(USER_A))).toBe(true);
      expect(idbStore.has(connectPersistStorageKey(USER_B))).toBe(true);

      await clearAllPersistedConnectCaches();
      expect(idbStore.size).toBe(0);
    });

    it("account switch cannot read prior user's in-memory private queries", () => {
      const client = createConnectQueryClient();
      const keyA = portalKey(USER_A);
      const keyB = portalKey(USER_B);
      client.setQueryData(keyA, { secret: "A" });
      client.setQueryData(keyB, { secret: "B" });

      removeForeignUserConnectQueries(client, USER_B);
      expect(client.getQueryData(keyA)).toBeUndefined();
      expect(client.getQueryData(keyB)).toEqual({ secret: "B" });
    });

    it("strips signed photo tokens before persist serialization", () => {
      const sanitized = sanitizePersistedQueryClient({
        photoSignedUrl:
          "https://xyz.supabase.co/storage/v1/object/sign/x.jpg?token=secret",
        photoAssetPath: "inst/students/x.jpg",
        name: "Kid",
      }) as {
        photoSignedUrl: string | null;
        photoAssetPath: string;
        name: string;
      };
      expect(sanitized.photoSignedUrl).toBeNull();
      expect(sanitized.photoAssetPath).toBe("inst/students/x.jpg");
      expect(sanitized.name).toBe("Kid");
    });

    it("never dehydrates password/token/otp shaped keys", () => {
      expect(
        shouldDehydrateConnectQuery({
          queryKey: scopedConnectKey(USER_A, [
            "prefs",
            INST,
            "access-token-refresh",
          ]),
          state: { status: "success" },
        }),
      ).toBe(false);
    });
  });
});
