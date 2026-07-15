import { createFileRoute } from "@tanstack/react-router";
import { ActivityCompetitionsPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/competitions")({
  head: () => ({ meta: [{ title: "Competitions — Activity Portal" }] }),
  component: ActivityCompetitionsPage,
});
