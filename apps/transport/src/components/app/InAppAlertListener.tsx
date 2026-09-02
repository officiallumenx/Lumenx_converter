import { useEffect } from "react";
import { toast } from "sonner";
import { subscribeInAppAlerts, bootstrapAlertChimesPreference, type InAppAlertEventDetail } from "@lumenx/notifications";

function showAlertToast(detail: InAppAlertEventDetail): void {
  const isAlert = detail.variant === "alert";
  toast(isAlert ? "Urgent alert" : "Notification", {
    description: detail.title,
    duration: isAlert ? 12000 : 5000,
    className: isAlert ? "border-destructive/50 bg-destructive/10 text-destructive" : undefined,
    action: detail.href
      ? {
          label: "Open",
          onClick: () => {
            window.location.href = detail.href!;
          },
        }
      : undefined,
  });
}

/** Foreground push-style banner with alert chime (distinct from notification bell). */
export function InAppAlertListener(): null {
  useEffect(() => {
    bootstrapAlertChimesPreference();
    return subscribeInAppAlerts(showAlertToast);
  }, []);
  return null;
}
