import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Clock3, History, MapPin, Siren } from "lucide-react";
import { toast } from "sonner";
import {
  isEmergencyOpen,
  subscribeTransportEmergencies,
  transportEmergencyStatusLabel,
  transportEmergencyTypeLabel,
  type TransportEmergency,
} from "@lumenx/utils";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { emergencyRepository } from "@/lib/transport";

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

function useEmergencies() {
  return useSyncExternalStore(
    subscribeTransportEmergencies,
    () => emergencyRepository.list(),
    () => emergencyRepository.list(),
  );
}

export function EmergencyPage({
  autoConfirm = false,
}: {
  /** When true (e.g. deep-link from active trip), open confirm sheet if no open SOS. */
  autoConfirm?: boolean;
}) {
  const emergencies = useEmergencies();
  const open = useMemo(
    () => emergencies.filter((e) => isEmergencyOpen(e.status)),
    [emergencies],
  );
  const history = useMemo(
    () => emergencies.filter((e) => e.status === "resolved"),
    [emergencies],
  );

  const openForDriver = emergencyRepository.getOpenForCurrentDriver();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [justCreated, setJustCreated] = useState<TransportEmergency | null>(null);
  const [justResolvedId, setJustResolvedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [seenResolved, setSeenResolved] = useState<Set<string>>(() => new Set());

  const selected =
    emergencies.find((e) => e.id === selectedId) ??
    justCreated ??
    openForDriver ??
    open[0] ??
    null;

  const latestResolved = history[0] ?? null;

  useEffect(() => {
    if (!autoConfirm) return;
    if (openForDriver) return;
    setConfirmOpen(true);
  }, [autoConfirm, openForDriver]);

  // Detect Admin resolution while driver is on this page / after refresh.
  useEffect(() => {
    if (!latestResolved) return;
    if (seenResolved.has(latestResolved.id)) return;
    // Only toast for recent resolutions (within last hour) that we haven't flagged.
    const age = Date.now() - new Date(latestResolved.resolvedAt ?? latestResolved.createdAt).getTime();
    setSeenResolved((prev) => new Set(prev).add(latestResolved.id));
    if (age > 60 * 60 * 1000) return;
    setJustResolvedId(latestResolved.id);
    setTab("history");
    setSelectedId(latestResolved.id);
    toast.success("Emergency Resolved", {
      description: latestResolved.resolveNote || `${latestResolved.id} closed by Admin`,
    });
    // Intentionally omit seenResolved from deps — we gate with .has() and update once per id.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seenResolved read for gate only
  }, [latestResolved]);

  const confirmEmergency = () => {
    if (openForDriver) {
      toast.message("SOS already active", {
        description: openForDriver.id,
      });
      setConfirmOpen(false);
      setSelectedId(openForDriver.id);
      setTab("active");
      return;
    }
    setTriggering(true);
    void emergencyRepository.triggerEmergency().then((result) => {
      setTriggering(false);
      setConfirmOpen(false);
      setJustCreated(result.emergency);
      setSelectedId(result.emergency.id);
      setTab("active");
      if (!result.ok) {
        toast.error("SOS already active", { description: result.message });
        return;
      }
      toast.success("SOS sent to Admin", {
        description: `${result.message} · No SMS, push, or calls in this demo`,
      });
    });
  };

  const sosBlocked = Boolean(openForDriver);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <SectionHeader
        as="h1"
        size="page"
        title="Emergency"
        subtitle="Sends a help request to school Admin with your bus and location."
      />

      {justResolvedId && latestResolved?.id === justResolvedId ? (
        <section className="rounded-2xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">Emergency Resolved</p>
              <p className="text-sm text-muted-foreground">
                {latestResolved.id}
                {latestResolved.resolvedAt ? ` · ${formatWhen(latestResolved.resolvedAt)}` : ""}
              </p>
              {latestResolved.resolveNote ? (
                <p className="text-sm text-foreground">
                  Resolution: {latestResolved.resolveNote}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Admin closed this emergency.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {openForDriver ? (
        <SosActiveBanner emergency={openForDriver} />
      ) : justCreated && isEmergencyOpen(justCreated.status) ? (
        <SosActiveBanner emergency={justCreated} />
      ) : null}

      <section className="flex flex-col items-center gap-4 rounded-3xl border border-destructive/25 bg-gradient-to-b from-destructive/[0.08] via-card to-card px-4 py-8 shadow-soft sm:py-10">
        <button
          type="button"
          onClick={() => {
            if (sosBlocked) {
              toast.message("SOS already active", {
                description: "Admin must resolve the current emergency first.",
              });
              setSelectedId(openForDriver!.id);
              setTab("active");
              return;
            }
            setConfirmOpen(true);
          }}
          disabled={triggering}
          aria-label={
            sosBlocked
              ? "SOS already active. Duplicate SOS is blocked."
              : "Emergency button. Opens confirmation before continuing."
          }
          className="transport-pressable flex size-40 flex-col items-center justify-center gap-2 rounded-full border-4 border-white/25 bg-destructive text-destructive-foreground shadow-[0_16px_40px_-12px_color-mix(in_oklab,var(--destructive)_65%,transparent)] ring-8 ring-destructive/15 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 disabled:opacity-60 sm:size-44"
        >
          <Siren className="size-11 sm:size-12" aria-hidden />
          <span className="font-display text-lg font-extrabold uppercase leading-none tracking-[0.18em] sm:text-xl">
            SOS
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-destructive-foreground/80">
            {sosBlocked ? "Already active" : "Tap for help"}
          </span>
        </button>
        {open.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {open.length} open emergency{open.length === 1 ? "" : "ies"} · Admin can acknowledge /
            resolve
          </p>
        ) : null}
      </section>

      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        {(
          [
            { key: "active" as const, label: "Active", count: open.length },
            { key: "history" as const, label: "History", count: history.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? "border border-border/50 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="ml-1 text-[10px] opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "active" ? (
        <EmergencyList
          items={open}
          emptyTitle="No active emergencies"
          emptyHint="Tap SOS and confirm to create one for Admin."
          selectedId={selected?.id}
          onSelect={setSelectedId}
        />
      ) : (
        <EmergencyList
          items={history}
          emptyTitle="No history yet"
          emptyHint="Resolved emergencies appear here."
          selectedId={selected?.id}
          onSelect={setSelectedId}
        />
      )}

      {selected ? <EmergencyDetailsCard emergency={selected} /> : null}

      <BottomSheet
        open={confirmOpen}
        onOpenChange={(openSheet) => {
          if (triggering) return;
          setConfirmOpen(openSheet);
        }}
        title="Send SOS?"
        description="Admin will see your bus, route, and location. Use only for real emergencies."
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              expanded
              loading={triggering}
              disabled={triggering || sosBlocked}
              onClick={confirmEmergency}
            >
              <Siren className="size-5" aria-hidden />
              Send SOS to Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              expanded
              disabled={triggering}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Confirm only for real urgent situations on this route. Duplicate SOS is blocked while
            one is still open.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

function SosActiveBanner({ emergency }: { emergency: TransportEmergency }) {
  return (
    <section className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <Siren className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold uppercase tracking-wide text-destructive">
              SOS ACTIVE
            </p>
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
              {transportEmergencyStatusLabel(emergency.status)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Detail label="Time" value={formatWhen(emergency.createdAt)} />
            <Detail label="Driver" value={emergency.driverName} />
            <Detail label="Bus" value={emergency.vehicleNumber} />
            <Detail label="Route" value={`${emergency.routeCode} · ${emergency.routeName}`} />
          </dl>
          {emergency.latitude != null && emergency.longitude != null ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              Location {emergency.latitude.toFixed(5)}, {emergency.longitude.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Location unavailable</p>
          )}
          {emergency.status === "acknowledged" ? (
            <p className="text-xs text-foreground">
              Admin acknowledged
              {emergency.acknowledgedAt ? ` · ${formatWhen(emergency.acknowledgedAt)}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmergencyList({
  items,
  emptyTitle,
  emptyHint,
  selectedId,
  onSelect,
}: {
  items: TransportEmergency[];
  emptyTitle: string;
  emptyHint: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-8 text-center">
        <History className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">{emptyTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                selected
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-card hover:border-destructive/25"
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <Siren className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{item.id}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {transportEmergencyTypeLabel(item.type)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      isEmergencyOpen(item.status)
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {transportEmergencyStatusLabel(item.status)}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.vehicleNumber} · {item.routeCode} · {formatWhen(item.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EmergencyDetailsCard({ emergency }: { emergency: TransportEmergency }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">Emergency details</h2>
          <p className="text-xs text-muted-foreground">
            {emergency.id} · {transportEmergencyTypeLabel(emergency.type)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            isEmergencyOpen(emergency.status)
              ? "bg-destructive/15 text-destructive"
              : "bg-success/15 text-success"
          }`}
        >
          {transportEmergencyStatusLabel(emergency.status)}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Detail label="Route" value={`${emergency.routeCode} · ${emergency.routeName}`} />
        <Detail label="Bus" value={emergency.vehicleNumber} />
        <Detail label="Driver" value={emergency.driverName} />
        <Detail label="Created" value={formatWhen(emergency.createdAt)} />
        {emergency.acknowledgedAt ? (
          <Detail label="Acknowledged" value={formatWhen(emergency.acknowledgedAt)} />
        ) : null}
        {emergency.acknowledgedBy ? (
          <Detail label="Ack by" value={emergency.acknowledgedBy} />
        ) : null}
        {emergency.resolvedAt ? (
          <Detail label="Resolved" value={formatWhen(emergency.resolvedAt)} />
        ) : null}
        {emergency.resolvedBy ? <Detail label="Resolved by" value={emergency.resolvedBy} /> : null}
      </dl>

      {emergency.latitude != null && emergency.longitude != null ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {emergency.latitude.toFixed(5)}, {emergency.longitude.toFixed(5)}
        </p>
      ) : null}

      {emergency.status === "resolved" && emergency.resolveNote ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-success">
            Resolution
          </p>
          <p className="mt-1 text-foreground">{emergency.resolveNote}</p>
        </div>
      ) : emergency.resolveNote ? (
        <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          {emergency.resolveNote}
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </h3>
        <ol className="space-y-2">
          {emergency.timeline.map((ev) => (
            <li key={ev.id} className="flex gap-2 text-sm">
              <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{ev.label}</p>
                <p className="text-xs text-muted-foreground">{formatWhen(ev.at)}</p>
                {ev.note ? <p className="mt-0.5 text-xs text-muted-foreground">{ev.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}
