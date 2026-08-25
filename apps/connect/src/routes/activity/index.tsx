import { createFileRoute } from "@tanstack/react-router";
import { ActivityDashboardPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/")({
  head: () => ({ meta: [{ title: "Dashboard — Activity Coordinator" }] }),
  component: ActivityDashboardPage,
});
