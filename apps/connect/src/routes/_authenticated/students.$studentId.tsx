import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ConnectRoleGate } from "@/components/app/ConnectRoleGate";
import { TeacherStudentDetailPage } from "@/teacher-portal";
import type { StudentReturnContext } from "@/lib/teacher/types";

const searchSchema = z.object({
  from: z.enum(["classes", "students"]).optional(),
  classId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Student Profile — LumenX Connect" }] }),
  component: StudentDetailRoute,
});

function StudentDetailRoute() {
  const { studentId } = Route.useParams();
  const search = Route.useSearch();

  const returnTo: StudentReturnContext | undefined = search.from
    ? { from: search.from, classId: search.classId }
    : undefined;

  return (
    <ConnectRoleGate allow={["teacher"]}>
      <TeacherStudentDetailPage studentId={studentId} returnTo={returnTo} />
    </ConnectRoleGate>
  );
}
