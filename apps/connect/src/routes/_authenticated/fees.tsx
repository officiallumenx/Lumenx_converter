import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const FeesPage = lazy(() =>
  import("@/lazy-pages/FeesPage").then((m) => ({ default: m.FeesPage })),
);

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({
    meta: [
      { title: "Fees — LumenX Connect" },
      { name: "description", content: "Pending dues, payment history and fee receipts." },
    ],
  }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <FeesPage />
    </Suspense>
  ),
});
