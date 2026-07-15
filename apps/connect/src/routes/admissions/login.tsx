import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RedirectIfAuthed } from "@/admissions-portal/core/guards";
import { SignInFlow } from "@/admissions-portal/features/auth/AuthFlows";

const searchSchema = z.object({
  redirect: z.string().optional(),
  program: z.string().optional(),
  institute: z.string().optional(),
});

export const Route = createFileRoute("/admissions/login")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Admissions" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const search = Route.useSearch();
  return (
    <RedirectIfAuthed>
      <SignInFlow
        redirect={search.redirect}
        program={search.program}
        institute={search.institute}
      />
    </RedirectIfAuthed>
  );
}
