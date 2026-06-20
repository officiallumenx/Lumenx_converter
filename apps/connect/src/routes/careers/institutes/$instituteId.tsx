import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/careers/institutes/$instituteId")({
  beforeLoad: () => {
    throw redirect({ to: "/careers/jobs" });
  },
});
