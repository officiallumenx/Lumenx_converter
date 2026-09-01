import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { TeacherMessagesPage } from "@/teacher-portal";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <MessagesPage />
    </AppShell>
  ),
});

function MessagesPage() {
  const { role, user, activeInstituteId, activeChildId } = useApp();
  const portal = useParentPortal();
  const studentPortal = useStudentPortal();
  const apiMode = isApiAuthMode();

  if (role === "teacher") {
    return <TeacherMessagesPage />;
  }

  if (apiMode && user?.id && activeInstituteId && isInstituteUuid(activeInstituteId)) {
    const studentId =
      role === "parent" && portal.isParent
        ? activeChildId
        : role === "student" && studentPortal.isStudent
          ? studentPortal.snapshot?.profile.id
          : null;

    return (
      <div className="min-w-0 max-w-full">
        <PageHeader
          title="Messages"
          subtitle={
            role === "parent"
              ? "Message teachers in context of your selected child."
              : "Message your teachers and school staff."
          }
        />
        <MessagesInbox
          instituteId={activeInstituteId}
          currentUserId={user.id}
          studentId={studentId}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Messages"
        subtitle="Sign in with API auth to use live institute messaging."
      />
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Demo compose flow has been replaced by the institute API inbox. Use API auth mode to send
        and receive real message threads.
      </div>
    </div>
  );
}
