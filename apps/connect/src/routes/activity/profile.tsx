import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivityProfilePage } from "@/activity-workspace";

const searchSchema = z.object({
  section: z.enum(["support", "help", "feedback", "report"]).optional(),
});

export const Route = createFileRoute("/activity/profile")({
  validateSearch: (search) => {
    const parsed = searchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  head: () => ({ meta: [{ title: "Settings — Activity Coordinator" }] }),
  component: ActivityProfileRoute,
});

function ActivityProfileRoute() {
  const { section } = Route.useSearch();
  return <ActivityProfilePage initialSection={section} />;
}
