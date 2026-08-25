import { createFileRoute } from "@tanstack/react-router";

import { DriverLoginPage } from "@/features/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Driver login — LumenX Transport" }] }),
  component: DriverLoginPage,
});
