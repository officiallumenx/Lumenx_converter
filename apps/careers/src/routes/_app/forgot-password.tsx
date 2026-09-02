import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordFlow } from "@/careers-portal/features/auth/AuthFlows";

export const Route = createFileRoute("/_app/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Careers" }] }),
  component: ForgotPasswordFlow,
});
