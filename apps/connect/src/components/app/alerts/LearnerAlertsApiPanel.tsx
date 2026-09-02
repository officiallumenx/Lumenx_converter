import { useEffect, useState } from "react";
import { AlertsCenterView } from "@/components/app/alerts/AlertsCenterView";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import {
  ackAllPortalSchoolAlerts,
  ackPortalSchoolAlert,
  loadPortalSchoolAlerts,
} from "@/lib/school-alerts";
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
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setAlertStoreAckHandlers({
      onAck: async (id) => {
        try {
          await ackPortalSchoolAlert(id);
        } finally {
          syncBadgeCounts();
        }
      },
      onAckAll: async () => {
        if (!activeInstituteId) return;
        try {
          await ackAllPortalSchoolAlerts(activeInstituteId);
        } finally {
          syncBadgeCounts();
        }
      },
    });
    return () => setAlertStoreAckHandlers({});
  }, [activeInstituteId]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    alertStore.reset();
    void loadPortalSchoolAlerts({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      setStatus(result.status);
      setError(result.errorMessage);
      alertStore.initOnce(result.alerts);
      syncBadgeCounts();
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  if (status === "loading") {
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
              onClick={() => setReloadKey((key) => key + 1)}
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
