import { createFileRoute } from "@tanstack/react-router";
import { InstituteApplicationsBoardPage } from "@/admissions-portal/features/institute-admin/InstituteApplicationsBoardPage";

export const Route = createFileRoute("/_app/institute/applications/")({
  head: () => ({ meta: [{ title: "Applications — Institute" }] }),
  component: InstituteApplicationsBoardPage,
});
