import { createFileRoute } from "@tanstack/react-router";

import { ExamSchedulePage, examSchedulePageTitle } from "@/features/exams";

export const Route = createFileRoute("/_app/more/exam-schedule")({
  head: () => ({ meta: [{ title: examSchedulePageTitle() }] }),
  component: ExamScheduleRoute,
});

function ExamScheduleRoute() {
  return <ExamSchedulePage />;
}
