import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createConnectQueryClient } from "@/lib/connect-queries/query-client";

export const getRouter = () => {
  const queryClient = createConnectQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
