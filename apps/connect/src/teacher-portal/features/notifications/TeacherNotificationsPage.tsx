import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { teacherRepository } from "@/lib/teacher/repositories";
import { NotificationCard } from "@/teacher-portal/shared/ui/NotificationCard";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { Button, cn } from "@lumenx/ui";
import { Bell, CheckCheck } from "lucide-react";
import type { TeacherNotification } from "@/lib/teacher/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "urgent", label: "🚨 Urgent" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "exam_updates", label: "Exams" },
  { id: "messages", label: "Messages" },
  { id: "system", label: "System" },
  { id: "staff_notices", label: "Staff notices" },
] as const;

export function TeacherNotificationsPage() {
  const [items, setItems] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const load = () => {
    setLoading(true);
    teacherRepository.getNotifications().then((n) => {
      setItems(n);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // Reflect notifications added/changed elsewhere (announcements, mark-all-read, etc.)
    // without a full skeleton reload.
    const unsub = teacherRepository.subscribeNotifications(() => {
      teacherRepository.getNotifications().then(setItems);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((n) => n.category === filter);
  }, [items, filter]);

  const unread = items.filter((n) => n.unread).length;

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void teacherRepository.markNotificationRead(id);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    await teacherRepository.markAllNotificationsRead();
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread · Announcements, events, exams & staff notices`}
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

      {loading ? (
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
          description="You're all caught up in this category."
        />
      )}
    </div>
  );
}
