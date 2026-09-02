import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { childProfile } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { TeacherAttendancePage } from "@/teacher-portal";
import { StudentAttendancePage } from "@/student-portal";
import { AttendanceOverview } from "@/components/app/attendance/AttendanceOverview";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AttendancePage />
    </AppShell>
  ),
});

function AttendancePage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAttendancePage />;
  return <ViewAttendance />;
}

function ViewAttendance() {
  const { role } = useApp();
  if (role === "student") return <StudentAttendancePage />;
  return <ParentAttendanceView />;
}

function ParentAttendanceView() {
  const portal = useParentPortal();

  if (portal.isParent && portal.isLoading && !portal.snapshot) {
    return (
      <>
        <PageHeader title="Attendance" subtitle="Loading attendance for your child…" />
      </>
    );
  }

  const snap = portal.isParent ? portal.snapshot : null;
  const child = snap?.child;
  const who = child?.name ?? childProfile.name;
  const classTag = snap?.classTag ?? `${childProfile.class}-${childProfile.section}`;
  const className = child?.className ?? childProfile.class;
  const section = child?.section ?? childProfile.section;
  const rollNo = child?.rollNo ?? childProfile.rollNo;
  const studentId = toAttendanceStudentId({
    id: child?.id ?? childProfile.id,
    classLabel: className,
    section,
    rollNo,
  });
  const sectionKey = attendanceSectionKey(className, section);

  return (
    <AttendanceOverview
      subtitle={`${who} · ${classTag}`}
      studentId={studentId}
      sectionKey={sectionKey}
      portalStudentId={isApiAuthMode() ? child?.id : undefined}
    />
  );
}
