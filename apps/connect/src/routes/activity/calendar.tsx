import { createFileRoute } from "@tanstack/react-router";
import { ActivityCalendarPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Activity Coordinator" }] }),
  component: ActivityCalendarPage,
});
