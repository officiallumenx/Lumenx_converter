import { createFileRoute } from "@tanstack/react-router";
import { ActivityWorkshopsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/workshops")({
  head: () => ({ meta: [{ title: "Workshops — Activity Portal" }] }),
  component: ActivityWorkshopsPage,
});
