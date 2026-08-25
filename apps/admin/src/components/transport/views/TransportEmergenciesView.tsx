import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageToolbar,
  Pill,
} from "@lumenx/ui-admin";
import {
  acknowledgeTransportEmergency,
  getActiveTransportEmergencyCount,
  isEmergencyOpen,
  listTransportEmergencies,
  notifyDriverSosAcknowledged,
  notifyDriverSosResolved,
  resolveTransportEmergency,
  subscribeTransportEmergencies,
  transportEmergencyStatusLabel,
  transportEmergencyTypeLabel,
  type TransportEmergency,
} from "@lumenx/utils";
import { CheckCircle2, Clock3, Hand, MapPin, Siren } from "lucide-react";
import { toast } from "sonner";

type Tab = "active" | "history";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusTone(status: TransportEmergency["status"]) {
  if (status === "resolved") return "success" as const;
  if (status === "acknowledged") return "warning" as const;
  return "danger" as const;
}

function useEmergencyList(): TransportEmergency[] {
  return useSyncExternalStore(
    subscribeTransportEmergencies,
    listTransportEmergencies,
    listTransportEmergencies,
  );
}

export function TransportEmergenciesView() {
  const emergencies = useEmergencyList();
  const [tab, setTab] = useState<Tab>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const active = useMemo(
    () => emergencies.filter((e) => isEmergencyOpen(e.status)),
    [emergencies],
  );
  const history = useMemo(
    () => emergencies.filter((e) => e.status === "resolved"),
    [emergencies],
  );

  const rows = tab === "active" ? active : history;
  const selected =
    emergencies.find((e) => e.id === selectedId) ??
    rows[0] ??
    null;

  const onAcknowledge = () => {
    if (!selected || selected.status !== "active") return;
    setAcknowledging(true);
    try {
      const next = acknowledgeTransportEmergency({
        id: selected.id,
        acknowledgedBy: "Admin",
        note: "Admin reviewing case",
      });
      if (next) {
        notifyDriverSosAcknowledged({
          emergencyId: next.id,
          note: "Admin is handling your SOS",
        });
        toast.success(`${next.id} acknowledged`);
        setSelectedId(next.id);
      } else {
        toast.error("Could not acknowledge emergency");
      }
    } finally {
      setAcknowledging(false);
    }
  };

  const onResolve = () => {
    if (!selected || !isEmergencyOpen(selected.status)) return;
    setResolving(true);
    try {
      const next = resolveTransportEmergency({
        id: selected.id,
        resolvedBy: "Admin",
        note: resolveNote,
      });
      if (next) {
        notifyDriverSosResolved({
          emergencyId: next.id,
          note: resolveNote || null,
          resolvedBy: "Admin",
        });
        toast.success(`${next.id} resolved`);
        setResolveNote("");
        setSelectedId(next.id);
        setTab("history");
      } else {
        toast.error("Could not resolve emergency");
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border/60">
          {(
            [
              { key: "active" as const, label: "Active", count: active.length },
              { key: "history" as const, label: "History", count: history.length },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 h-7 rounded-md text-[11px] font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
        <Pill tone={getActiveTransportEmergencyCount() ? "danger" : "neutral"}>
          {getActiveTransportEmergencyCount()} open
        </Pill>
      </PageToolbar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader
            title={tab === "active" ? "Active emergencies" : "Emergency history"}
            hint="Driver SOS · Acknowledge → Resolve · no SMS / push / calls"
          />
          {rows.length === 0 ? (
            <div className="px-5 pb-8">
              <EmptyState
                icon={<Siren className="size-5" />}
                title={tab === "active" ? "No active emergencies" : "No resolved history"}
                hint={
                  tab === "active"
                    ? "When a driver confirms SOS in the Transport app, it appears here."
                    : "Resolved emergencies move here for audit."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border px-2 pb-2">
              {rows.map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                        isSelected ? "bg-destructive/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                        <Siren className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">{item.id}</span>
                          <Pill tone={statusTone(item.status)}>
                            {transportEmergencyStatusLabel(item.status)}
                          </Pill>
                          <Pill tone="neutral">{transportEmergencyTypeLabel(item.type)}</Pill>
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {item.routeCode} · {item.vehicleNumber} · {item.driverName}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatWhen(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Emergency details"
            hint={selected ? selected.id : "Select an emergency"}
          />
          {!selected ? (
            <div className="px-5 pb-8">
              <EmptyState
                icon={<Siren className="size-5" />}
                title="No selection"
                hint="Choose an emergency from the list."
              />
            </div>
          ) : (
            <div className="space-y-4 px-5 pb-5">
              <div className="flex flex-wrap gap-1.5">
                <Pill tone={statusTone(selected.status)}>
                  {transportEmergencyStatusLabel(selected.status)}
                </Pill>
                <Pill tone="neutral">{transportEmergencyTypeLabel(selected.type)}</Pill>
              </div>

              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                <Field label="Route" value={`${selected.routeCode} · ${selected.routeName}`} />
                <Field label="Bus" value={selected.vehicleNumber} />
                <Field label="Driver" value={selected.driverName} />
                <Field label="Created" value={formatWhen(selected.createdAt)} />
                {selected.acknowledgedAt ? (
                  <Field label="Acknowledged" value={formatWhen(selected.acknowledgedAt)} />
                ) : null}
                {selected.acknowledgedBy ? (
                  <Field label="Ack by" value={selected.acknowledgedBy} />
                ) : null}
                {selected.resolvedAt ? (
                  <Field label="Resolved" value={formatWhen(selected.resolvedAt)} />
                ) : null}
                {selected.resolvedBy ? (
                  <Field label="Resolved by" value={selected.resolvedBy} />
                ) : null}
              </dl>

              {selected.latitude != null && selected.longitude != null ? (
                <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Location unavailable</p>
              )}

              {selected.resolveNote ? (
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  <span className="font-semibold">Resolution: </span>
                  {selected.resolveNote}
                </p>
              ) : null}

              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Timeline
                </h3>
                <ol className="space-y-2">
                  {selected.timeline.map((ev) => (
                    <li key={ev.id} className="flex gap-2 text-xs">
                      <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium">{ev.label}</p>
                        <p className="text-[11px] text-muted-foreground">{formatWhen(ev.at)}</p>
                        {ev.note ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{ev.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {isEmergencyOpen(selected.status) ? (
                <div className="space-y-2 border-t border-border pt-4">
                  {selected.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={acknowledging || resolving}
                      onClick={onAcknowledge}
                    >
                      <Hand className="size-3.5" />
                      Acknowledge
                    </Button>
                  ) : null}
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Resolution note
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      placeholder="What action was taken?"
                    />
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={resolving || acknowledging}
                    onClick={onResolve}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Resolve emergency
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}
