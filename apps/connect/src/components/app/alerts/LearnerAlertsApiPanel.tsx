import { useEffect } from "react";
import { AlertsCenterView } from "@/components/app/alerts/AlertsCenterView";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import {
  ackAllPortalSchoolAlerts,
  ackPortalSchoolAlert,
} from "@/lib/school-alerts";
import { useSchoolAlertsQuery } from "@/lib/connect-queries/hooks";
import { alertStore, setAlertStoreAckHandlers } from "@/lib/alert-store";
import { setConnectApiAlertCounts } from "@/lib/use-connect-alert-badge";

type LearnerAlertsApiPanelProps = {
  subtitle?: string;
  showChildSwitcher?: boolean;
  childId?: string;
};

function syncBadgeCounts(): void {
  const items = alertStore.getItems();
  setConnectApiAlertCounts({
    unack: items.filter((alert) => !alert.acknowledged).length,
    emergency: items.filter(
      (alert) => alert.severity === "emergency" && !alert.acknowledged,
    ).length,
  });
}

export function LearnerAlertsApiPanel({
  subtitle,
  showChildSwitcher,
  childId,
}: LearnerAlertsApiPanelProps) {
  const { activeInstituteId } = useApp();
  const { data, isLoading, refresh } = useSchoolAlertsQuery(
    activeInstituteId,
    Boolean(activeInstituteId),
  );

  useEffect(() => {
    setAlertStoreAckHandlers({
      onAck: async (id) => {
        try {
          await ackPortalSchoolAlert(id);
        } finally {
          syncBadgeCounts();
          refresh();
        }
      },
      onAckAll: async () => {
        if (!activeInstituteId) return;
        try {
          await ackAllPortalSchoolAlerts(activeInstituteId);
        } finally {
          syncBadgeCounts();
          refresh();
        }
      },
    });
    return () => setAlertStoreAckHandlers({});
  }, [activeInstituteId, refresh]);

  useEffect(() => {
    if (!data) return;
    if (data.status === "ready" || data.status === "empty") {
      alertStore.replaceFromApi(data.alerts);
    }
    syncBadgeCounts();
  }, [data]);

  const status =
    data?.status ?? (isLoading && !data ? "loading" : "loading");
  const error = data?.errorMessage ?? null;

  if (status === "loading" || (isLoading && !data)) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Alerts" subtitle={subtitle} />
        <p className="px-1 text-sm text-muted-foreground">Loading alerts…</p>
      </div>
    );
  }

  if (status === "forbidden" || status === "error") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader
          title="Alerts"
          subtitle={subtitle}
          action={
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={refresh}
            >
              Retry
            </button>
          }
        />
        <p className="px-1 text-sm text-destructive">{error ?? "Failed to load alerts."}</p>
      </div>
    );
  }

  return (
    <AlertsCenterView
      subtitle={subtitle}
      showChildSwitcher={showChildSwitcher}
      childId={childId}
    />
  );
}
