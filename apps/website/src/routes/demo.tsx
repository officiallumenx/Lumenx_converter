import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    throw redirect({ to: "/contact", search: { intent: "demo" } });
  },
  component: function DemoRedirect() {
    return null;
  },
});
