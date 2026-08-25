import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { useRouteSetup } from "@/hooks/use-route-setup";
import {
  applyAdminApproveStop,
  applyAdminDeclineStop,
} from "@/lib/transport/route-setup/store";

const DEFAULT_DECLINE = "Location or student list needs correction.";

/**
 * Demo-only Admin decision simulator (shared localStorage mock).
 * Lets drivers complete Phase 2 tests without opening the Admin app.
 */
export function DemoAdminReviewPanel({ locked }: { locked: boolean }) {
  const record = useRouteSetup();
  const pending = useMemo(
    () => record.stops.filter((s) => s.status === "pending"),
    [record.stops],
  );
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [reason, setReason] = useState(DEFAULT_DECLINE);

  if (locked || pending.length === 0) return null;

  return (
    <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-3 p-4">
        <SectionHeader
          title="Demo · Admin review"
          subtitle="Simulate Approve / Decline on pending submissions (shared mock)"
        />
        <ul className="space-y-2">
          {pending.map((stop) => (
            <li
              key={stop.id}
              className="rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stop.studentIds.length} student
                    {stop.studentIds.length === 1 ? "" : "s"} · Pending approval
                    {stop.replacesStopId ? " · Change request" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="transport"
                    onClick={() => {
                      applyAdminApproveStop(stop.id);
                      toast.success(`${stop.name} approved · Active`);
                      setDeclineFor(null);
                    }}
                  >
                    <Check className="size-3.5" aria-hidden />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeclineFor(stop.id);
                      setReason(DEFAULT_DECLINE);
                    }}
                  >
                    <X className="size-3.5" aria-hidden />
                    Decline
                  </Button>
                </div>
              </div>
              {declineFor === stop.id ? (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <label className="block text-xs font-medium text-foreground" htmlFor={`decline-${stop.id}`}>
                    Reason
                  </label>
                  <textarea
                    id={`decline-${stop.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        applyAdminDeclineStop(stop.id, reason);
                        toast.error(`${stop.name} declined`, {
                          description: reason.trim() || DEFAULT_DECLINE,
                        });
                        setDeclineFor(null);
                      }}
                    >
                      Confirm decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeclineFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
