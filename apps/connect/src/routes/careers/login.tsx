import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RedirectIfAuthed } from "@/careers-portal/core/guards";
import { SignInFlow } from "@/careers-portal/features/auth/AuthFlows";

const searchSchema = z.object({
  redirect: z.string().optional(),
  job: z.string().optional(),
});

export const Route = createFileRoute("/careers/login")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Careers" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const search = Route.useSearch();
  return (
    <RedirectIfAuthed>
      <SignInFlow redirect={search.redirect} job={search.job} />
    </RedirectIfAuthed>
  );
}
