import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app/AppShell";

import { PageHeader } from "@/components/app/PageHeader";

import { useApp } from "@/lib/app-state";

import { useParentPortal } from "@/context/ParentPortalContext";

import { cn } from "@lumenx/ui";

import { useMemo, useState, useEffect, useSyncExternalStore } from "react";

import { Button } from "@lumenx/ui";

import { CheckCheck } from "lucide-react";

import { parentNotificationStore } from "@/lib/parent/notification-store";

import { TeacherNotificationsPage } from "@/teacher-portal";

import { StudentNotificationsPage, NotificationList } from "@/student-portal";

import type { NotificationCategory } from "@lumenx/types";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LumenX Connect" }] }),

  component: () => (
    <AppShell>
      <NotificationsPage />
    </AppShell>
  ),
});

const PARENT_CATEGORIES: { id: "all" | NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },

  { id: "academic", label: "Academic" },

  { id: "attendance", label: "Attendance" },

  { id: "assignments", label: "Assignments" },

  { id: "exams", label: "Exams" },

  { id: "fees", label: "Fees" },

  { id: "sports", label: "Sports" },

  { id: "events", label: "Events" },

  { id: "holidays", label: "Holidays" },

  { id: "circulars", label: "Circulars" },

  { id: "emergency", label: "Emergency" },
];

function NotificationsPage() {
  const { role } = useApp();

  if (role === "teacher") return <TeacherNotificationsPage />;

  if (role === "student") return <StudentNotificationsPage />;

  return <ParentNotifications />;
}

function ParentNotifications() {
  const portal = useParentPortal();
  const { activeChildId } = useApp();

  const snapshot = portal.isParent ? portal.snapshot : null;
  // Only sync when the loaded snapshot matches the active child, so a child switch never
  // keys the generic fallback notifications to the wrong child.
  const syncChildId =
    snapshot && snapshot.child.id === activeChildId ? snapshot.child.id : null;

  useEffect(() => {
    if (syncChildId && snapshot) {
      parentNotificationStore.syncForChild(syncChildId, snapshot.notifications);
    }
  }, [syncChildId, snapshot]);

  const all = useSyncExternalStore(
    parentNotificationStore.subscribe,
    parentNotificationStore.getItems,
    parentNotificationStore.getItems,
  );

  const [filter, setFilter] = useState<(typeof PARENT_CATEGORIES)[number]["id"]>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };

    for (const n of all) map[n.category] = (map[n.category] ?? 0) + 1;

    return map;
  }, [all]);

  const unread = all.filter((n) => n.unread).length;

  const list = filter === "all" ? all : all.filter((n) => n.category === filter);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Notifications"
        subtitle={
          portal.isParent && portal.snapshot
            ? `For ${portal.snapshot.child.name} · ${unread} unread`
            : `${unread} unread`
        }
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => parentNotificationStore.markAllRead()}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {PARENT_CATEGORIES.map((c) => {
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

      <NotificationList
        list={list}
        onSelect={(id) => parentNotificationStore.markRead(id)}
      />
    </div>
  );
}
