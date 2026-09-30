import { QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";
import { isOnline } from "@lumenx/utils";
import { invalidateSetupChecklistCache } from "./load";
import {
  ADMIN_QUERY_GC_TIME_MS,
  ADMIN_QUERY_STALE_TIME_MS,
} from "./constants";

let adminQueryClient: QueryClient | null = null;
let onlineListenerBound = false;

function isNonRetryableAuthError(err: unknown): boolean {
  if (!(err instanceof ApiClientError)) return false;
  return err.status === 401 || err.status === 403 || err.code === "FORBIDDEN" || err.code === "UNAUTHENTICATED";
}

function looksLikeFailedListPayload(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "status" in data &&
      ((data as { status: unknown }).status === "error" ||
        (data as { status: unknown }).status === "forbidden"),
  );
}

function bindOnlineRecovery(client: QueryClient): void {
  if (onlineListenerBound || typeof window === "undefined") return;
  onlineListenerBound = true;
  window.addEventListener("online", () => {
    invalidateSetupChecklistCache();
    void client.invalidateQueries({
      predicate: (query) =>
        query.state.status === "error" || looksLikeFailedListPayload(query.state.data),
    });
  });
}

export function createAdminQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ADMIN_QUERY_STALE_TIME_MS,
        gcTime: ADMIN_QUERY_GC_TIME_MS,
        // Cache-first: paint cached data; refetch only when stale (not on every mount).
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Prefer cached data while offline / during reconnect flaps.
        networkMode: "offlineFirst",
        retry: (failureCount, error) => {
          if (!isOnline()) return false;
          if (isNonRetryableAuthError(error)) return false;
          return failureCount < 1;
        },
        retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 3000),
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: false,
      },
    },
  });
  bindOnlineRecovery(client);
  adminQueryClient = client;
  return client;
}

export function getAdminQueryClient(): QueryClient | null {
  return adminQueryClient;
}

/** Clear in-memory QueryClient (logout / account switch). */
export function clearAdminQueryClient(): void {
  adminQueryClient?.clear();
}
