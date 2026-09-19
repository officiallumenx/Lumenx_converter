import { createFileRoute } from "@tanstack/react-router";
import { ActivityNotificationsPage } from "@/activity-workspace";

export const Route = createFileRoute("/_authenticated/activity/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Activity Coordinator" }] }),
  component: ActivityNotificationsPage,
});
