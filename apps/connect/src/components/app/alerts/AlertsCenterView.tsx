import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import type { AlertCategory, AlertSeverity, SchoolAlert } from "@lumenx/types";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from "@lumenx/ui";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  MessageSquareWarning,
  ShieldAlert,
  UserX,
  Zap,
  CalendarOff,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_LABELS,
  alertsForChild,
  countEmergency,
  countUnacknowledged,
  filterAlerts,
  sortAlerts,
  type AlertFilterId,
} from "@/lib/alerts-utils";
import { alertStore } from "@/lib/alert-store";

const CATEGORY_ICONS: Record<AlertCategory, typeof HeartPulse> = {
  absence: UserX,
  health: HeartPulse,
  remark: MessageSquareWarning,
  safety: ShieldAlert,
  attendance: ClipboardList,
  leave: CalendarOff,
  general: BellRing,
};

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { stripe: string; badge: string; ring: string; label: string }
> = {
  emergency: {
    stripe: "bg-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    ring: "border-destructive/40",
    label: "Act immediately",
  },
  mandatory: {
    stripe: "bg-warning",
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    ring: "border-warning/35",
    label: "Acknowledge within 24h",
  },
};

const FILTERS: { id: AlertFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "emergency", label: "Emergency" },
  { id: "mandatory", label: "Mandatory" },
  { id: "absence", label: "Absence" },
  { id: "health", label: "Health" },
  { id: "remark", label: "Remarks" },
  { id: "leave", label: "Leave" },
];

