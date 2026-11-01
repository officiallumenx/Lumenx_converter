import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const SettingsPage = lazy(() =>
  import("@/features/settings").then((m) => ({
    default: m.SettingsPage,
  })),
);

export const Route = createFileRoute("/_app/more/settings")({
  head: () => ({ meta: [{ title: `Settings — ${APP_NAME}` }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <SettingsPage />
    </Suspense>
  );
}
