import { createFileRoute } from "@tanstack/react-router";
import { ActivityNotificationsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Activity Portal" }] }),
  component: ActivityNotificationsPage,
});
