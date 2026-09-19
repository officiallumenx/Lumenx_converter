import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseDemoSearch } from "@/lib/search";

export const Route = createFileRoute("/demos")({
  validateSearch: parseDemoSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/resources/demo",
      search,
    });
  },
  component: function DemosRedirect() {
    return null;
  },
});
