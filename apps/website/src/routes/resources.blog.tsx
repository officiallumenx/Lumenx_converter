import { createFileRoute, redirect } from "@tanstack/react-router";

/** Blog removed from Resources — keep URL from 404ing. */
export const Route = createFileRoute("/resources/blog")({
  beforeLoad: () => {
    throw redirect({ to: "/resources", replace: true });
  },
  component: () => null,
});
