import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const ExamsPage = lazy(() =>
  import("@/lazy-pages/ExamsPage").then((m) => ({ default: m.ExamsPage })),
);

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <ExamsPage />
    </Suspense>
  ),
});
