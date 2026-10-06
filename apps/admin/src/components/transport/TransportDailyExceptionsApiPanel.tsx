import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageToolbar,
  Pill,
} from "@lumenx/ui-admin";
import { Ban, Undo2 } from "lucide-react";
import {
  useTransportDailyExceptionsQuery,
  useTransportEnrollmentsQuery,
  adminQueryKeys,
} from "@/lib/admin-queries";
import { cancelTransportDailyException } from "@/lib/transport/ops-api";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
import { useAdminToast } from "@/components/AdminActionToast";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
};

export function TransportDailyExceptionsApiPanel({
  instituteId,
  writesEnabled = true,
}: Props) {
  const notify = useAdminToast();
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const exceptionsQuery = useTransportDailyExceptionsQuery(instituteId, today);
  const enrollmentsQuery = useTransportEnrollmentsQuery(instituteId);
  useTransportRealtimeInvalidate(instituteId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nameByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of enrollmentsQuery.data ?? []) {
      map.set(e.studentId, e.studentId.slice(0, 8));
    }
    return map;
  }, [enrollmentsQuery.data]);

  const rows = exceptionsQuery.data ?? [];

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await cancelTransportDailyException(id);
      notify("Cancelled today's exception — permanent enrollment unchanged", "success");
      void qc.invalidateQueries({
        queryKey: adminQueryKeys.transport(instituteId, `daily-exceptions:${today}`),
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not cancel exception", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <p className="text-sm text-muted-foreground">
          Today&apos;s Not Riding exceptions. Permanent assignments stay intact.
        </p>
        <Pill tone="neutral">{rows.length} today</Pill>
      </PageToolbar>

      <Card>
        <CardHeader
          title="Daily exceptions"
          hint="Parent/Admin Not Riding Today · date-scoped only"
        />
        {exceptionsQuery.isLoading && rows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Ban className="size-5" />}
              title="No exceptions today"
              hint="When a parent marks Not Riding Today, it appears here."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    Student {nameByStudent.get(row.studentId) ?? row.studentId.slice(0, 8)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.exceptionType.replace("_", " ")} · reason {row.reason} ·{" "}
                    {row.serviceDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanent enrollment unchanged · effective participant: excluded today
                  </p>
                </div>
                {writesEnabled ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => void cancel(row.id)}
                  >
                    <Undo2 className="size-3.5" />
                    Cancel today
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
