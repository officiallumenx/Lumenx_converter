import { QueryClient } from "@tanstack/react-query";
import { isOnline } from "@lumenx/utils";

/** Default list/module window — warm navigation paints from memory. */
export const CONNECT_QUERY_STALE_TIME_MS = 30 * 60_000;
export const CONNECT_QUERY_GC_TIME_MS = 24 * 60 * 60_000;
export const CONNECT_QUERY_PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
/** Bump when persisted shapes become incompatible. */
export const CONNECT_QUERY_CACHE_BUSTER = 1;

let connectQueryClient: QueryClient | null = null;

export function createConnectQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CONNECT_QUERY_STALE_TIME_MS,
        gcTime: CONNECT_QUERY_GC_TIME_MS,
        // Cache-first: show cached data; refetch only when stale.
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: "offlineFirst",
        retry: (failureCount) => {
          if (!isOnline()) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: false,
      },
    },
  });
  connectQueryClient = client;
  return client;
}

export function getConnectQueryClient(): QueryClient | null {
  return connectQueryClient;
}

/** Clear in-memory QueryClient (logout / account switch). */
export function clearConnectQueryClient(): void {
  connectQueryClient?.clear();
}
