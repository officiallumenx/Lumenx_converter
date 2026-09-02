import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { NotificationCategory } from "@lumenx/types";
import {
  ALERT_ICON_CHIP_CLASS,
  ALERT_ROW_CLASS,
  isAlertPresentationPayload,
} from "@lumenx/notifications";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Modal,
  Pill,
  SearchInput,
  SegmentedControl,
  Select,
} from "@lumenx/ui-admin";
import {
  ADMIN_NOTIFICATION_CATEGORY_LABELS,
  deleteAdminNotification,
  deleteAllAdminNotifications,
  filterAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type NotificationDateFilter,
  type NotificationReadFilter,
} from "@/lib/notification-center-store";
import type { NotificationInboxListItem } from "@/lib/notification-inbox";
import {
  deleteInboxItem,
  updateInboxItem,
} from "@/lib/notification-inbox/mutations";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ExternalLink,
  Info,
  Sparkles,
  Trash2,
} from "lucide-react";

const CATEGORY_OPTIONS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  ...(Object.keys(ADMIN_NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[]).map((c) => ({
    value: c,
    label: ADMIN_NOTIFICATION_CATEGORY_LABELS[c],
  })),
];

type InboxRow = AdminNotification | NotificationInboxListItem;

function isInboxAlertRow(n: InboxRow): boolean {
  if (n.category === "emergency") return true;
  if (n.priority === "high" && n.type === "warning") return true;
  if ("payload" in n && n.payload) {
    return isAlertPresentationPayload(n.payload);
  }
  return false;
}

function TypeIcon({ type }: { type: InboxRow["type"] }) {
  if (type === "warning") return <AlertTriangle className="size-4" />;
  if (type === "positive") return <Sparkles className="size-4" />;
  return <Info className="size-4" />;
}

function typeTone(type: InboxRow["type"]): "info" | "warning" | "success" {
  if (type === "warning") return "warning";
  if (type === "positive") return "success";
  return "info";
}

