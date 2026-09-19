import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseDemoSearch } from "@/lib/search";

export const Route = createFileRoute("/demo")({
  validateSearch: parseDemoSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/resources/demo",
      search,
    });
  },
  component: function DemoRedirect() {
    return null;
  },
});
