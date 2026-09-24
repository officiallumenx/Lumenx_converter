import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del, keys } from "idb-keyval";
import {
  ADMIN_QUERY_CACHE_BUSTER,
  ADMIN_QUERY_PERSIST_MAX_AGE_MS,
  ADMIN_QUERY_SCOPE,
} from "./constants";

const IDB_KEY_PREFIX = "lumenx-admin-rq";

/** True when `key` is an Admin RQ IndexedDB persist bucket (any user / buster). */
export function isAdminPersistStorageKey(key: string): boolean {
  return key.startsWith(`${IDB_KEY_PREFIX}-`);
}

/**
 * User-scoped IndexedDB key for the dehydrated QueryClient.
 * Requires a non-empty user id — never use an anonymous bucket.
 */
export function adminPersistStorageKey(userId: string): string {
  const uid = userId.trim();
  if (!uid) {
    throw new Error("adminPersistStorageKey requires a non-empty user id");
  }
  return `${IDB_KEY_PREFIX}-v${ADMIN_QUERY_CACHE_BUSTER}:${uid}`;
}

function createIdbStorage() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const value = await get<string>(key);
        return value ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await set(key, value);
      } catch {
        // Quota / private mode — fail open (in-memory only).
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await del(key);
      } catch {
        // ignore
      }
    },
  };
}

let currentPersister: Persister | null = null;
let currentPersistKey: string | null = null;

export function getAdminQueryPersister(userId: string): Persister {
  const key = adminPersistStorageKey(userId);
  if (currentPersister && currentPersistKey === key) {
    return currentPersister;
  }
  currentPersistKey = key;
  currentPersister = createAsyncStoragePersister({
    storage: createIdbStorage(),
    key,
    throttleTime: 1000,
  });
  return currentPersister;
}

export async function clearPersistedAdminCache(userId: string): Promise<void> {
  const key = adminPersistStorageKey(userId);
  try {
    await del(key);
  } catch {
    // ignore
  }
  if (currentPersistKey === key) {
    currentPersister = null;
    currentPersistKey = null;
  }
}

/** Clear every Admin RQ IndexedDB key (logout / session wipe). */
export async function clearAllPersistedAdminCaches(): Promise<void> {
  try {
    const allKeys = await keys();
    await Promise.all(
      allKeys
        .filter((k): k is string => typeof k === "string" && isAdminPersistStorageKey(k))
        .map((k) => del(k).catch(() => undefined)),
    );
  } catch {
    // ignore
  }
  if (currentPersistKey) {
    try {
      await del(currentPersistKey);
    } catch {
      // ignore
    }
  }
  currentPersister = null;
  currentPersistKey = null;
}

export function shouldDehydrateAdminQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
}): boolean {
  if (query.state.status !== "success") return false;
  const key = query.queryKey;
  if (!Array.isArray(key) || key[0] !== ADMIN_QUERY_SCOPE) return false;
  // Never persist auth-ish accidental keys
  const joined = key.map(String).join(":").toLowerCase();
  if (
    joined.includes("token") ||
    joined.includes("password") ||
    joined.includes("otp") ||
    joined.includes("secret") ||
    joined.includes("refresh")
  ) {
    return false;
  }
  return true;
}

export const adminPersistOptions = {
  maxAge: ADMIN_QUERY_PERSIST_MAX_AGE_MS,
  buster: String(ADMIN_QUERY_CACHE_BUSTER),
  dehydrateOptions: {
    shouldDehydrateQuery: shouldDehydrateAdminQuery,
    shouldDehydrateMutation: () => false,
  },
};

export type { PersistedClient };
