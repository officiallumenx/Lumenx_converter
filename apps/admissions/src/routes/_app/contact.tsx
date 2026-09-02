import { createFileRoute } from "@tanstack/react-router";
import { ContactAdmissionsPage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/_app/contact")({
  head: () => ({ meta: [{ title: "Contact — Admissions" }] }),
  component: ContactAdmissionsPage,
});
