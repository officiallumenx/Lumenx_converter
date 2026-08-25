import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — academic structure belongs in Admin. */
export const Route = createFileRoute("/classes")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
