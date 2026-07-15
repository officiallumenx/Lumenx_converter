import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivitySportsPage } from "@/activity-workspace";

const searchSchema = z.object({
  section: z.string().optional(),
  team: z.string().optional(),
});

export const Route = createFileRoute("/activity/sports")({
  validateSearch: (search) => {
    const parsed = searchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  head: () => ({ meta: [{ title: "Sports — Activity Portal" }] }),
  component: ActivitySportsPage,
});

export type ActivitySportsSearch = z.infer<typeof searchSchema>;
