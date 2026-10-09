import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createNexusQueryClient } from "@/lib/query-client";

export const getRouter = () => {
  const queryClient = createNexusQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
