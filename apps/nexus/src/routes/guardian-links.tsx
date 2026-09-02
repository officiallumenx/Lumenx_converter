import { createFileRoute, redirect } from "@tanstack/react-router";

/** Guardian / parent linking is an institute Admin operation — not Nexus. */
export const Route = createFileRoute("/guardian-links")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-users" });
  },
});
