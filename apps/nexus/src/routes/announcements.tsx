import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — announcements belong in Admin. */
export const Route = createFileRoute("/announcements")({
  beforeLoad: () => {
    throw redirect({ to: "/notification-templates" });
  },
});
