import { createFileRoute } from "@tanstack/react-router";
import { ActivityAttendancePage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Activity Coordinator" }] }),
  component: ActivityAttendancePage,
});
