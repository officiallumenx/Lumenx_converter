import { createFileRoute } from "@tanstack/react-router";
import { AdmissionFormBuilderPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/admissions/institute/form")({
  head: () => ({ meta: [{ title: "Form builder — Institute" }] }),
  component: AdmissionFormBuilderPage,
});
