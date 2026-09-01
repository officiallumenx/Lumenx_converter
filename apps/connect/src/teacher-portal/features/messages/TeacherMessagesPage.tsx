import { useMemo } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { MessageSquare } from "lucide-react";

/**
 * Teacher messages — API inbox with class group compose, or demo placeholder.
 */
export function TeacherMessagesPage() {
  const { user, activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const apiMode = isApiAuthMode();

  const classSectionOptions = useMemo(
    () =>
      portal.classes.map((c) => ({
        classLabel: c.className,
        sectionLabel: c.section,
        label: `${c.className} ${c.section}`,
      })),
    [portal.classes],
  );

  if (!apiMode) {
    return (
      <div className="min-w-0 max-w-full">
        <PageHeader
          title="Messages"
          subtitle="Switch to API auth mode to use live institute messaging."
        />
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Demo messaging has been replaced by the institute API inbox. Sign in with API auth to
            read and send real threads.
          </p>
        </div>
      </div>
    );
  }

  if (!activeInstituteId || !user?.id) {
    return (
      <div className="min-w-0 max-w-full">
        <PageHeader title="Messages" subtitle="Loading session…" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Messages"
        subtitle="Direct messages and class group threads with parents and students"
      />
      <MessagesInbox
        instituteId={activeInstituteId}
        currentUserId={user.id}
        canComposeGroup
        classSectionOptions={classSectionOptions}
      />
    </div>
  );
}
