import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Admissions — LumenX Connect" }] }),
  component: AdmissionsEntry,
});

/** Entry: parent / institute login first (not marketing home). */
function AdmissionsEntry() {
  const { user, hydrated } = useAdmissionsAuth();

  if (!hydrated) return null;

  if (user) {
    return (
      <Navigate
        to={
          user.accountType === "institute_admin"
            ? "/institute"
            : "/applications"
        }
        replace
      />
    );
  }

  return <Navigate to="/login" replace />;
}
