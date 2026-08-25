import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — sending notifications belongs in Admin. */
export const Route = createFileRoute("/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/notification-templates" });
  },
});
