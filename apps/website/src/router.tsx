import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SitePending } from "./components/SitePending";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 20,
    defaultPreloadStaleTime: 60_000,
    defaultPendingMinMs: 0,
    defaultPendingMs: 120,
    defaultPendingComponent: SitePending,
  });

  return router;
};
