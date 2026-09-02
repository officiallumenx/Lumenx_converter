import { createFileRoute } from "@tanstack/react-router";
import { RequireAdmissionsAuth } from "@/admissions-portal/core/guards";
import { AdmissionsProfilePage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Admissions" }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <RequireAdmissionsAuth>
      <AdmissionsProfilePage />
    </RequireAdmissionsAuth>
  );
}
