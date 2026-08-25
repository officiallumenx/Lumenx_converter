import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { HomePage } from "@/features/home";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: `Home — ${APP_NAME}` }] }),
  component: HomeRoute,
});

function HomeRoute() {
  return <HomePage />;
}
