import { createFileRoute } from "@tanstack/react-router";
import { ActivityPracticePage } from "@/activity-workspace";

export const Route = createFileRoute("/_authenticated/activity/practice")({
  head: () => ({ meta: [{ title: "Practice — Activity Coordinator" }] }),
  component: ActivityPracticePage,
});
