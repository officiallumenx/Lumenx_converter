import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { InstituteDirectoryPage } from "@/admissions-portal";

const searchSchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/admissions/institutes/")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Institutes — Admissions" }] }),
  component: InstitutesRoute,
});

function InstitutesRoute() {
  const { state, city } = Route.useSearch();
  return <InstituteDirectoryPage initialState={state} initialCity={city} />;
}
