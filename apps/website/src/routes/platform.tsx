import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  return <Outlet />;
}
