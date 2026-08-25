import { createFileRoute } from "@tanstack/react-router";

import { AdminLoginFlow } from "@/auth/components/AdminLoginFlow";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — LumenX Admin" }] }),
  component: AdminLoginFlow,
});
