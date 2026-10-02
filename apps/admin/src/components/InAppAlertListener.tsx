import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  subscribeInAppAlerts,
  bootstrapAlertChimesPreference,
  type InAppAlertEventDetail,
} from "@lumenx/notifications";

function softNavigate(href: string, navigate: ReturnType<typeof useNavigate>) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    window.location.assign(href);
    return;
  }
  void navigate({ to: href as "/" });
}

/** Foreground push-style banner with alert chime (distinct from notification bell). */
export function InAppAlertListener(): null {
  const navigate = useNavigate();

  useEffect(() => {
    bootstrapAlertChimesPreference();
    return subscribeInAppAlerts((detail: InAppAlertEventDetail) => {
      const isAlert = detail.variant === "alert";
      const body = detail.body?.trim();
      toast(detail.title?.trim() || (isAlert ? "Important alert" : "Notification"), {
        description: body || undefined,
        duration: isAlert ? 12000 : 6000,
        className: isAlert
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-card",
        action: detail.href
          ? {
              label: "Open",
              onClick: () => softNavigate(detail.href!, navigate),
            }
          : undefined,
      });
    });
  }, [navigate]);

  return null;
}
