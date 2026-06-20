import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  AlertsCenterView,
  useAlertStoreInit,
} from "@/components/app/alerts/AlertsCenterView";
import { useApp } from "@/lib/app-state";
import { schoolAlerts } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { TeacherLeaveAlertsView } from "@/components/app/leave/TeacherLeaveAlertsView";
import { leaveStore } from "@/lib/leave-store";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AlertsRoutePage />
    </AppShell>
  ),
});

function AlertsRoutePage() {
  const { role, activeChildId } = useApp();
  const portal = useParentPortal();

  const seed = useMemo(() => {
    if (role === "student") return schoolAlerts.student;
    if (role === "parent") return schoolAlerts.parent;
    return [];
  }, [role]);

  useAlertStoreInit(seed);

  useEffect(() => {
    if (role === "teacher" || role === "parent") leaveStore.init();
  }, [role]);

  if (role === "teacher") {
    return <TeacherLeaveAlertsView />;
  }

  if (role === "parent") {
    const childName =
      portal.isParent && portal.snapshot ? portal.snapshot.shortName : undefined;
    return (
      <AlertsCenterView
        showChildSwitcher
        childId={activeChildId}
        subtitle={
          childName
            ? `For ${childName} · Emergency = act now · Mandatory = acknowledge within 24h`
            : undefined
        }
      />
    );
  }

  return (
    <AlertsCenterView subtitle="Emergency alerts need immediate action · Mandatory alerts within 24h" />
  );
}
