import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ConnectRoleGate } from "@/components/app/ConnectRoleGate";
import { TeacherClassesPage } from "@/teacher-portal";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/classes")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "My Classes — LumenX Connect" }] }),
  component: ClassesRoute,
});

function ClassesRoute() {
  const { id } = Route.useSearch();
  return (
    <ConnectRoleGate allow={["teacher"]}>
      <TeacherClassesPage selectedId={id} />
    </ConnectRoleGate>
  );
}
