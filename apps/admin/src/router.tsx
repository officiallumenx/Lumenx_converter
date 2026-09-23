import { createRouter } from "@tanstack/react-router";
import { createAdminQueryClient } from "@/lib/admin-queries/query-client";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = createAdminQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMinMs: 240,
    defaultPendingMs: 500,
  });

  return router;
};
