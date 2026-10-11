import type { Persister } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del, keys } from "idb-keyval";
import {
  CONNECT_QUERY_CACHE_BUSTER,
  CONNECT_QUERY_PERSIST_MAX_AGE_MS,
} from "./query-client";
import { connectQueryRoots } from "./keys";
import { sanitizePersistedQueryClient } from "./sanitize-persisted";
import { connectKeyBelongsToUser, connectKeyUserId } from "./scope";

const IDB_KEY_PREFIX = "lumenx-connect-rq";

export function isConnectPersistStorageKey(key: string): boolean {
  return key.startsWith(`${IDB_KEY_PREFIX}-`);
}

export function connectPersistStorageKey(userId: string): string {
  const uid = userId.trim();
  if (!uid) {
    throw new Error("connectPersistStorageKey requires a non-empty user id");
  }
  return `${IDB_KEY_PREFIX}-v${CONNECT_QUERY_CACHE_BUSTER}:${uid}`;
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
        // Quota / private mode — fail open.
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

export function getConnectQueryPersister(userId: string): Persister {
  const key = connectPersistStorageKey(userId);
  if (currentPersister && currentPersistKey === key) {
    return currentPersister;
  }
  currentPersistKey = key;
  currentPersister = createAsyncStoragePersister({
    storage: createIdbStorage(),
    key,
    throttleTime: 1000,
    serialize: (client) =>
      JSON.stringify(sanitizePersistedQueryClient(client)),
    deserialize: (cached) => {
      try {
        return sanitizePersistedQueryClient(JSON.parse(cached));
      } catch {
        return sanitizePersistedQueryClient({});
      }
    },
  });
  return currentPersister;
}

export async function clearPersistedConnectCache(userId: string): Promise<void> {
  const key = connectPersistStorageKey(userId);
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

export async function clearAllPersistedConnectCaches(): Promise<void> {
  try {
    const allKeys = await keys();
    await Promise.all(
      allKeys
        .filter((k): k is string => typeof k === "string" && isConnectPersistStorageKey(k))
        .map((k) => del(k).catch(() => undefined)),
    );
  } catch {
    // ignore
  }
  currentPersister = null;
  currentPersistKey = null;
}

const VOLATILE_ROOTS = new Set<string>([
  connectQueryRoots.inbox,
  connectQueryRoots.transport,
  connectQueryRoots.messages,
]);

/**
 * Shortest scoped key length per root (= unscoped connectQueryKeys length + 1 for userId).
 * Rejects legacy unscoped keys where instituteId sat at index 1.
 */
const MIN_SCOPED_KEY_LENGTH: Record<string, number> = {
  [connectQueryRoots.teacherPortal]: 3,
  [connectQueryRoots.parentPortal]: 4,
  [connectQueryRoots.studentPortal]: 3,
  [connectQueryRoots.activityWorkspace]: 4,
  [connectQueryRoots.attendance]: 5,
  [connectQueryRoots.fees]: 4,
  [connectQueryRoots.marks]: 4,
  [connectQueryRoots.homework]: 4,
  [connectQueryRoots.timetable]: 5,
  [connectQueryRoots.diary]: 4,
  [connectQueryRoots.messages]: 4,
  [connectQueryRoots.events]: 3,
  [connectQueryRoots.exams]: 4,
  [connectQueryRoots.leave]: 5,
  [connectQueryRoots.inbox]: 4,
  [connectQueryRoots.announcements]: 3,
  [connectQueryRoots.complaints]: 4,
  [connectQueryRoots.transport]: 5,
  [connectQueryRoots.students]: 5,
  [connectQueryRoots.remarks]: 3,
  [connectQueryRoots.teachers]: 5,
  [connectQueryRoots.schoolAlerts]: 3,
  [connectQueryRoots.certificates]: 4,
  [connectQueryRoots.enrollmentHistory]: 4,
  [connectQueryRoots.activities]: 5,
  [connectQueryRoots.prefs]: 4,
  [connectQueryRoots.holidays]: 3,
};

export function shouldDehydrateConnectQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
}): boolean {
  if (query.state.status !== "success") return false;
  const root = query.queryKey[0];
  if (typeof root !== "string") return false;
  if (
    !Object.values(connectQueryRoots).includes(
      root as (typeof connectQueryRoots)[keyof typeof connectQueryRoots],
    )
  ) {
    return false;
  }
  // Require authenticated user segment — never persist anonymous / legacy unscoped keys.
  const uid = connectKeyUserId(query.queryKey);
  if (!uid || uid === "__none__") return false;
  const minLen = MIN_SCOPED_KEY_LENGTH[root];
  if (minLen != null && query.queryKey.length < minLen) return false;
  // Live transport / inbox / messages — always refetch; do not restore stale unread/GPS.
  if (VOLATILE_ROOTS.has(root)) return false;
  const joined = query.queryKey.map(String).join(":").toLowerCase();
  if (
    joined.includes("token") ||
    joined.includes("password") ||
    joined.includes("otp") ||
    joined.includes("secret") ||
    joined.includes("live")
  ) {
    return false;
  }
  return true;
}

/** Drop in-memory queries that do not belong to the active user (account switch safety). */
export function removeForeignUserConnectQueries(
  queryClient: { getQueryCache: () => { getAll: () => Array<{ queryKey: readonly unknown[] }> }; removeQueries: (opts: { queryKey: readonly unknown[] }) => void },
  userId: string | null | undefined,
): void {
  for (const query of queryClient.getQueryCache().getAll()) {
    if (!connectKeyBelongsToUser(query.queryKey, userId)) {
      queryClient.removeQueries({ queryKey: query.queryKey });
    }
  }
}

export const connectPersistOptions = {
  maxAge: CONNECT_QUERY_PERSIST_MAX_AGE_MS,
  buster: String(CONNECT_QUERY_CACHE_BUSTER),
  dehydrateOptions: {
    shouldDehydrateQuery: shouldDehydrateConnectQuery,
    shouldDehydrateMutation: () => false,
  },
};
