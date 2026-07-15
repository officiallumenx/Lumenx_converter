import { createFileRoute } from "@tanstack/react-router";
import { ActivityEventsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/events")({
  head: () => ({ meta: [{ title: "Events — Activity Portal" }] }),
  component: ActivityEventsPage,
});
