import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/institutes/")({
  beforeLoad: () => {
    throw redirect({ to: "/jobs" });
  },
});
