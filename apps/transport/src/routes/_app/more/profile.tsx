import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const ProfilePage = lazy(() =>
  import("@/features/profile").then((m) => ({
    default: m.ProfilePage,
  })),
);

export const Route = createFileRoute("/_app/more/profile")({
  head: () => ({ meta: [{ title: `Profile — ${APP_NAME}` }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <ProfilePage />
    </Suspense>
  );
}
