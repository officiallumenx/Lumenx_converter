import type { QueryClient } from "@tanstack/react-query";

import { TRANSPORT_SOFT_REFRESH_ROOTS } from "./keys";

/** Soft refresh: invalidate Transport TanStack Query caches (not clear). */
export function invalidateTransportSoftRefresh(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    TRANSPORT_SOFT_REFRESH_ROOTS.map((root) =>
      queryClient.invalidateQueries({ queryKey: [root] }),
    ),
  ).then(() => undefined);
}
