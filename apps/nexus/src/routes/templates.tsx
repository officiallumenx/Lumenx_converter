import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy stub — use Notification Templates or Certificate Templates. */
export const Route = createFileRoute("/templates")({
  beforeLoad: () => {
    throw redirect({ to: "/notification-templates" });
  },
});
