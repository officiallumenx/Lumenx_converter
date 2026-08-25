import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — complaints belong in Admin; platform support is /support. */
export const Route = createFileRoute("/complaints")({
  beforeLoad: () => {
    throw redirect({ to: "/support" });
  },
});
