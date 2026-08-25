import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — timetable belongs in Admin. */
export const Route = createFileRoute("/timetable")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
