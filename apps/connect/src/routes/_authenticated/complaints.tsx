import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const ComplaintsPage = lazy(() =>
  import("@/lazy-pages/ComplaintsPage").then((m) => ({ default: m.ComplaintsPage })),
);

export const Route = createFileRoute("/_authenticated/complaints")({
  head: () => ({ meta: [{ title: "Complaints — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <ComplaintsPage />
    </Suspense>
  ),
});
