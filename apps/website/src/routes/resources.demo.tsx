import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — Demo removed from Resources. */
export const Route = createFileRoute("/resources/demo")({
  beforeLoad: () => {
    throw redirect({ to: "/resources" });
  },
  component: function ResourcesDemoRedirect() {
    return null;
  },
});
