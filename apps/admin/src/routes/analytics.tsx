import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { RouteChunkFallback } from "@/components/RouteChunkFallback";
import { PageStack } from "@lumenx/ui-admin";
import { isApiAuthMode } from "@/auth/auth-mode";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LumenX Admin" }] }),
  component: AnalyticsPage,
  pendingComponent: () => <RouteChunkFallback label="Loading analytics…" />,
});

const AnalyticsApiSummaryPanel = lazy(() =>
  import("@/components/analytics/AnalyticsApiSummaryPanel").then((m) => ({
    default: m.AnalyticsApiSummaryPanel,
  })),
);

const AnalyticsDemoPage = lazy(() =>
  import("@/components/analytics/AnalyticsDemoPage").then((m) => ({
    default: m.AnalyticsDemoPage,
  })),
);

function AnalyticsPage() {
  if (isApiAuthMode()) {
    return (
      <AppShell title="Analytics" subtitle="Institute analytics dashboards">
        <PageStack>
          <Suspense fallback={<RouteChunkFallback label="Loading analytics…" />}>
            <AnalyticsApiSummaryPanel />
          </Suspense>
        </PageStack>
      </AppShell>
    );
  }
  return (
    <Suspense fallback={<RouteChunkFallback label="Loading analytics…" />}>
      <AnalyticsDemoPage />
    </Suspense>
  );
}
