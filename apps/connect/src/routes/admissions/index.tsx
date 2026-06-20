import { createFileRoute } from "@tanstack/react-router";
import { AdmissionsHomePage } from "@/admissions-portal/features/home/AdmissionsHomePage";

export const Route = createFileRoute("/admissions/")({
  head: () => ({ meta: [{ title: "Admissions — LumenX Connect" }] }),
  component: AdmissionsHomePage,
});
