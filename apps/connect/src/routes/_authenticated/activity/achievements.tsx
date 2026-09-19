import { createFileRoute } from "@tanstack/react-router";
import { ActivityAchievementsPage } from "@/activity-workspace";

export const Route = createFileRoute("/_authenticated/activity/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Activity Coordinator" }] }),
  component: ActivityAchievementsPage,
});
