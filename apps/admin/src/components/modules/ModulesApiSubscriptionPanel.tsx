import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  getSubscriptionDetail,
  loadCurrentSubscription,
  resolveSubscriptionCurrentView,
  shouldCommitSubscriptionLoad,
  type InstituteSubscriptionCurrentDto,
  type InstituteSubscriptionDetailDto,
  type SubscriptionLoadStatus,
} from "@/lib/subscriptions";
import { writeApiModuleEntitlements } from "@/lib/admin-plan-config";

function statusHint(status: SubscriptionLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading subscription…";
  if (status === "needs_institute") return "Select an institute to load subscription.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load subscription.";
  return "";
}

const BILLING_PLAN_OPTIONS = ["Free trial", "Month", "6 months", "Annual"] as const;

/** Admin-facing billing plan label (not Core/Plus/Max tiers). */
export function labelAdminBillingPlan(
  detail: InstituteSubscriptionDetailDto | null,
): string {
  const lifecycle = (detail?.lifecycleStatus ?? "").toLowerCase();
  const onTrial =
    lifecycle === "trial_active" ||
    lifecycle === "trial_expiring" ||
    lifecycle === "registered" ||
    lifecycle === "approved";
  if (onTrial) return "Free trial";

  const months = detail?.currentPeriod?.durationMonths;
  if (months === 1) return "Month";
  if (months === 6) return "6 months";
  if (months === 12) return "Annual";
  return "—";
}

export function ModulesApiSubscriptionPanel() {
  const instituteCtx = useInstituteContext();
  const [subscription, setSubscription] = useState<InstituteSubscriptionCurrentDto | null>(null);
  const [detail, setDetail] = useState<InstituteSubscriptionDetailDto | null>(null);
  const [loadStatus, setLoadStatus] = useState<SubscriptionLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSubscription(null);
      setDetail(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSubscription(null);
      setDetail(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSubscription(null);
      setDetail(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    if (!subscription) {
      setLoadStatus("loading");
      setLoadError(null);
    }
    void Promise.all([
      loadCurrentSubscription(requestInstituteId),
      getSubscriptionDetail(requestInstituteId).catch(() => null),
    ]).then(([current, nextDetail]) => {
      if (
        !shouldCommitSubscriptionLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSubscription(current.subscription);
      setDetail(nextDetail);
      setLoadStatus(current.status);
      setLoadError(current.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      if (current.subscription?.modules) {
        writeApiModuleEntitlements(current.subscription.modules);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscription presence only gates skeleton
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage]);

  const view = resolveSubscriptionCurrentView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSubscription: subscription,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const modules = view.subscription
    ? Object.entries(view.subscription.modules).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const planLabel = labelAdminBillingPlan(detail);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Current subscription"
          hint="Billing plan · Free trial · Month · 6 months · Annual"
          action={
            <div className="flex items-center gap-2">
              <Link to="/subscription">
                <Button size="sm">Renew / pay offline</Button>
              </Link>
              <Pill tone="neutral">Live data</Pill>
            </div>
          }
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : view.subscription ? (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 dark:bg-sky-500/15">
                <div className="text-[10px] uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Plan
                </div>
                <div className="mt-1 text-sm font-semibold text-sky-950 dark:text-sky-50">
                  {planLabel}
                </div>
              </div>
              <div className="rounded-lg border border-success/35 bg-success/10 p-3">
                <div className="text-[10px] uppercase tracking-wider text-success">
                  Status
                </div>
                <div className="mt-1 text-sm font-semibold capitalize text-foreground">
                  {(detail?.lifecycleStatus ?? view.subscription.status).replace(/_/g, " ")}
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 dark:bg-amber-500/15">
                <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Student limit
                </div>
                <div className="mt-1 text-sm font-semibold text-amber-950 dark:text-amber-50">
                  {view.subscription.studentLimit.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                <div className="text-[10px] uppercase tracking-wider text-primary">
                  Modules
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {modules.length}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BILLING_PLAN_OPTIONS.map((option) => (
                <Pill
                  key={option}
                  tone={planLabel === option ? "success" : "neutral"}
                >
                  {option}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      {modules.length > 0 ? (
        <Card>
          <CardHeader title="Module entitlements" hint="From license admin_module rows when present" />
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map(([id, enabled]) => (
              <div
                key={id}
                className={`rounded-lg border p-4 ${
                  enabled
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border bg-background/40 opacity-80"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {id}
                  <Pill tone={enabled ? "success" : "neutral"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
