import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — person records belong in Admin. */
export const Route = createFileRoute("/parents")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-users" });
  },
});
