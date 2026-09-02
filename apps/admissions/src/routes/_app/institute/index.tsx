import { createFileRoute } from "@tanstack/react-router";
import { InstituteAdminDashboardPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/_app/institute/")({
  head: () => ({ meta: [{ title: "Institute dashboard — Admissions" }] }),
  component: InstituteAdminDashboardPage,
});
