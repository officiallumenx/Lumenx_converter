import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { isApiAuthMode } from "./auth-mode";
import {
  ensureApiRegistrationForUser,
  getApiRegistrationView,
  getApiRegistrationServerSnapshot,
  subscribeApiRegistration,
  syncApiRegistrationFromBackend,
} from "./api-registration-state";
import {
  activateApprovedApiRegistration,
  approvedRegistrationNeedsActivation,
} from "./api-registration-activation";
import type { AuthUser } from "./types";

const PENDING_POLL_MS = 30_000;

export type ApiRegistrationSyncOptions = {
  /** Called when post-approval activation updates the authenticated user. */
  onActivated?: (user: AuthUser) => void;
  /** Called when approval succeeded but institute binding failed. */
  onActivationFailed?: (message: string) => void;
};

/** Keeps GET /api/v1/registrations/me in sync and activates approved accounts. */
export function useApiRegistrationSync(
  user: AuthUser | null,
  opts?: ApiRegistrationSyncOptions,
) {
  const view = useSyncExternalStore(
    subscribeApiRegistration,
    getApiRegistrationView,
    getApiRegistrationServerSnapshot,
  );
  const activatingRef = useRef(false);
  const onActivatedRef = useRef(opts?.onActivated);
  const onActivationFailedRef = useRef(opts?.onActivationFailed);
  onActivatedRef.current = opts?.onActivated;
  onActivationFailedRef.current = opts?.onActivationFailed;

  useEffect(() => {
    if (!isApiAuthMode() || !user?.id) return;
    void ensureApiRegistrationForUser(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!isApiAuthMode() || !user?.id) return;
    if (view.snapshot?.status !== "pending") return;

    const refresh = () => {
      void syncApiRegistrationFromBackend().catch(() => undefined);
    };

    refresh();
    const interval = window.setInterval(refresh, PENDING_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, view.snapshot?.status]);

  useEffect(() => {
    if (!isApiAuthMode() || !user?.id) return;
    if (!view.loaded || view.syncing) return;

    const registration = view.snapshot;
    if (!approvedRegistrationNeedsActivation(user, registration)) return;
    if (activatingRef.current) return;

    activatingRef.current = true;
    void activateApprovedApiRegistration(registration!)
      .then((result) => {
        if (result.ok) {
          onActivatedRef.current?.(result.user);
        } else {
          onActivationFailedRef.current?.(result.message);
        }
      })
      .finally(() => {
        activatingRef.current = false;
      });
  }, [
    user,
    user?.id,
    user?.instituteId,
    view.loaded,
    view.syncing,
    view.snapshot,
  ]);

  return view;
}
