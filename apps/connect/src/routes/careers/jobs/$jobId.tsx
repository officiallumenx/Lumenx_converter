import { createFileRoute } from "@tanstack/react-router";
import { JobDetailPage } from "@/careers-portal/features/jobs/JobDetailPage";

export const Route = createFileRoute("/careers/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job Details — Careers" }] }),
  component: JobDetailRoute,
});

function JobDetailRoute() {
  const { jobId } = Route.useParams();
  return <JobDetailPage jobId={jobId} />;
}
