import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageStack } from "@lumenx/ui-admin";
import { HomeCommandCenter } from "@/components/home/HomeCommandCenter";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAuth } from "@/auth/AuthContext";
import { useInstituteContext } from "@/lib/institutes";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — LumenX Admin" }] }),
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const instituteCtx = useInstituteContext();

  if (isApiAuthMode()) {
    if (isLoading || !isAuthenticated) return null;
  }

  const instituteLabel =
    instituteCtx.status === "ready" && instituteCtx.activeInstitute
      ? instituteCtx.activeInstitute.name
      : "Institute";

  return (
    <AppShell title="Home" subtitle={instituteLabel}>
      <PageStack>
        <HomeCommandCenter />
      </PageStack>
    </AppShell>
  );
}
