import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivityExtraCurricularPage } from "@/activity-workspace";

const searchSchema = z.object({
  activity: z.string().optional(),
  group: z.string().optional(),
});

export const Route = createFileRoute("/activity/extra-curricular")({
  validateSearch: (search) => {
    const parsed = searchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  head: () => ({ meta: [{ title: "Extra-Curricular — Activity Coordinator" }] }),
  component: ActivityExtraCurricularPage,
});

export type ActivityEcaSearch = z.infer<typeof searchSchema>;
