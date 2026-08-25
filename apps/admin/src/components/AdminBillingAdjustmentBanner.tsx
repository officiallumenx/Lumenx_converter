/**
 * Banner: consolidated post-renewal seat charge pending Review & Pay.
 */

import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui-admin";
import { useWindowEvents } from "@lumenx/ui";
import {
  SUBSCRIPTION_CHANGED_EVENT,
  getPendingBillingAdjustment,
  type BillingAdjustment,
} from "@lumenx/utils";
import { getAdminBoundNexusInstituteId } from "@lumenx/config";

const EVENTS = [
  "storage",
  "focus",
  SUBSCRIPTION_CHANGED_EVENT,
  "lumenx-students-changed",
] as const;

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AdminBillingAdjustmentBanner() {
  const [adj, setAdj] = useState<BillingAdjustment | null>(() =>
    getPendingBillingAdjustment(getAdminBoundNexusInstituteId()),
  );

  const sync = useCallback(() => {
    setAdj(getPendingBillingAdjustment(getAdminBoundNexusInstituteId()));
  }, []);

  useWindowEvents(EVENTS, sync);

  if (!adj || adj.payableAmountInr <= 0) return null;
  if (adj.status !== "pending" && adj.status !== "verification_pending") return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100"
    >
      <div className="font-semibold">Additional subscription charge pending</div>
      <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
        +{adj.additionalStudentCount} student{adj.additionalStudentCount === 1 ? "" : "s"} ·{" "}
        {formatInr(adj.payableAmountInr)} for {adj.remainingMonths} remaining month
        {adj.remainingMonths === 1 ? "" : "s"} · original renewal snapshot unchanged
      </p>
      <div className="mt-3">
        <Link to="/subscription">
          <Button size="sm" variant="primary" data-admin-allow-readonly>
            Review &amp; Pay
          </Button>
        </Link>
      </div>
    </div>
  );
}
