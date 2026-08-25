import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — attendance belongs in Admin. */
export const Route = createFileRoute("/attendance")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
