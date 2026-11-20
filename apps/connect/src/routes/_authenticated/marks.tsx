import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const MarksPage = lazy(() =>
  import("@/lazy-pages/MarksPage").then((m) => ({ default: m.MarksPage })),
);

export const Route = createFileRoute("/_authenticated/marks")({
  head: () => ({
    meta: [
      { title: "Marks & Report Cards — LumenX Connect" },
      {
        name: "description",
        content: "Enter and submit subject-wise marks for Admin publishing.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <MarksPage />
    </Suspense>
  ),
});
