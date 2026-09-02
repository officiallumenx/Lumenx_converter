import { createFileRoute } from "@tanstack/react-router";
import { FaqPage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/_app/faq")({
  head: () => ({ meta: [{ title: "FAQs — Admissions" }] }),
  component: FaqPage,
});
