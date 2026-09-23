import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import {
  ADMIN_QUERY_CACHE_BUSTER,
  ADMIN_QUERY_PERSIST_MAX_AGE_MS,
  ADMIN_QUERY_SCOPE,
} from "./constants";

const IDB_KEY_PREFIX = "lumenx-admin-rq";

export function adminPersistStorageKey(userId: string | null | undefined): string {
  const uid = userId?.trim() || "anonymous";
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

export function getAdminQueryPersister(
  userId: string | null | undefined,
): Persister {
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

export async function clearPersistedAdminCache(
  userId?: string | null,
): Promise<void> {
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

/** Clear all known Admin RQ IndexedDB keys (logout when user id unknown). */
export async function clearAllPersistedAdminCaches(): Promise<void> {
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
