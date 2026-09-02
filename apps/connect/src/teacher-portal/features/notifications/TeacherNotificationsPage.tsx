import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { teacherRepository } from "@/lib/teacher/repositories";
import { NotificationCard } from "@/teacher-portal/shared/ui/NotificationCard";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { Button, cn } from "@lumenx/ui";
import { Bell, CheckCheck } from "lucide-react";
import type { TeacherNotification } from "@/lib/teacher/types";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useConnectApiInbox } from "@/hooks/use-connect-api-inbox";
import { appNotificationToTeacherNotification } from "@/lib/connect-inbox/map-teacher";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "important", label: "Important" },
  { id: "urgent", label: "Urgent" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "exam_updates", label: "Exams" },
  { id: "messages", label: "Messages" },
  { id: "system", label: "System" },
  { id: "staff_notices", label: "Staff notices" },
] as const;

export function TeacherNotificationsPage() {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const apiInbox = useConnectApiInbox(apiMode ? activeInstituteId : null);
  const [items, setItems] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(!apiMode);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const load = () => {
    if (apiMode) return;
    setLoading(true);
    teacherRepository.getNotifications().then((n) => {
      setItems(n);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (apiMode) return;
    load();
    const unsub = teacherRepository.subscribeNotifications(() => {
      teacherRepository.getNotifications().then(setItems);
    });
    return () => {
      void unsub();
    };
  }, [apiMode]);

  const apiItems = useMemo(
    () => apiInbox.items.map(appNotificationToTeacherNotification),
    [apiInbox.items],
  );
  const resolvedItems = apiMode ? apiItems : items;
  const resolvedLoading = apiMode ? apiInbox.loading : loading;

  const filtered = useMemo(() => {
    if (filter === "all") return resolvedItems;
    if (filter === "important") {
      return resolvedItems.filter((n) => n.category === "urgent" || n.category === "exam_updates");
    }
    return resolvedItems.filter((n) => n.category === filter);
  }, [resolvedItems, filter]);

  const unread = resolvedItems.filter((n) => n.unread).length;

  const markRead = (id: string) => {
    if (apiMode) {
      void apiInbox.markRead(id);
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void teacherRepository.markNotificationRead(id);
  };

  const markAllRead = async () => {
    if (apiMode) {
      await apiInbox.markAllRead();
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    await teacherRepository.markAllNotificationsRead();
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread · Subject Teacher · class announcements, exams & staff notices`}
        action={
          unread ? (
            <Button variant="outline" className="teacher-primary-action rounded-xl gap-2" onClick={markAllRead}>
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn("teacher-filter-chip", filter === f.id && "is-active")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {resolvedLoading ? (
        <PageSkeleton rows={5} />
      ) : filtered.length ? (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={markRead} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            apiMode && apiInbox.error
              ? apiInbox.error
              : "You're all caught up in this category."
          }
        />
      )}
    </div>
  );
}
