import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageToolbar,
  Pill,
  Textarea,
} from "@lumenx/ui-admin";
import { CheckCircle2, Siren } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  acknowledgeTransportEmergencyApi,
  listTransportEmergencies,
  resolveTransportEmergencyApi,
} from "@/lib/transport/ops-api";
import type { TransportEmergencyDto } from "@/lib/transport/types";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
  onNotify?: (message: string) => void;
};

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

function statusTone(status: TransportEmergencyDto["status"]) {
  if (status === "resolved") return "success" as const;
  if (status === "acknowledged") return "warning" as const;
  return "danger" as const;
}

export function TransportEmergenciesApiPanel({
  instituteId,
  writesEnabled = true,
  onNotify,
}: Props) {
  const [emergencies, setEmergencies] = useState<TransportEmergencyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransportEmergencies({ instituteId });
      setEmergencies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emergencies");
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void reload();
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

  const active = useMemo(
    () => emergencies.filter((e) => e.status === "active" || e.status === "acknowledged"),
    [emergencies],
  );
  const history = useMemo(
    () => emergencies.filter((e) => e.status === "resolved"),
    [emergencies],
  );
  const rows = tab === "active" ? active : history;
  const selected =
    emergencies.find((e) => e.id === selectedId) ?? rows[0] ?? null;

  const onAcknowledge = async () => {
    if (!selected || selected.status !== "active" || !writesEnabled) return;
    setBusy(true);
    try {
      await acknowledgeTransportEmergencyApi(selected.id);
      onNotify?.("Emergency acknowledged");
      await reload();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Acknowledge failed");
    } finally {
      setBusy(false);
    }
  };

  const onResolve = async () => {
    if (!selected || selected.status === "resolved" || !writesEnabled) return;
    setBusy(true);
    try {
      await resolveTransportEmergencyApi(selected.id, resolveNote.trim() || null);
      onNotify?.("Emergency resolved");
      setResolveNote("");
      await reload();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading emergencies…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <div className="flex gap-2">
          <Button
            variant={tab === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("active")}
          >
            Active ({active.length})
          </Button>
          <Button
            variant={tab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("history")}
          >
            History ({history.length})
          </Button>
        </div>
        <Pill tone={active.length ? "danger" : "neutral"}>
          {active.length ? `${active.length} open` : "All clear"}
        </Pill>
      </PageToolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={Siren}
          title={tab === "active" ? "No active emergencies" : "No resolved cases"}
          description={
            tab === "active"
              ? "SOS alerts from drivers appear here in real time."
              : "Resolved emergencies are listed here for audit."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {rows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-xl border text-left transition ${
                  selected?.id === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <Card className="border-0 shadow-none">
                  <CardHeader
                    title={`${item.vehicleNumber ?? "Vehicle"} · ${item.driverName ?? "Driver"}`}
                    subtitle={`${item.routeName ?? "Route"} · ${formatWhen(item.createdAt)}`}
                    action={<Pill tone={statusTone(item.status)}>{item.status}</Pill>}
                  />
                </Card>
              </button>
            ))}
          </div>

          {selected ? (
            <Card>
              <CardHeader
                title="Case detail"
                subtitle={selected.note ?? "No driver note"}
                action={<Pill tone={statusTone(selected.status)}>{selected.status}</Pill>}
              />
              <div className="space-y-3 px-4 pb-4">
                {selected.latitude != null && selected.longitude != null ? (
                  <p className="text-sm text-muted-foreground">
                    Location: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                  </p>
                ) : null}

                {tab === "active" && writesEnabled ? (
                  <>
                    {selected.status === "active" ? (
                      <Button size="sm" disabled={busy} onClick={() => void onAcknowledge()}>
                        Acknowledge SOS
                      </Button>
                    ) : null}
                    {selected.status !== "resolved" ? (
                      <>
                        <Textarea
                          placeholder="Resolve note (optional)"
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          rows={3}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void onResolve()}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark resolved
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : null}

                <ul className="space-y-2 text-sm">
                  {selected.timeline.map((evt) => (
                    <li key={evt.id} className="text-muted-foreground">
                      {formatWhen(evt.at)} — {evt.label}
                      {evt.note ? `: ${evt.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
