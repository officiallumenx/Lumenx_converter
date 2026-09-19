import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AlertsCenterView, useAlertStoreInit } from "@/components/app/alerts/AlertsCenterView";
import { LearnerAlertsApiPanel } from "@/components/app/alerts/LearnerAlertsApiPanel";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { schoolAlerts } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { TeacherLeaveAlertsView } from "@/components/app/leave/TeacherLeaveAlertsView";
import { leaveStore } from "@/lib/leave-store";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — LumenX Connect" }] }),
  component: () => (
    <AlertsRoutePage />
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

  useAlertStoreInit(isApiAuthMode() ? [] : seed);

  useEffect(() => {
    if (isApiAuthMode()) return;
    if (role === "teacher" || role === "parent") leaveStore.init();
  }, [role]);

  if (role === "teacher") {
    return <TeacherLeaveAlertsView />;
  }

  if (isApiAuthMode() && (role === "parent" || role === "student")) {
    const childName =
      role === "parent" && portal.isParent && portal.snapshot
        ? portal.snapshot.shortName
        : undefined;
    return (
      <LearnerAlertsApiPanel
        showChildSwitcher={role === "parent"}
        childId={activeChildId}
        subtitle={
          childName
            ? `For ${childName} · Emergency = act now · Mandatory = respond within 24h`
            : "Emergency alerts need immediate action · Mandatory alerts within 24h"
        }
      />
    );
  }

  if (role === "parent") {
    const childName = portal.isParent && portal.snapshot ? portal.snapshot.shortName : undefined;
    return (
      <AlertsCenterView
        showChildSwitcher
        childId={activeChildId}
        subtitle={
          childName
            ? `For ${childName} · Emergency = act now · Mandatory = respond within 24h`
            : undefined
        }
      />
    );
  }

  return (
    <AlertsCenterView subtitle="Emergency alerts need immediate action · Mandatory alerts within 24h" />
  );
}
