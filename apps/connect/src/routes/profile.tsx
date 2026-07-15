import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";

const ParentProfilePage = lazy(() =>
  import("@/parent-portal/features/profile/ParentProfilePage").then((m) => ({
    default: m.ParentProfilePage,
  })),
);
const TeacherProfilePage = lazy(() =>
  import("@/teacher-portal/features/profile/TeacherProfilePage").then((m) => ({
    default: m.TeacherProfilePage,
  })),
);
const StudentProfilePage = lazy(() =>
  import("@/student-portal/features/profile/StudentProfilePage").then((m) => ({
    default: m.StudentProfilePage,
  })),
);

const searchSchema = z.object({
  section: z.enum(["support"]).optional(),
});

function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4 pb-2">
      <div className="settings-loading-block h-8 w-40 rounded-lg" />
      <div className="settings-loading-block h-48 rounded-2xl" />
      <div className="settings-loading-block h-36 rounded-2xl" />
    </div>
  );
}

export const Route = createFileRoute("/profile")({
  validateSearch: (search) => {
    const parsed = searchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  head: () => ({ meta: [{ title: "Settings — LumenX Connect" }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <AppShell>
      <ProfilePage />
    </AppShell>
  );
}

function ProfilePage() {
  const { section } = Route.useSearch();
  const { role } = useApp();

  return (
    <Suspense fallback={<ProfileLoading />}>
      {role === "teacher" && <TeacherProfilePage initialSection={section} />}
      {role === "student" && <StudentProfilePage initialSection={section} />}
      {role === "parent" && <ParentProfilePage initialSection={section} />}
      {role !== "teacher" && role !== "student" && role !== "parent" && <ProfileLoading />}
    </Suspense>
  );
}
