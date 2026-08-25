import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { ProfilePage } from "@/features/profile";

export const Route = createFileRoute("/_app/more/profile")({
  head: () => ({ meta: [{ title: `Profile — ${APP_NAME}` }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return <ProfilePage />;
}
