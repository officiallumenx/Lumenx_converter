import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { redirectToAdmissionsPortal } from "@/lib/admissions-origin";

export const Route = createFileRoute("/admissions")({
  head: () => ({ meta: [{ title: "Redirecting — LumenX Admissions" }] }),
  component: AdmissionsRootRedirect,
});

function AdmissionsRootRedirect() {
  useEffect(() => {
    redirectToAdmissionsPortal("/");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Redirecting to LumenX Admissions…</p>
    </div>
  );
}
