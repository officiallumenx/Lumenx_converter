import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadCurrentSubscription,
  resolveSubscriptionCurrentView,
  shouldCommitSubscriptionLoad,
  type InstituteSubscriptionCurrentDto,
  type SubscriptionLoadStatus,
} from "@/lib/subscriptions";

function statusHint(status: SubscriptionLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading subscription…";
  if (status === "needs_institute") return "Select an institute to load subscription.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load subscription.";
  return "";
}

export function ModulesApiSubscriptionPanel() {
  const instituteCtx = useInstituteContext();
  const [subscription, setSubscription] = useState<InstituteSubscriptionCurrentDto | null>(null);
  const [loadStatus, setLoadStatus] = useState<SubscriptionLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSubscription(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSubscription(null);
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
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadCurrentSubscription(requestInstituteId).then((next) => {
      if (
        !shouldCommitSubscriptionLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSubscription(next.subscription);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Current subscription"
          hint="Read-only institute subscription · Nexus billing writes stay on Nexus"
          action={<Pill tone="neutral">API mode</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : view.subscription ? (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</div>
                <div className="mt-1 text-sm font-semibold capitalize">{view.subscription.plan}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                <div className="mt-1 text-sm font-semibold">{view.subscription.status}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Student limit
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {view.subscription.studentLimit.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Modules
                </div>
                <div className="mt-1 text-sm font-semibold">{modules.length}</div>
              </div>
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
                className={`p-4 rounded-lg border ${
                  enabled
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border bg-background/40 opacity-80"
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-2">
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
