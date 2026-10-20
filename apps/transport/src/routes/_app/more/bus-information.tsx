import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const BusInformationPage = lazy(() =>
  import("@/features/bus-information").then((m) => ({
    default: m.BusInformationPage,
  })),
);

export const Route = createFileRoute("/_app/more/bus-information")({
  head: () => ({ meta: [{ title: `Bus Information — ${APP_NAME}` }] }),
  component: BusInformationRoute,
});

function BusInformationRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <BusInformationPage />
    </Suspense>
  );
}
