import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for /institutes and /institutes/$id.
 * List lives on the index route; detail renders via Outlet.
 */
export const Route = createFileRoute("/institutes")({
  component: InstitutesLayout,
});

function InstitutesLayout() {
  return <Outlet />;
}
