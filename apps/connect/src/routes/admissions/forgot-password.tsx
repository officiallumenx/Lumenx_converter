import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordFlow } from "@/admissions-portal/features/auth/AuthFlows";

export const Route = createFileRoute("/admissions/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Admissions" }] }),
  component: ForgotPasswordFlow,
});
