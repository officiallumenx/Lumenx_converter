import { QueryClient } from "@tanstack/react-query";
import {
  ADMIN_QUERY_GC_TIME_MS,
  ADMIN_QUERY_STALE_TIME_MS,
} from "./constants";

let adminQueryClient: QueryClient | null = null;

export function createAdminQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ADMIN_QUERY_STALE_TIME_MS,
        gcTime: ADMIN_QUERY_GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
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
