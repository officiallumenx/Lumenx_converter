import { createFileRoute } from "@tanstack/react-router";
import { ActivityClubsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/clubs")({
  head: () => ({ meta: [{ title: "Clubs — Activity Portal" }] }),
  component: ActivityClubsPage,
});
