import { useEffect } from "react";
import {
  bootstrapFirebaseAnalytics,
  bootstrapFirebaseCrashReporting,
  setLumenXAnalyticsAppContext,
} from "@lumenx/auth";
import { isApiAuthMode } from "@/auth/auth-mode";

export function FirebaseClientServices({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    setLumenXAnalyticsAppContext("admissions");
    let disposeAnalytics: (() => void) | undefined;
    let disposeCrash: (() => void) | undefined;
    void bootstrapFirebaseAnalytics({ appId: "admissions" }).then((d) => {
      disposeAnalytics = d;
    });
    void bootstrapFirebaseCrashReporting({
      appId: "admissions",
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
