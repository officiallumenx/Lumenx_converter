import { createFileRoute } from "@tanstack/react-router";
import { InstituteOpeningsPage } from "@/admissions-portal/features/institute-admin/InstituteOpeningsPage";

export const Route = createFileRoute("/admissions/institute/openings")({
  head: () => ({ meta: [{ title: "Admission openings — Admissions" }] }),
  component: InstituteOpeningsPage,
});
