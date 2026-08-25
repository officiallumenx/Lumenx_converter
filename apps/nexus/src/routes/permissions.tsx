import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy Admin-clone Permissions route.
 * Platform Access lives at /access — institute roles stay in Admin.
 */
export const Route = createFileRoute("/permissions")({
  beforeLoad: () => {
    throw redirect({ to: "/access" });
  },
});
