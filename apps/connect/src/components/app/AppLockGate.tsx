import { useEffect, type ReactNode } from "react";
import { appLockStore } from "@/lib/app-lock-store";

/** Re-lock on native background; UI gating lives in AppShell. */
export function AppLockGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    let disposed = false;
    let handle: { remove: () => void } | undefined;

    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (disposed || !Capacitor.isNativePlatform()) return;
        return import("@capacitor/app").then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive && appLockStore.isEnabled()) {
              appLockStore.lockSession();
            }
          }),
        );
      })
      .then((h) => {
        if (!disposed && h) handle = h;
      })
      .catch(() => {
        // Capacitor unavailable in web — ignore.
      });

    return () => {
      disposed = true;
      handle?.remove();
    };
  }, []);

  return children;
}
