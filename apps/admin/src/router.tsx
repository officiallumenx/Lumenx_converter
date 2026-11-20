import { createRouter } from "@tanstack/react-router";
import { createAdminQueryClient } from "@/lib/admin-queries/query-client";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = createAdminQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Admin chrome scrolls `#main-content`, not the window. Without this,
    // TanStack copies the previous route's nested scroll into the next module
    // (pages open at the bottom). Listed selectors reset on forward nav and
    // still restore on back via the scroll restoration cache.
    scrollToTopSelectors: ['[data-scroll-restoration-id="admin-main"]'],
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMinMs: 240,
    defaultPendingMs: 500,
  });

  return router;
};
