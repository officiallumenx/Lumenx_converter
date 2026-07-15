import { createFileRoute } from "@tanstack/react-router";
import { ActivityExtraCurricularPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/extra-curricular")({
  head: () => ({ meta: [{ title: "Extra-Curricular — Activity Workspace" }] }),
  component: ActivityExtraCurricularPage,
});
