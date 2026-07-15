import { createFileRoute } from "@tanstack/react-router";
import { ActivityAnnouncementsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Activity Workspace" }] }),
  component: ActivityAnnouncementsPage,
});
