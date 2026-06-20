import { useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Button, cn } from "@lumenx/ui";
import { CheckCheck } from "lucide-react";
import {
  studentNotificationStore,
  STUDENT_NOTIFICATION_FILTERS,
  filterStudentNotifications,
  type StudentNotificationFilterId,
} from "@/lib/student/notification-store";
import { NotificationList, PageSkeleton } from "@/student-portal/shared/ui";

export function StudentNotificationsPage() {
  const portal = useStudentPortal();
  const all = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getItems,
    studentNotificationStore.getItems,
  );
  const [filter, setFilter] = useState<StudentNotificationFilterId>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    for (const f of STUDENT_NOTIFICATION_FILTERS) {
      if (f.id === "all") continue;
      map[f.id] = filterStudentNotifications(all, f.id).length;
    }
    return map;
  }, [all]);

  if (!portal.isStudent) return null;
  if (portal.isLoading) return <PageSkeleton rows={6} />;

  const unread = all.filter((n) => n.unread).length;
  const list = filterStudentNotifications(all, filter);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => studentNotificationStore.markAllRead()}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {STUDENT_NOTIFICATION_FILTERS.map((c) => {
          const n = counts[c.id] ?? 0;
          const active = filter === c.id;
          if (n === 0 && c.id !== "all") return null;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "h-8 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40",
              )}
            >
              {c.label}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 py-px text-[10px]",
                  active ? "bg-white/25 text-primary-foreground" : "bg-muted text-foreground/70",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <NotificationList list={list} onSelect={(id) => studentNotificationStore.markRead(id)} />
    </div>
  );
}
