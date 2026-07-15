import { Link } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";
import { Sparkles, MessageSquare, Bell } from "lucide-react";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { ActivityNotificationCard } from "@/activity-workspace/shared/ui/ActivityNotificationCard";
import { ActivityModuleGrid } from "./ActivityModuleGrid";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Activity Coordinator home — modules + activity-only messages & notifications. */
export function ActivityDashboardPage() {
  const teacherPortal = useTeacherPortal();
  const comms = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  const notifications = useMemo(
    () => comms.filter((i) => i.kind === "notification"),
    [comms],
  );
  const unreadNotifications = notifications.filter((i) => i.unread);
  const unreadMessages = comms.filter((i) => i.kind === "message" && i.unread).length;

  if (!teacherPortal.isTeacher) return null;

  const coordinatorName = teacherPortal.profile?.name?.split(" ")[0] ?? "Coordinator";

  const markRead = (id: string) => {
    void workspaceCommunicationRepository.markRead(id);
  };

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow md:p-8">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
          <div className="min-w-0">
            <p className="activity-stat-label opacity-80">{getGreeting()}</p>
            <h1 className="font-display mt-1 text-xl font-semibold sm:text-2xl md:text-3xl">
              {coordinatorName}, Activity Coordinator
            </h1>
            <p className="mt-2 max-w-lg text-xs opacity-85 sm:text-sm">
              Sports, extra-curricular, attendance, and team communication — one workspace.
              Messages and notifications here are for this role only.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <Link
          to={`${ACTIVITY_WORKSPACE_BASE}/messages`}
          className="activity-list-row flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm shadow-soft"
        >
          <MessageSquare className="size-4 text-primary" aria-hidden />
          <span>
            <span className="font-medium">{unreadMessages}</span> unread messages
          </span>
        </Link>
        <Link
          to={`${ACTIVITY_WORKSPACE_BASE}/notifications`}
          className="activity-list-row flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm shadow-soft"
        >
          <Bell className="size-4 text-primary" aria-hidden />
          <span>
            <span className="font-medium">{unreadNotifications.length}</span> unread notifications
          </span>
        </Link>
      </div>

      <section>
        <h2 className="activity-stat-label mb-3">Modules</h2>
        <ActivityModuleGrid />
      </section>

      <section className="activity-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Recent notifications</h2>
          <Link
            to={`${ACTIVITY_WORKSPACE_BASE}/notifications`}
            className="activity-section-link whitespace-nowrap"
          >
            View all
          </Link>
        </div>
        {unreadNotifications.length ? (
          <ul className="space-y-2">
            {unreadNotifications.slice(0, 3).map((n) => (
              <ActivityNotificationCard
                key={n.id}
                notification={{
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  category: "reminder",
                  timeAgo: new Date(n.sentAt).toLocaleDateString("en-IN"),
                  unread: Boolean(n.unread),
                }}
                onMarkRead={markRead}
              />
            ))}
          </ul>
        ) : (
          <p className="activity-empty-state py-6 text-sm">No unread activity notifications.</p>
        )}
      </section>
    </div>
  );
}
