import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { SupportPage } from "@/features/support";

export const Route = createFileRoute("/_app/more/support")({
  head: () => ({ meta: [{ title: `Support — ${APP_NAME}` }] }),
  component: SupportRoute,
});

function SupportRoute() {
  return <SupportPage />;
}
