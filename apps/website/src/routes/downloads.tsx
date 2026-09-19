import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseDownloadsSearch } from "@/lib/search";

export const Route = createFileRoute("/downloads")({
  validateSearch: parseDownloadsSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/resources/downloads",
      search,
    });
  },
  component: function DownloadsRedirect() {
    return null;
  },
});
