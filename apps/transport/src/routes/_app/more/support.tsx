import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const SupportPage = lazy(() =>
  import("@/features/support").then((m) => ({
    default: m.SupportPage,
  })),
);

export const Route = createFileRoute("/_app/more/support")({
  head: () => ({ meta: [{ title: `Support — ${APP_NAME}` }] }),
  component: SupportRoute,
});

function SupportRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <SupportPage />
    </Suspense>
  );
}
