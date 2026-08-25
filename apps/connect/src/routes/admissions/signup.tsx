import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { RedirectIfAuthed } from "@/admissions-portal/core/guards";
import {
  InstituteSignupFlow,
  ParentSignupFlow,
} from "@/admissions-portal/features/auth/AuthFlows";

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
  if (!type) {
    return <Navigate to="/admissions/login" replace />;
  }
  return (
    <RedirectIfAuthed>
      {type === "institute" ? <InstituteSignupFlow /> : <ParentSignupFlow />}
    </RedirectIfAuthed>
  );
}
