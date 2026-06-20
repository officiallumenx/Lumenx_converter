import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/careers/institutes/")({
  beforeLoad: () => {
    throw redirect({ to: "/careers/jobs" });
  },
});
