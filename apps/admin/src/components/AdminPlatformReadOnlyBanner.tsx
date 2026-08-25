import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui-admin";
import { PlatformReadOnlyBanner, useWindowEvents } from "@lumenx/ui";
import {
  loadPlatformReadOnlyState,
  type PlatformReadOnlyState,
} from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

const PLATFORM_READONLY_EVENTS = [
  "storage",
  "lumenx-platform-readonly-changed",
  "focus",
] as const;

/** Admin shell wrapper around the shared read-only banner (single write-gate). */
export function AdminPlatformReadOnlyBanner() {
  const [state, setState] = useState<PlatformReadOnlyState>(() => loadPlatformReadOnlyState());

  // Display-only — writers live in AdminChrome / subscription sync. Calling
  // syncAdminSubscriptionAccess here re-fired lumenx-platform-readonly-changed
  // and froze the tab after PIN unlock.
  const sync = useCallback(() => {
    setState(loadPlatformReadOnlyState());
  }, []);
  useWindowEvents(PLATFORM_READONLY_EVENTS, sync);

  return (
    <PlatformReadOnlyBanner
      state={state}
      className="mb-4"
      actions={
        state.subscriptionExpired ? (
          <Link to="/subscription">
            <Button size="sm" variant="primary" data-admin-allow-readonly>
              Renew subscription
            </Button>
          </Link>
        ) : state.academicYearLocked ? (
          <Link to="/academic-management">
            <Button size="sm" variant="primary" data-admin-allow-readonly>
              {M.academics}
            </Button>
          </Link>
        ) : null
      }
    />
  );
}
