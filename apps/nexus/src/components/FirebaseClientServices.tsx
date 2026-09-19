import { useEffect } from "react";
import {
  bootstrapFirebaseAnalytics,
  bootstrapFirebaseCrashReporting,
  setLumenXAnalyticsAppContext,
} from "@lumenx/auth";
import { isNexusApiMode } from "@/lib/auth-mode";

export function FirebaseClientServices({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isNexusApiMode()) return;
    setLumenXAnalyticsAppContext("nexus");
    let disposeAnalytics: (() => void) | undefined;
    let disposeCrash: (() => void) | undefined;
    void bootstrapFirebaseAnalytics({ appId: "nexus" }).then((d) => {
      disposeAnalytics = d;
    });
    void bootstrapFirebaseCrashReporting({
      appId: "nexus",
      release: import.meta.env.VITE_APP_RELEASE?.trim() || undefined,
    }).then((d) => {
      disposeCrash = d;
    });
    return () => {
      disposeAnalytics?.();
      disposeCrash?.();
      setLumenXAnalyticsAppContext(null);
    };
  }, [enabled]);
  return null;
}
