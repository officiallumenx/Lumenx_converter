import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherClassesPage } from "@/teacher-portal";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/classes")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "My Classes — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ClassesRoute />
    </AppShell>
  ),
});

function ClassesRoute() {
  const { role } = useApp();
  const { id } = Route.useSearch();
  if (role !== "teacher") {
    return (
      <div className="py-12 text-center text-muted-foreground">
        This page is available in the Teacher portal.
      </div>
    );
  }
  return <TeacherClassesPage selectedId={id} />;
}
