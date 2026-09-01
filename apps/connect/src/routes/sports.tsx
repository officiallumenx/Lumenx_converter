import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/sports")({
  component: () => <Navigate to="/activities" replace />,
});
