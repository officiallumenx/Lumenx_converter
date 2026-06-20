import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherProfilePage } from "@/teacher-portal";
import { StudentProfilePage } from "@/student-portal";
import { ParentProfilePage } from "@/parent-portal";

const searchSchema = z.object({
  section: z.enum(["support"]).optional(),
});

export const Route = createFileRoute("/profile")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Profile — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ProfilePage />
    </AppShell>
  ),
});

function ProfilePage() {
  const { section } = Route.useSearch();
  const { role } = useApp();

  if (role === "teacher") return <TeacherProfilePage initialSection={section} />;
  if (role === "student") return <StudentProfilePage initialSection={section} />;
  return <ParentProfilePage initialSection={section} />;
}
