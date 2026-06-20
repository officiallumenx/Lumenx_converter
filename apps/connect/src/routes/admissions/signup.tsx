import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RedirectIfAuthed } from "@/admissions-portal/core/guards";
import { SignupFlow } from "@/admissions-portal/features/auth/AuthFlows";
import type { AdmissionsAccountType } from "@/lib/admissions/types";

const searchSchema = z.object({
  type: z.enum(["parent", "institute"]).optional(),
});

export const Route = createFileRoute("/admissions/signup")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign up — Admissions" }] }),
  component: SignupRoute,
});

function SignupRoute() {
  const { type } = Route.useSearch();
  const accountType: AdmissionsAccountType = type === "institute" ? "institute_admin" : "parent";
  return (
    <RedirectIfAuthed>
      <SignupFlow accountType={accountType} />
    </RedirectIfAuthed>
  );
}
