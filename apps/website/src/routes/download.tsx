import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseDownloadsSearch } from "@/lib/search";

export const Route = createFileRoute("/download")({
  validateSearch: parseDownloadsSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/downloads",
      search,
    });
  },
  component: function DownloadRedirect() {
    return null;
  },
});
