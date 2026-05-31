import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { categorizedNotifications } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Bell, Sparkles, AlertTriangle, Info, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { NotificationCategory } from "@/lib/types";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <NotificationsPage />
    </AppShell>
  ),
});

const CATEGORIES: { id: "all" | NotificationCategory; label: string }[] = [
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
  const portal = useParentPortal();
  const all =
    role === "parent" && portal.isParent && portal.snapshot
      ? portal.snapshot.notifications
      : categorizedNotifications[role ?? "student"];
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]["id"]>("all");

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
          role === "parent" && portal.isParent && portal.snapshot
            ? `For ${portal.snapshot.child.name} · ${unread} unread`
            : `Tailored for your ${role} portal • ${unread} unread`
        }
      />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {CATEGORIES.map((c) => {
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

      <div className="min-w-0 space-y-2">
        {list.map((n) => {
          const Icon =
            n.type === "warning" ? AlertTriangle : n.type === "positive" ? Sparkles : Info;
          const tone =
            n.type === "warning"
              ? "bg-warning/15 text-warning-foreground"
              : n.type === "positive"
                ? "bg-success/15 text-success"
                : "bg-primary/10 text-primary";
          return (
            <div
              key={n.id}
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-2xl border bg-card p-4 shadow-soft transition-colors sm:gap-3",
                n.unread ? "border-primary/40 bg-primary/[0.03]" : "border-border",
              )}
            >
              <div className={cn("size-10 shrink-0 rounded-xl grid place-items-center", tone)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="min-w-0 font-medium leading-snug break-words">{n.title}</span>
                  {n.unread && <span className="size-1.5 rounded-full bg-primary" />}
                  {n.priority === "high" && (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] gap-1 border-destructive/40 text-destructive"
                    >
                      <Flame className="size-3" /> High
                    </Badge>
                  )}
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                    {n.category}
                  </Badge>
                </div>
                <div className="mt-0.5 break-words text-sm leading-snug text-muted-foreground">
                  {n.desc}
                </div>
              </div>
              <div className="max-w-[4.25rem] shrink-0 self-start text-right text-[10px] leading-tight text-muted-foreground sm:max-w-[5rem] sm:text-xs">
                {n.time}
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No notifications in this category.
          </div>
        )}
      </div>
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Bell className="size-5 mx-auto mb-2 opacity-50" />
        Push, in-app, email & WhatsApp delivery enabled by default.
      </div>
    </div>
  );
}
