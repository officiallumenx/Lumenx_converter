import { createFileRoute } from "@tanstack/react-router";
import { ActivityMessagesPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/messages")({
  head: () => ({ meta: [{ title: "Messages — Activity Coordinator" }] }),
  component: ActivityMessagesPage,
});
