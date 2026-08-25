import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — person records belong in Admin. */
export const Route = createFileRoute("/students/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-users" });
  },
});
