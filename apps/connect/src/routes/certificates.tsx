import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { StudentCertificatesPage } from "@/student-portal";

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certificates — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <CertificatesRoute />
    </AppShell>
  ),
});

function CertificatesRoute() {
  const { role } = useApp();
  if (role === "student") return <StudentCertificatesPage />;
  if (role === "parent") return <StudentCertificatesPage readOnlyParent />;
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Certificates is available in the Student or Parent portal.
    </div>
  );
}
