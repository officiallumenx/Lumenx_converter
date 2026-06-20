import { createFileRoute } from "@tanstack/react-router";
import { InstituteApplicationsPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/admissions/institute/applications/")({
  head: () => ({ meta: [{ title: "Review applications — Institute" }] }),
  component: InstituteApplicationsPage,
});
