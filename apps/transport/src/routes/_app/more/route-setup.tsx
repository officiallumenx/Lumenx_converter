import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteSetupPage } from "@/features/route-setup";

export const Route = createFileRoute("/_app/more/route-setup")({
  head: () => ({ meta: [{ title: `Route Setup — ${APP_NAME}` }] }),
  component: RouteSetupRoute,
});

function RouteSetupRoute() {
  return <RouteSetupPage />;
}
