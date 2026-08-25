import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { SettingsPage } from "@/features/settings";

export const Route = createFileRoute("/_app/more/settings")({
  head: () => ({ meta: [{ title: `Settings — ${APP_NAME}` }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return <SettingsPage />;
}
