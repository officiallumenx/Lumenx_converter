import { createFileRoute } from "@tanstack/react-router";
import { ActivityPracticePage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/practice")({
  head: () => ({ meta: [{ title: "Practice — Activity Workspace" }] }),
  component: ActivityPracticePage,
});
