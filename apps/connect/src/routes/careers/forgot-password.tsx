import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordFlow } from "@/careers-portal/features/auth/AuthFlows";

export const Route = createFileRoute("/careers/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Careers" }] }),
  component: ForgotPasswordFlow,
});
