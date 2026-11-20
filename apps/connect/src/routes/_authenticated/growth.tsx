import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectRoleGate } from "@/components/app/ConnectRoleGate";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const GrowthPage = lazy(() =>
  import("@/lazy-pages/GrowthPage").then((m) => ({ default: m.GrowthPage })),
);

export const Route = createFileRoute("/_authenticated/growth")({
  head: () => ({ meta: [{ title: "Growth — LumenX Connect" }] }),
  component: () => (
    <ConnectRoleGate allow={["parent", "student"]}>
      <Suspense fallback={<RouteLazyFallback />}>
        <GrowthPage />
      </Suspense>
    </ConnectRoleGate>
  ),
});
