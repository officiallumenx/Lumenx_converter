import { createFileRoute } from "@tanstack/react-router";

import { SchoolCalendarPage, schoolCalendarPageTitle } from "@/features/calendar";

export const Route = createFileRoute("/_app/more/calendar")({
  head: () => ({ meta: [{ title: schoolCalendarPageTitle() }] }),
  component: SchoolCalendarRoute,
});

function SchoolCalendarRoute() {
  return <SchoolCalendarPage />;
}
