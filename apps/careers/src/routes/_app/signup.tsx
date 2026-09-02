import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RedirectIfAuthed } from "@/careers-portal/core/guards";
import { SignupFlow } from "@/careers-portal/features/auth/AuthFlows";
import type { CareersAccountType } from "@/lib/careers/types";

const searchSchema = z.object({
  type: z.enum(["job_seeker", "recruiter"]).optional(),
});

export const Route = createFileRoute("/_app/signup")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign up — Careers" }] }),
  component: SignupRoute,
});

function SignupRoute() {
  const { type } = Route.useSearch();
  const initialAccountType: CareersAccountType | undefined =
    type === "recruiter" ? "recruiter" : type === "job_seeker" ? "job_seeker" : undefined;
  return (
    <RedirectIfAuthed>
      <SignupFlow initialAccountType={initialAccountType} />
    </RedirectIfAuthed>
  );
}
