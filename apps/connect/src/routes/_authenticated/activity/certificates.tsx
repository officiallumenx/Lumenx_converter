import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/activity/certificates")({
  beforeLoad: () => {
    throw redirect({ to: "/activity/achievements" });
  },
});
