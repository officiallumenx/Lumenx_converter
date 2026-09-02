import { createFileRoute } from "@tanstack/react-router";
import { ProgramsPage } from "@/admissions-portal/features/home/AdmissionsHomePage";

export const Route = createFileRoute("/_app/programs")({
  head: () => ({ meta: [{ title: "Programs — Admissions" }] }),
  component: ProgramsPage,
});
