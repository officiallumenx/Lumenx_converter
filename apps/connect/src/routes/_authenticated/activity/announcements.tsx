import { createFileRoute } from "@tanstack/react-router";
import { ActivityAnnouncementsPage } from "@/activity-workspace";

export const Route = createFileRoute("/_authenticated/activity/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Activity Coordinator" }] }),
  component: ActivityAnnouncementsPage,
});