export function NotificationCenterInbox({
  items,
  onChange,
  writesEnabled = true,
  rowsValid = true,
  listHint = null,
  instituteResetKey = null,
}: {
  items: InboxRow[];
  onChange: () => void;
  writesEnabled?: boolean;
  rowsValid?: boolean;
  listHint?: string | null;
  instituteResetKey?: string | null;
}) {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const apiMode = isApiAuthMode();
  const [read, setRead] = useState<NotificationReadFilter>("all");
  const [date, setDate] = useState<NotificationDateFilter>("all");
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InboxRow | null>(null);

  useEffect(() => {
    setRead("all");
    setDate("all");
    setCategory("all");
    setQuery("");
    setSelected(null);
  }, [instituteResetKey]);

  const unreadCount = useMemo(
    () => items.filter((n) => n.unread).length,
    [items],
  );

  const filtered = useMemo(
    () =>
      filterAdminNotifications(items as AdminNotification[], {
        read,
        category,
        date,
        query,
      }),
    [items, read, category, date, query],
  );

  const countLabel = (count: number) =>
    !rowsValid ? "…" : String(count);

  const markRead = (id: string) => {
    if (apiMode) {
      return updateInboxItem(id, { read: true }).then(() => onChange());
    }
    markAdminNotificationRead(id);
    onChange();
    return Promise.resolve();
  };

  const openDetails = (n: InboxRow) => {
    if (!writesEnabled) {
      setSelected(n);
      return;
    }
    if (n.unread) {
      void markRead(n.id).catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to mark read");
      });
    }
    setSelected(n.unread ? { ...n, unread: false } : n);
  };

  const openDeepLink = (n: InboxRow) => {
    if (!writesEnabled) {
      if (n.href) {
        setSelected(null);
        void navigate({ to: n.href as "/" });
      }
      return;
    }
    if (n.unread) {
      void markRead(n.id).catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to mark read");
      });
    }
    if (n.href) {
      setSelected(null);
      void navigate({ to: n.href as "/" });
    }
  };

  if (!rowsValid) {
    return (
      <Card className="p-5">
        <div className="py-12 text-sm text-muted-foreground text-center">
          {listHint ?? "Loading notifications…"}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Inbox"
          hint={`${countLabel(unreadCount)} unread · ${countLabel(items.length)} total · shared notification templates`}
          action={
            writesEnabled ? (
              <div className="flex flex-wrap gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unreadCount === 0}
                  onClick={() => {
                    if (apiMode) {
                      const unread = items.filter((n) => n.unread);
                      void Promise.all(
                        unread.map((n) => updateInboxItem(n.id, { read: true })),
                      )
                        .then(() => {
                          onChange();
                          notify("All notifications marked read");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error
                              ? err.message
                              : "Failed to mark notifications read",
                          );
                        });
                      return;
                    }
                    markAllAdminNotificationsRead();
                    onChange();
                    notify("All notifications marked read");
                  }}
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={items.length === 0}
                  onClick={() => {
                    if (!window.confirm("Delete all notifications from the center?")) return;
                    if (apiMode) {
                      void Promise.all(items.map((n) => deleteInboxItem(n.id)))
                        .then(() => {
                          setSelected(null);
                          onChange();
                          notify("All notifications deleted");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error
                              ? err.message
                              : "Failed to delete notifications",
                          );
                        });
                      return;
                    }
                    deleteAllAdminNotifications();
                    setSelected(null);
                    onChange();
                    notify("All notifications deleted");
                  }}
                >
                  <Trash2 className="size-3.5" /> Delete all
                </Button>
              </div>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              value={read}
              onChange={setRead}
              options={[
                { value: "all", label: "All" },
                {
                  value: "unread",
                  label: `Unread (${countLabel(unreadCount)})`,
                },
                { value: "read", label: "Read" },
              ]}
            />
            <SegmentedControl
              value={date}
              onChange={setDate}
              options={[
                { value: "all", label: "Any date" },
                { value: "today", label: "Today" },
                { value: "7d", label: "7 days" },
                { value: "30d", label: "30 days" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchInput
              placeholder="Search title, body, template…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCategory | "all")}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Bell className="size-5" />}
              title={items.length === 0 ? "No notifications" : "No matches"}
              hint={
                items.length === 0
                  ? listHint ?? "New ops alerts will appear here."
                  : "Try another category, date range, or search."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((n) => {
                const isAlert = isInboxAlertRow(n);
                return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openDetails(n)}
                    className={`w-full text-left px-4 sm:px-5 py-3.5 hover:bg-muted/40 transition-colors flex gap-3 ${
                      isAlert
                        ? ALERT_ROW_CLASS
                        : n.unread
                          ? "bg-primary/[0.03]"
                          : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 size-9 shrink-0 rounded-lg border flex items-center justify-center ${
                        isAlert
                          ? ALERT_ICON_CHIP_CLASS
                          : n.type === "warning"
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
                          : n.type === "positive"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                      aria-hidden
                    >
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.unread ? (
                          <span
                            className={`size-1.5 rounded-full shrink-0 ${
                              isAlert ? "bg-destructive" : "bg-primary"
                            }`}
                            aria-label="Unread"
                          />
                        ) : null}
                        <span className={`text-sm ${n.unread ? "font-semibold" : "font-medium"} ${isAlert ? "text-destructive" : ""}`}>
                          {n.title}
                        </span>
                        <Pill tone={isAlert ? "danger" : typeTone(n.type)}>
                          {isAlert ? "Alert" : ADMIN_NOTIFICATION_CATEGORY_LABELS[n.category]}
                        </Pill>
                        {n.priority === "high" && !isAlert ? <Pill tone="warning">High</Pill> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.desc}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>{n.time}</span>
                        {n.templateId ? (
                          <span className="font-mono truncate max-w-[16rem]">{n.templateId}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Notification"}
        subtitle={
          selected
            ? `${ADMIN_NOTIFICATION_CATEGORY_LABELS[selected.category]} · ${selected.time}`
            : undefined
        }
        size="md"
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {writesEnabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (apiMode) {
                      void deleteInboxItem(selected.id)
                        .then(() => {
                          setSelected(null);
                          onChange();
                          notify("Notification deleted");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error
                              ? err.message
                              : "Failed to delete notification",
                          );
                        });
                      return;
                    }
                    deleteAdminNotification(selected.id);
                    setSelected(null);
                    onChange();
                    notify("Notification deleted");
                  }}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              ) : null}
              {selected.href ? (
                <Button size="sm" variant="primary" onClick={() => openDeepLink(selected)}>
                  <ExternalLink className="size-3.5" /> Open linked page
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selected.detail ?? selected.desc}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{selected.unread ? "Unread" : "Read"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{selected.priority ?? "normal"}</dd>
              </div>
              {selected.templateId ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Template</dt>
                  <dd className="font-mono text-[11px] break-all">{selected.templateId}</dd>
                </div>
              ) : null}
              {selected.href ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Deep link</dt>
                  <dd className="font-mono text-[11px]">{selected.href}</dd>
                </div>
              ) : null}
              {selected.createdAt ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {new Date(selected.createdAt).toLocaleString("en-IN")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
