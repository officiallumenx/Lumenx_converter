import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { isOnline } from "@lumenx/utils";

import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 3 * 60_000,
        gcTime: 30 * 60_000,
        // Cache-first navigation: paint last assignment/inbox, refresh when stale.
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

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
