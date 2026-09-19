import { useEffect } from "react";
import {
  bootstrapFirebaseAnalytics,
  bootstrapFirebaseCrashReporting,
  setLumenXAnalyticsAppContext,
} from "@lumenx/auth";
import { isApiAuthMode } from "@/lib/auth/auth-mode";

export function FirebaseClientServices({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    setLumenXAnalyticsAppContext("transport");
    let disposeAnalytics: (() => void) | undefined;
    let disposeCrash: (() => void) | undefined;
    void bootstrapFirebaseAnalytics({ appId: "transport" }).then((d) => {
      disposeAnalytics = d;
    });
    void bootstrapFirebaseCrashReporting({
      appId: "transport",
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
