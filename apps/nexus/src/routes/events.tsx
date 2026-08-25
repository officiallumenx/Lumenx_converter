import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — institute events belong in Admin. */
export const Route = createFileRoute("/events")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
