import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admissions/institute/applications")({
  component: () => <Outlet />,
});
