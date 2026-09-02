import { useEffect, useState } from "react";
import { Bus, Clock, MapPin } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { loadLearnerTransport } from "@/lib/transport";
import type { LearnerTransportSummary } from "@/lib/transport";

type Props = {
  instituteId: string;
  studentId: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
};

export function LearnerTransportApiView({
  instituteId,
  studentId,
  subtitle,
  headerExtra,
}: Props) {
  const [summary, setSummary] = useState<LearnerTransportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setError(null);
    setEmpty(null);
    void loadLearnerTransport({ instituteId, studentId }).then((state) => {
      if (state.status === "ready") {
        setSummary(state.summary);
        setLoading(false);
        return;
      }
      if (state.status === "empty") {
        setSummary(null);
        setEmpty(state.message);
        setLoading(false);
        return;
      }
      if (state.status === "error") {
        setError(state.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    reload();
  }, [instituteId, studentId]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: reload,
      });
    } catch {
      return undefined;
    }
  }, [instituteId]);

  if (loading) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground">Loading transport details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (empty || !summary) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground">
          {empty ?? "No bus enrollment found for this student."}
        </p>
      </div>
    );
  }

  const pending = summary.approvalStatus === "pending";

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {headerExtra}
      <PageHeader title="Transport" subtitle={subtitle} />

      {pending ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Bus enrollment is pending admin approval. Route details will appear once approved.
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Bus}
          label="Assigned bus"
          value={summary.busNumber ?? "—"}
          hint={summary.routeName ?? "—"}
          tone="warning"
        />
        <StatCard
          icon={Clock}
          label="Driver"
          value={summary.driverName ?? "—"}
          hint={summary.driverPhone ?? "Contact school transport office"}
          tone="primary"
        />
        <StatCard
          icon={MapPin}
          label="Pickup stop"
          value={summary.pickupStop?.name ?? "—"}
          hint={summary.pickupStop?.locationLabel ?? "—"}
        />
      </div>

      {summary.stops.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Route stops</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {summary.stops.map((stop) => (
              <li key={stop.id} className="flex gap-2">
                <span className="font-medium text-muted-foreground">{stop.routeOrder + 1}.</span>
                <span>
                  {stop.name}
                  <span className="block text-xs text-muted-foreground">{stop.locationLabel}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
