import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { JobsBrowsePage } from "@/careers-portal/features/jobs/JobsBrowsePage";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_app/jobs/")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Open Positions — Careers" }] }),
  component: JobsBrowseRoute,
});

function JobsBrowseRoute() {
  const { q } = Route.useSearch();
  return <JobsBrowsePage initialQuery={q} />;
}
