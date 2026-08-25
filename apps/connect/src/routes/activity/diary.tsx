import { createFileRoute } from "@tanstack/react-router";
import { ActivityDiaryPage } from "@/activity-workspace/features/diary";

export const Route = createFileRoute("/activity/diary")({
  head: () => ({ meta: [{ title: "Diary Book — Activity Coordinator" }] }),
  component: ActivityDiaryPage,
});
