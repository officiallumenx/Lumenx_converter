import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { NotificationCategory } from "@lumenx/types";
import {
  ALERT_ROW_CLASS,
  isAlertPresentationPayload,
} from "@lumenx/notifications";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  IconButton,
  Modal,
  Pill,
  SearchInput,
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
} from "@/lib/notification-center-store";
import type { NotificationInboxListItem } from "@/lib/notification-inbox";
import {
  deleteInboxItem,
  updateInboxItem,
  markAllInboxRead,
  optimisticMarkNotificationRead,
  optimisticMarkAllNotificationsRead,
  refreshAdminNotificationsQuery,
} from "@/lib/notification-inbox";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdminToast } from "@/components/AdminActionToast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  notificationIconChipClass,
  notificationTypeIcon,
} from "@/lib/notification-presentation";

const CATEGORY_OPTIONS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  ...(Object.keys(ADMIN_NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[]).map((c) => ({
    value: c,
    label: ADMIN_NOTIFICATION_CATEGORY_LABELS[c],
  })),
];

type InboxRow = AdminNotification | NotificationInboxListItem;

function isInboxAlertRow(n: InboxRow): boolean {
  if (n.priority === "high") return true;
  if ("payload" in n && n.payload) {
    return isAlertPresentationPayload(n.payload);
  }
  return false;
}

function TypeIcon({
  type,
  category,
}: {
  type: InboxRow["type"];
  category: NotificationCategory;
}) {
  const Icon = notificationTypeIcon(type, category);
  return <Icon className="size-4" />;
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
  instituteId = null,
}: {
  items: InboxRow[];
  onChange: () => void;
  writesEnabled?: boolean;
  rowsValid?: boolean;
  listHint?: string | null;
  instituteResetKey?: string | null;
  instituteId?: string | null;
}) {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiMode = isApiAuthMode();
  const [date, setDate] = useState<NotificationDateFilter>("all");
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InboxRow | null>(null);

  useEffect(() => {
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
        read: "all",
        category,
        date,
        query,
      }),
    [items, category, date, query],
  );

  const markRead = async (id: string) => {
    if (apiMode) {
      if (instituteId) {
        optimisticMarkNotificationRead(queryClient, instituteId, id);
      }
      try {
        await updateInboxItem(id, { read: true });
      } catch (err) {
        if (instituteId) {
          await refreshAdminNotificationsQuery(queryClient, instituteId);
        }
        throw err;
      }
      return;
    }
    markAdminNotificationRead(id);
    onChange();
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

  const markAllRead = () => {
    if (apiMode) {
      if (instituteId) {
        optimisticMarkAllNotificationsRead(queryClient, instituteId);
      }
      const run = instituteId
        ? markAllInboxRead(instituteId)
        : Promise.all(
            items.filter((n) => n.unread).map((n) => updateInboxItem(n.id, { read: true })),
          );
      void run
        .then(() => {
          notify("All notifications marked read");
        })
        .catch(async (err) => {
          if (instituteId) {
            await refreshAdminNotificationsQuery(queryClient, instituteId);
          } else {
            onChange();
          }
          notify(
            err instanceof Error ? err.message : "Failed to mark notifications read",
          );
        });
      return;
    }
    markAllAdminNotificationsRead();
    onChange();
    notify("All notifications marked read");
  };

  const deleteAll = () => {
    if (!window.confirm("Delete all notifications from the center?")) return;
    if (apiMode) {
      void Promise.all(items.map((n) => deleteInboxItem(n.id)))
        .then(() => {
          setSelected(null);
          onChange();
          notify("All notifications deleted");
        })
        .catch(async (err) => {
          if (instituteId) {
            await refreshAdminNotificationsQuery(queryClient, instituteId);
          } else {
            onChange();
          }
          notify(
            err instanceof Error ? err.message : "Failed to delete notifications",
          );
        });
      return;
    }
    deleteAllAdminNotifications();
    setSelected(null);
    onChange();
    notify("All notifications deleted");
  };

  return (
    <div className="space-y-2">
      <Card>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 border-b border-border/60">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Inbox</h3>
          {writesEnabled ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={unreadCount === 0}
                onClick={markAllRead}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </Button>
              <IconButton
                label="Delete all"
                size="sm"
                disabled={items.length === 0}
                onClick={deleteAll}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          ) : null}
        </div>
        <CardBody className="space-y-1.5 !pt-2 !pb-2.5">
          <SearchInput
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={date}
              onChange={(e) => setDate(e.target.value as NotificationDateFilter)}
              aria-label="Date range"
            >
              <option value="all">Any date</option>
              <option value="today">Today</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </Select>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCategory | "all")}
              aria-label="Category"
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
                      className={`mt-0.5 size-9 shrink-0 rounded-lg border flex items-center justify-center ${notificationIconChipClass(n)}`}
                      aria-hidden
                    >
                      <TypeIcon type={n.type} category={n.category} />
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
                        .catch(async (err) => {
                          if (instituteId) {
                            await refreshAdminNotificationsQuery(queryClient, instituteId);
                          }
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
