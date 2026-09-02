import { createFileRoute } from "@tanstack/react-router";
import { JobsBrowsePage } from "@/careers-portal/features/jobs/JobsBrowsePage";

export const Route = createFileRoute("/_app/jobs/")({
  head: () => ({ meta: [{ title: "Open Positions — Careers" }] }),
  component: JobsBrowsePage,
});
