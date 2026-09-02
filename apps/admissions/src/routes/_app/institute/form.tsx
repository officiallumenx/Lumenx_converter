import { createFileRoute } from "@tanstack/react-router";
import { AdmissionFormBuilderPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/_app/institute/form")({
  head: () => ({ meta: [{ title: "Application form — Institute" }] }),
  component: AdmissionFormBuilderPage,
});
