import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { InquiryCenterPage } from "@/admissions-portal/features/inquiries/InquiryCenterPage";

export const Route = createFileRoute("/admissions/inquiries")({
  head: () => ({ meta: [{ title: "Inquiry Center — Admissions" }] }),
  component: InquiriesRoute,
});

function InquiriesRoute() {
  return (
    <RequireParentAuth>
      <InquiryCenterPage />
    </RequireParentAuth>
  );
}
