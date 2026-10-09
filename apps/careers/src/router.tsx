import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createCareersQueryClient } from "@/lib/query-client";

export const getRouter = () => {
  const queryClient = createCareersQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
