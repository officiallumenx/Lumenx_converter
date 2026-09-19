import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/solutions")({
  component: SolutionsLayout,
});

function SolutionsLayout() {
  return <Outlet />;
}
