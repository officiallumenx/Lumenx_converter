import { QueryClient } from "@tanstack/react-query";
import { isOnline } from "@lumenx/utils";

export function createCareersQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
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
}
