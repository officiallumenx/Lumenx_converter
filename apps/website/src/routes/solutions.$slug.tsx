import { createFileRoute, redirect } from "@tanstack/react-router";
import { isPublicSolutionId } from "@/content/solution-pages";

/** Old per-audience URLs redirect into the single solutions page. */
export const Route = createFileRoute("/solutions/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/solutions",
      search: isPublicSolutionId(params.slug) ? { role: params.slug } : {},
      replace: true,
    });
  },
  component: () => null,
});
