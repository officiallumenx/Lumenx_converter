/**
 * In-app renewal reminder banner (no SMS / email / push).
 * Thresholds: 30 · 15 · 7 · 3 · 1 days · Expired — stored so the same id is not recreated.
 */

import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui-admin";
import { useWindowEvents } from "@lumenx/ui";
import {
  SUBSCRIPTION_CHANGED_EVENT,
  dismissRenewalReminder,
  loadPlatformReadOnlyState,
  type RenewalReminderView,
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminRenewalReminderBanner() {
  const [view, setView] = useState<RenewalReminderView | null>(() =>
    getBoundRenewalReminderView(),
  );

  const sync = useCallback(() => {
    setView(getBoundRenewalReminderView());
  }, []);

  useWindowEvents(EVENTS, sync);

  if (!view) return null;

  // Platform RO banner already owns the expired lock + Renew CTA.
  const trial = getBoundSubscriptionTrialView();
  if (trial?.lifecycleStatus === "read_only") return null;
  if (loadPlatformReadOnlyState().subscriptionExpired) return null;

  const tone =
    view.kind === "expired"
      ? "border-orange-500/40 bg-orange-500/10 text-orange-950 dark:text-orange-100"
      : view.kind === 1 || view.kind === 3
        ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        : "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100";

  return (
    <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <div className="font-semibold">{view.headline}</div>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Current subscription
          </div>
          <div className="mt-0.5 font-medium">{view.currentSubscriptionLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Expiry date
          </div>
          <div className="mt-0.5 font-medium">{formatDate(view.expiryAt)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Days remaining
          </div>
          <div className="mt-0.5 font-medium font-mono">
            {view.kind === "expired" || view.daysRemaining <= 0
              ? "Expired"
              : `${view.daysRemaining} day${view.daysRemaining === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{view.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link to="/subscription">
          <Button size="sm" variant="primary" data-admin-allow-readonly>
            Renew subscription
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          data-admin-allow-readonly
          onClick={() => {
            dismissRenewalReminder(view.reminder.id);
            setView(getBoundRenewalReminderView());
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
