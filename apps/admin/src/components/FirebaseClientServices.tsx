import { useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";

/** Initializes Firebase Analytics + Crashlytics/web error client (no business data). */
export function FirebaseClientServices({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    let disposeAnalytics: (() => void) | undefined;
    let disposeCrash: (() => void) | undefined;
    let cancelled = false;

    void import("@lumenx/auth").then((auth) => {
      if (cancelled) return;
      auth.setLumenXAnalyticsAppContext("admin");
      void auth
        .bootstrapFirebaseAnalytics({ appId: "admin" })
        .then((d) => {
          disposeAnalytics = d;
        });
      void auth
        .bootstrapFirebaseCrashReporting({
          appId: "admin",
          release: import.meta.env.VITE_APP_RELEASE?.trim() || undefined,
        })
        .then((d) => {
          disposeCrash = d;
        });
    });

    return () => {
      cancelled = true;
      disposeAnalytics?.();
      disposeCrash?.();
      void import("@lumenx/auth").then((auth) => {
        auth.setLumenXAnalyticsAppContext(null);
      });
    };
  }, [enabled]);
  return null;
}
