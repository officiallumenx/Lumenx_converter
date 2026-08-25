import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/activity/certificates")({
  beforeLoad: () => {
    throw redirect({ to: "/activity/achievements" });
  },
});
