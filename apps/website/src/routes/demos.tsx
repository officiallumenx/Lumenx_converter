import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demos")({
  beforeLoad: () => {
    throw redirect({ to: "/contact", search: { intent: "demo" } });
  },
  component: function DemosRedirect() {
    return null;
  },
});
