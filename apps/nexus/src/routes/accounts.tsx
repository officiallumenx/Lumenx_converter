import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — institute accounts belong in Admin. */
export const Route = createFileRoute("/accounts")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-users" });
  },
});
