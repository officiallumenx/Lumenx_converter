import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { BusInformationPage } from "@/features/bus-information";

export const Route = createFileRoute("/_app/more/bus-information")({
  head: () => ({ meta: [{ title: `Bus Information — ${APP_NAME}` }] }),
  component: BusInformationRoute,
});

function BusInformationRoute() {
  return <BusInformationPage />;
}
