import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/parents")({
  component: ParentsLayout,
});

function ParentsLayout() {
  return <Outlet />;
}
