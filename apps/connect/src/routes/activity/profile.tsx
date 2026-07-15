import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy path — settings live at /profile for all teacher roles. */
export const Route = createFileRoute("/activity/profile")({
  head: () => ({ meta: [{ title: "Settings — Activity Workspace" }] }),
  component: () => <Navigate to="/profile" replace />,
});
