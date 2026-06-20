import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherStudentDetailPage } from "@/teacher-portal";
import type { StudentReturnContext } from "@/lib/teacher/types";

const searchSchema = z.object({
  from: z.enum(["classes", "students"]).optional(),
  classId: z.string().optional(),
});

export const Route = createFileRoute("/students/$studentId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Student Profile — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <StudentDetailRoute />
    </AppShell>
  ),
});

function StudentDetailRoute() {
  const { role } = useApp();
  const { studentId } = Route.useParams();
  const search = Route.useSearch();

  if (role !== "teacher") {
    return (
      <div className="py-12 text-center text-muted-foreground">
        This page is available in the Teacher portal.
      </div>
    );
  }

  const returnTo: StudentReturnContext | undefined = search.from
    ? { from: search.from, classId: search.classId }
    : undefined;

  return <TeacherStudentDetailPage studentId={studentId} returnTo={returnTo} />;
}
