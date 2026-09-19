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
    setLumenXAnalyticsAppContext("careers");
    let disposeAnalytics: (() => void) | undefined;
    let disposeCrash: (() => void) | undefined;
    void bootstrapFirebaseAnalytics({ appId: "careers" }).then((d) => {
      disposeAnalytics = d;
    });
    void bootstrapFirebaseCrashReporting({
      appId: "careers",
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
