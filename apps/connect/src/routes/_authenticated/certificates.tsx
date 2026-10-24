import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const StudentCertificatesPage = lazy(() =>
  import("@/student-portal/features/certificates").then((m) => ({
    default: m.StudentCertificatesPage,
  })),
);

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <CertificatesRoute />
    </Suspense>
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
