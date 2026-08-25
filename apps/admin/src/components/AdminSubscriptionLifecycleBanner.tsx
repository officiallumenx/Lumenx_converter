import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui-admin";
import { useWindowEvents } from "@lumenx/ui";
import {
  SUBSCRIPTION_CHANGED_EVENT,
  type SubscriptionTrialView,
} from "@lumenx/utils";
import {
  getBoundRenewalReminderView,
  getBoundSubscriptionTrialView,
} from "@/lib/sync-admin-subscription-access";

const EVENTS = [
  "storage",
  "focus",
  SUBSCRIPTION_CHANGED_EVENT,
  "lumenx-platform-readonly-changed",
] as const;

/**
 * Trial / grace renewal banners (writes still allowed).
 * Read-only lock uses AdminPlatformReadOnlyBanner + existing write-gate — not duplicated here.
 */
export function AdminSubscriptionLifecycleBanner() {
  const [view, setView] = useState<SubscriptionTrialView | null>(() =>
    getBoundSubscriptionTrialView(),
  );

  // Read-only refresh — never call syncAdminSubscriptionAccess here (it writes
  // subscription + platform-readonly state and would loop with these events).
  const sync = useCallback(() => {
    setView(getBoundSubscriptionTrialView());
  }, []);

  useWindowEvents(EVENTS, sync);

  if (!view) return null;

  // Healthy trial / paid active — no interruptive banner.
  if (
    view.lifecycleStatus === "trial_active" ||
    view.lifecycleStatus === "active" ||
    view.lifecycleStatus === "approved" ||
    view.lifecycleStatus === "registered"
  ) {
    return null;
  }

  // Read-only is handled by AdminPlatformReadOnlyBanner (platform write-gate).
  if (view.lifecycleStatus === "read_only") return null;

  // In-app renewal reminder banner owns threshold copy when undismissed.
  if (getBoundRenewalReminderView()) return null;

  const tone =
    view.lifecycleStatus === "trial_expiring"
      ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
      : "border-orange-500/40 bg-orange-500/10 text-orange-950 dark:text-orange-100";

  return (
    <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <div className="font-semibold">{view.headline}</div>
      <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{view.body}</p>
      {view.showRenewalCta ? (
        <div className="mt-3">
          <Link to="/subscription">
            <Button size="sm" variant="primary" data-admin-allow-readonly>
              Renew subscription
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