function WorkflowStrip() {
  const steps = [
    { n: 1, title: "School sends alert", desc: "Absence, health, or urgent remark" },
    { n: 2, title: "You review details", desc: "Open the alert to read full context" },
    { n: 3, title: "Acknowledge & act", desc: "Emergency → act now · Mandatory → confirm within 24h" },
  ];

  return (
    <div className="mb-5 rounded-2xl border border-border bg-muted/20 p-4 md:p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        How alerts work
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="flex min-w-0 gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCards({ alerts }: { alerts: SchoolAlert[] }) {
  const emergency = countEmergency(alerts);
  const pending = countUnacknowledged(alerts);
  const mandatory = alerts.filter((a) => a.severity === "mandatory" && !a.acknowledged).length;
  const done = alerts.filter((a) => a.acknowledged).length;

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <Zap className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Emergency</span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums">{emergency}</p>
        <p className="text-xs text-muted-foreground">Need immediate action</p>
      </div>
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-center gap-2 text-warning-foreground">
          <AlertTriangle className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Mandatory</span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums">{mandatory}</p>
        <p className="text-xs text-muted-foreground">Acknowledge within 24h</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BellRing className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Pending</span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums">{pending}</p>
        <p className="text-xs text-muted-foreground">Awaiting your response</p>
      </div>
      <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Done</span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums">{done}</p>
        <p className="text-xs text-muted-foreground">Acknowledged</p>
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onOpen,
}: {
  alert: SchoolAlert;
  onOpen: (a: SchoolAlert) => void;
}) {
  const sev = SEVERITY_STYLES[alert.severity];
  const CatIcon = CATEGORY_ICONS[alert.category];

  return (
    <button
      type="button"
      onClick={() => onOpen(alert)}
      className={cn(
        "group flex min-w-0 w-full items-stretch gap-0 overflow-hidden rounded-2xl border bg-card text-left shadow-soft transition-colors",
        !alert.acknowledged ? sev.ring : "border-border",
        alert.unread && !alert.acknowledged && "ring-1 ring-primary/20",
        "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <div className={cn("w-1.5 shrink-0", sev.stripe)} aria-hidden />
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px] font-semibold", sev.badge)}>
            {ALERT_SEVERITY_LABELS[alert.severity]}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <CatIcon className="size-3" />
            {ALERT_CATEGORY_LABELS[alert.category]}
          </Badge>
          {alert.acknowledged && (
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
              Acknowledged
            </Badge>
          )}
          {alert.actionRequired && !alert.acknowledged && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              Action required
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold leading-snug line-clamp-2">{alert.title}</p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{alert.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span>{alert.time}</span>
          <span>·</span>
          <span>{alert.source}</span>
          {alert.childName && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground/80">{alert.childName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center pr-3 text-muted-foreground">
        <ChevronRight className="size-4 opacity-50 group-hover:opacity-100" />
      </div>
    </button>
  );
}

function AlertDetailDialog({
  alert,
  open,
  onOpenChange,
  onAcknowledge,
}: {
  alert: SchoolAlert | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAcknowledge: (id: string) => void;
}) {
  if (!alert) return null;
  const sev = SEVERITY_STYLES[alert.severity];
  const CatIcon = CATEGORY_ICONS[alert.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className={cn("h-1.5 w-full", sev.stripe)} />
        <div className="p-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn("font-semibold", sev.badge)}>
                {ALERT_SEVERITY_LABELS[alert.severity]}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CatIcon className="size-3" />
                {ALERT_CATEGORY_LABELS[alert.category]}
              </Badge>
            </div>
            <DialogTitle className="text-lg leading-snug">{alert.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{sev.label}</p>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-foreground/90">{alert.detail}</p>
            <dl className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="font-medium text-right">{alert.time}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">From</dt>
                <dd className="font-medium text-right">{alert.source}</dd>
              </div>
              {alert.childName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Learner</dt>
                  <dd className="font-medium text-right">{alert.childName}</dd>
                </div>
              )}
            </dl>
            {!alert.acknowledged && (
              <Button
                className="w-full"
                onClick={() => {
                  onAcknowledge(alert.id);
                  onOpenChange(false);
                }}
              >
                {alert.actionLabel ?? "Acknowledge alert"}
              </Button>
            )}
            {alert.acknowledged && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/5 py-3 text-sm text-success">
                <CheckCircle2 className="size-4" />
                You acknowledged this alert
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type AlertsCenterProps = {
  /** Parent multi-child filter; omit for student view. */
  childId?: string;
  showChildSwitcher?: boolean;
  subtitle?: string;
};

export function AlertsCenterView({
  childId,
  showChildSwitcher = false,
  subtitle,
}: AlertsCenterProps) {
  const alerts = useSyncExternalStore(alertStore.subscribe, alertStore.getItems, alertStore.getItems);
  const [filter, setFilter] = useState<AlertFilterId>("all");
  const [selected, setSelected] = useState<SchoolAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const scoped = useMemo(
    () => sortAlerts(alertsForChild(alerts, childId)),
    [alerts, childId],
  );
  const list = useMemo(() => filterAlerts(scoped, filter), [scoped, filter]);

  const counts = useMemo(() => {
    const map: Partial<Record<AlertFilterId, number>> = { all: scoped.length };
    for (const a of scoped) {
      map[a.severity] = (map[a.severity] ?? 0) + 1;
      map[a.category] = (map[a.category] ?? 0) + 1;
    }
    return map;
  }, [scoped]);

  const pending = countUnacknowledged(scoped);

  const openAlert = (a: SchoolAlert) => {
    setSelected(a);
    setDialogOpen(true);
  };

  return (
    <div className="min-w-0 max-w-full">
      {showChildSwitcher && <div className="mb-4"><ChildSwitcher /></div>}

      <PageHeader
        title="Alerts"
        subtitle={
          subtitle ??
          (pending > 0
            ? `${pending} pending · Emergency alerts need immediate action`
            : "All alerts acknowledged")
        }
        action={
          pending > 0 ? (
            <Button variant="outline" size="sm" onClick={() => alertStore.acknowledgeAll()}>
              Acknowledge all
            </Button>
          ) : undefined
        }
      />

      <WorkflowStrip />
      <SummaryCards alerts={scoped} />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = counts[f.id] ?? 0;
          if (n === 0 && f.id !== "all") return null;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-8 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 py-px text-[10px]",
                  active ? "bg-white/25" : "bg-muted text-foreground/70",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success/70" />
            <p className="mt-3 text-sm font-medium">No alerts in this view</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mandatory and emergency alerts from school will appear here.
            </p>
          </div>
        ) : (
          list.map((a) => <AlertCard key={a.id} alert={a} onOpen={openAlert} />)
        )}
      </div>

      <AlertDetailDialog
        alert={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAcknowledge={alertStore.acknowledge}
      />
    </div>
  );
}

/** Compact dashboard panel — top unacknowledged alerts. */
export function AlertsDashboardPanel({
  alerts,
  childId,
}: {
  alerts: SchoolAlert[];
  childId?: string;
}) {
  const scoped = useMemo(
    () => sortAlerts(alertsForChild(alerts, childId)).filter((a) => !a.acknowledged).slice(0, 4),
    [alerts, childId],
  );
  const emergency = countEmergency(alertsForChild(alerts, childId));

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col sm:p-5">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <h3 className="min-w-0 font-semibold leading-snug">Alerts</h3>
          {emergency > 0 && (
            <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
              {emergency} emergency
            </Badge>
          )}
        </div>
        <Link
          to="/alerts"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
        >
          Open alerts <ChevronRight className="size-3 shrink-0" />
        </Link>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {scoped.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No pending alerts.</p>
        ) : (
          scoped.map((a) => {
            const sev = SEVERITY_STYLES[a.severity];
            const CatIcon = CATEGORY_ICONS[a.category];
            return (
              <Link
                key={a.id}
                to="/alerts"
                className={cn(
                  "flex min-w-0 items-start gap-2.5 rounded-xl border p-3 transition-colors hover:bg-muted/30",
                  !a.acknowledged ? sev.ring : "border-border",
                )}
              >
                <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", sev.stripe)} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1">
                    <span className={cn("rounded px-1.5 py-px text-[9px] font-semibold uppercase", sev.badge)}>
                      {a.severity}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-px text-[9px] text-muted-foreground">
                      <CatIcon className="size-2.5" />
                      {ALERT_CATEGORY_LABELS[a.category]}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{a.summary}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{a.time}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export function useAlertStoreInit(seed: SchoolAlert[]) {
  useEffect(() => {
    alertStore.init(seed);
  }, [seed]);
}
