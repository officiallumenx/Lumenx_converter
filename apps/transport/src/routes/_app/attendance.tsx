import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { AttendancePage } from "@/features/attendance";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({ meta: [{ title: `Attendance — ${APP_NAME}` }] }),
  component: AttendanceRoute,
});

function AttendanceRoute() {
  return <AttendancePage />;
}
