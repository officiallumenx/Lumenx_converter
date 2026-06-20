import { createFileRoute } from "@tanstack/react-router";
import { InstituteSettingsPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/admissions/institute/settings")({
  head: () => ({ meta: [{ title: "Institute profile — Admissions" }] }),
  component: InstituteSettingsPage,
});
