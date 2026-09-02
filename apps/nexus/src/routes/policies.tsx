import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  SegmentedControl,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import {
  computePolicyAlertStats,
  handlePlatformAlert,
  loadPoliciesWorkspace,
  reopenPlatformAlert,
  updatePolicyRule,
  type PoliciesLoadState,
} from "@/lib/policies";
import {
  formatAlertDate,
  labelAlertKind,
  labelSeverity,
  listActivePlatformAlerts,
  listHandledPlatformAlerts,
  listPlatformAlertRules,
  listPlatformAlerts,
  markAlertHandled,
  platformAlertStats,
  reopenAlert,
  setAlertRuleEnabled,
  severityTone,
  subscribePlatformAlerts,
  type AlertSeverity,
  type PlatformAlert,
  type PlatformAlertKind,
  type PlatformAlertRule,
} from "@/lib/platform-policies-alerts-store";

export const Route = createFileRoute("/policies")({
  head: () => ({ meta: [{ title: "Policies & Alerts — LumenX Nexus" }] }),
  component: PoliciesAlertsPage,
});

type Tab = "active" | "history" | "rules";
type KindFilter = "all" | PlatformAlertKind;
type SeverityFilter = "all" | AlertSeverity;

function PoliciesAlertsPage() {
  if (isNexusApiMode()) return <PoliciesAlertsApiPage />;
  return <PoliciesAlertsDemoPage />;
}

function PoliciesAlertsApiPage() {
  const [loadState, setLoadState] = useState<PoliciesLoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>("active");
  const [kind, setKind] = useState<KindFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const seenAlertIdsRef = useRef<Set<string> | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: "loading" });
    void loadPoliciesWorkspace().then((next) => {
      if (!cancelled) setLoadState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const rules = loadState.status === "ready" ? loadState.rules : [];
  const alerts = loadState.status === "ready" ? loadState.alerts : [];
  const activeAlerts = useMemo(
    () => alerts.filter((a) => a.lifecycle === "active" && !a.handledAt),
    [alerts],
  );
  const historyAlerts = useMemo(
    () => alerts.filter((a) => a.lifecycle === "handled" || a.handledAt),
    [alerts],
  );
  const stats = useMemo(
    () => computePolicyAlertStats(alerts, rules),
    [alerts, rules],
  );

  const source = tab === "history" ? historyAlerts : activeAlerts;
  const filtered = useMemo(() => {
    return source.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false;
      if (severity !== "all" && a.severity !== severity) return false;
      return true;
    });
  }, [source, kind, severity]);

  useEffect(() => {
    if (loadState.status !== "ready") return;
    const currentIds = new Set(activeAlerts.map((a) => a.id));
    if (seenAlertIdsRef.current === null) {
      seenAlertIdsRef.current = currentIds;
      return;
    }
    for (const alert of activeAlerts) {
      if (
        !seenAlertIdsRef.current.has(alert.id) &&
        (alert.severity === "critical" || alert.severity === "high")
      ) {
        void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
          dispatchInAppAlert({
            title: alert.title,
            body: alert.summary,
            href: "/policies",
            variant: "alert",
            severity: alert.severity === "critical" ? "critical" : "high",
          });
        });
      }
    }
    seenAlertIdsRef.current = currentIds;
  }, [activeAlerts, loadState.status]);

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    setTogglingRuleId(ruleId);
    setToggleError(null);
    try {
      await updatePolicyRule(ruleId, { enabled });
      reload();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Unable to update rule.");
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleAlert = async (alertId: string) => {
    setActingId(alertId);
    setActionError(null);
    try {
      await handlePlatformAlert(alertId);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to mark alert handled.");
    } finally {
      setActingId(null);
    }
  };

  const handleReopen = async (alertId: string) => {
    setActingId(alertId);
    setActionError(null);
    try {
      await reopenPlatformAlert(alertId);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to reopen alert.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AppShell
      title="Policies & Alerts"
      subtitle="Live platform policy · rules in Supabase · alerts derived at read time"
      actions={
        <>
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button onClick={() => setTab("rules")}>
            <Settings2 className="size-3.5" /> Configure rules
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-destructive">Important alerts.</span> Critical and high
        severity items use a distinct red treatment and urgent chime. Handle/reopen is persisted in
        platform_alert_ack.
      </div>

      {loadState.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="size-4 animate-spin" /> Loading platform policies…
        </div>
      )}

      {loadState.status === "error" && (
        <Card className="mb-4">
          <CardHeader title="Could not load policies" />
          <div className="px-5 pb-5 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{loadState.message}</span>
          </div>
        </Card>
      )}

      {loadState.status === "ready" && (
        <>
          {toggleError && (
            <p className="mb-4 text-xs text-destructive">{toggleError}</p>
          )}
          {actionError && (
            <p className="mb-4 text-xs text-destructive">{actionError}</p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Kpi
              label="Active alerts"
              value={String(stats.active)}
              icon={<Siren className="size-3.5" />}
              tone={stats.active ? "down" : "up"}
            />
            <Kpi
              label="Critical"
              value={String(stats.critical)}
              tone={stats.critical ? "down" : "neutral"}
              icon={<ShieldAlert className="size-3.5" />}
            />
            <Kpi label="High" value={String(stats.high)} tone={stats.high ? "down" : "neutral"} />
            <Kpi label="Handled" value={String(stats.handled)} tone="up" />
            <Kpi label="Rules on" value={`${stats.rulesEnabled}/${stats.rulesTotal}`} />
          </div>

          <Card className="mb-4">
            <PageToolbar>
              <ToolbarGroup>
                <SegmentedControl
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "history", label: "History" },
                    { value: "rules", label: "Rules" },
                  ]}
                />
              </ToolbarGroup>
              <ToolbarSpacer />
              {tab !== "rules" && (
                <ToolbarGroup>
                  <Select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as KindFilter)}
                    className="min-w-[200px]"
                  >
                    <option value="all">All kinds</option>
                    <option value="payment_overdue">Payment overdue</option>
                    <option value="renewal_approaching">Renewal approaching</option>
                    <option value="storage_quota_exceeded">Storage quota exceeded</option>
                    <option value="sla_breach">SLA breach</option>
                    <option value="institute_usage_risk">Institute usage risk</option>
                    <option value="support_escalation">Support escalation</option>
                  </Select>
                  <Select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
                    className="min-w-[140px]"
                  >
                    <option value="all">All severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </ToolbarGroup>
              )}
              <ToolbarMeta>
                {tab === "rules"
                  ? `${rules.length} platform rules`
                  : `${filtered.length} derived alerts`}
              </ToolbarMeta>
            </PageToolbar>
          </Card>

          {tab === "rules" ? (
            <RulesPanel
              rules={rules}
              togglingRuleId={togglingRuleId}
              onToggle={(id, enabled) => void handleToggleRule(id, enabled)}
            />
          ) : (
            <AlertsPanel
              alerts={filtered}
              mode={tab === "history" ? "history" : "active"}
              derived
              actingId={actingId}
              onHandled={(id) => void handleAlert(id)}
              onReopen={(id) => void handleReopen(id)}
            />
          )}
        </>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground max-w-3xl leading-relaxed">
        Academic alert rules belong in Admin. Platform incident and security signals require
        persisted audit integration — enable the rules but they appear only when matching data exists.
      </p>
    </AppShell>
  );
}

function PoliciesAlertsDemoPage() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("active");
  const [kind, setKind] = useState<KindFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  useEffect(() => subscribePlatformAlerts(() => setTick((t) => t + 1)), []);

  const all = useMemo(() => listPlatformAlerts(), [tick]);
  const rules = useMemo(() => listPlatformAlertRules(), [tick]);
  const stats = useMemo(() => platformAlertStats(all), [all]);

  const active = useMemo(() => listActivePlatformAlerts(), [tick]);
  const history = useMemo(() => listHandledPlatformAlerts(), [tick]);

  const source = tab === "history" ? history : active;
  const filtered = useMemo(() => {
    return source.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false;
      if (severity !== "all" && a.severity !== severity) return false;
      return true;
    });
  }, [source, kind, severity]);

  return (
    <AppShell
      title="Policies & Alerts"
      subtitle="Demo · platform-level alerts · billing, quota, security, SLA, usage, support"
      actions={
        <Button onClick={() => setTab("rules")}>
          <Settings2 className="size-3.5" /> Configure rules
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Active alerts" value={String(stats.active)} icon={<Siren className="size-3.5" />} tone={stats.active ? "down" : "up"} />
        <Kpi label="Critical" value={String(stats.critical)} tone={stats.critical ? "down" : "neutral"} icon={<ShieldAlert className="size-3.5" />} />
        <Kpi label="High" value={String(stats.high)} tone={stats.high ? "down" : "neutral"} />
        <Kpi label="Handled" value={String(stats.handled)} tone="up" />
        <Kpi label="Rules on" value={`${stats.rulesEnabled}/${stats.rulesTotal}`} />
      </div>

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: "active", label: "Active" },
                { value: "history", label: "History" },
                { value: "rules", label: "Rules" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          {tab !== "rules" && (
            <ToolbarGroup>
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as KindFilter)}
                className="min-w-[200px]"
              >
                <option value="all">All kinds</option>
                <option value="payment_overdue">Payment overdue</option>
                <option value="renewal_approaching">Renewal approaching</option>
                <option value="storage_quota_exceeded">Storage quota exceeded</option>
                <option value="platform_incident">Platform incident</option>
                <option value="security_issue">Security issue</option>
                <option value="sla_breach">SLA breach</option>
                <option value="institute_usage_risk">Institute usage risk</option>
                <option value="support_escalation">Support escalation</option>
              </Select>
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
                className="min-w-[140px]"
              >
                <option value="all">All severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </ToolbarGroup>
          )}
          <ToolbarMeta>
            {tab === "rules"
              ? `${rules.length} platform rules`
              : `${filtered.length} alerts · demo localStorage`}
          </ToolbarMeta>
        </PageToolbar>
      </Card>

      {tab === "rules" ? (
        <RulesPanel
          rules={rules}
          onToggle={(id, enabled) => {
            setAlertRuleEnabled(id, enabled);
            setTick((t) => t + 1);
          }}
        />
      ) : (
        <AlertsPanel
          alerts={filtered}
          mode={tab}
          onHandled={(id) => {
            markAlertHandled(id);
            setTick((t) => t + 1);
          }}
          onReopen={(id) => {
            reopenAlert(id);
            setTick((t) => t + 1);
          }}
        />
      )}

      <p className="mt-4 text-[11px] text-muted-foreground max-w-3xl leading-relaxed">
        Academic alert rules (attendance thresholds, marks, homework) belong in Admin. This surface
        does not send WhatsApp/email — it is the Nexus operator inbox for platform policy signals
        only.
      </p>
    </AppShell>
  );
}

function AlertsPanel({
  alerts,
  mode,
  readOnly,
  derived,
  actingId,
  onHandled,
  onReopen,
}: {
  alerts: PlatformAlert[];
  mode: "active" | "history";
  readOnly?: boolean;
  derived?: boolean;
  actingId?: string | null;
  onHandled?: (id: string) => void;
  onReopen?: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={mode === "active" ? "Active platform alerts" : "Handled history"}
        hint={
          derived
            ? "Derived at read time from live platform data"
            : "Institute or platform scope · never student/teacher/parent records"
        }
      />
      <div className="divide-y divide-border">
        {alerts.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground">
            {mode === "active"
              ? derived
                ? "No derived alerts match these filters — platform signals look healthy."
                : "No active alerts match these filters."
              : "No handled alerts match these filters."}
          </p>
        ) : (
          alerts.map((a) => {
            const urgent =
              mode === "active" && (a.severity === "critical" || a.severity === "high");
            return (
            <div
              key={a.id}
              className={`px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 ${
                urgent ? "border-l-4 border-l-destructive bg-destructive/[0.05]" : ""
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-medium ${urgent ? "text-destructive" : ""}`}>
                    {a.title}
                  </span>
                  <Pill tone={severityTone(a.severity)}>{labelSeverity(a.severity)}</Pill>
                  <Pill tone="neutral">{labelAlertKind(a.kind)}</Pill>
                  {derived && <Pill tone="info">Derived</Pill>}
                  {urgent && (
                    <Pill tone="danger">Important</Pill>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.summary}</p>
                <div className="text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    Scope:{" "}
                    {a.instituteId && a.instituteName ? (
                      <Link
                        to="/institutes/$id"
                        params={{ id: a.instituteId }}
                        className="text-primary hover:underline"
                      >
                        {a.instituteName}
                      </Link>
                    ) : (
                      "Platform-wide"
                    )}
                  </span>
                  <span>Detected {formatAlertDate(a.createdAt)}</span>
                  {a.handledAt && (
                    <span>
                      Handled {formatAlertDate(a.handledAt)}
                      {a.handledBy ? ` · ${a.handledBy}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {!readOnly && mode === "active" && onHandled && (
                  <Button disabled={actingId === a.id} onClick={() => onHandled(a.id)}>
                    <CheckCircle2 className="size-3.5" /> Mark handled
                  </Button>
                )}
                {!readOnly && mode === "history" && onReopen && (
                  <Button disabled={actingId === a.id} onClick={() => onReopen(a.id)}>
                    <RotateCcw className="size-3.5" /> Reopen
                  </Button>
                )}
                {a.kind === "support_escalation" && (
                  <Link to="/support">
                    <Button>Support</Button>
                  </Link>
                )}
                {(a.kind === "payment_overdue" || a.kind === "renewal_approaching") && (
                  <Link to="/billing">
                    <Button>Billing</Button>
                  </Link>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function RulesPanel({
  rules,
  togglingRuleId,
  onToggle,
}: {
  rules: PlatformAlertRule[];
  togglingRuleId?: string | null;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Supported platform rules"
        hint="Enable or pause Nexus policy detectors · not Admin academic rules"
      />
      <div className="px-5 pb-5 space-y-3">
        {rules.map((r) => (
          <div
            key={r.id}
            className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border border-border bg-background/40"
          >
            <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldAlert className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium">{r.name}</div>
                <Pill tone={severityTone(r.severityDefault)}>{labelSeverity(r.severityDefault)}</Pill>
                <Pill tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Paused"}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
              <p className="mt-1.5 text-[10px] font-mono text-muted-foreground">{r.condition}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Updated {formatAlertDate(r.updatedAt)}
              </p>
            </div>
            <Button
              variant={r.enabled ? "outline" : "primary"}
              disabled={togglingRuleId === r.id}
              onClick={() => onToggle(r.id, !r.enabled)}
            >
              {togglingRuleId === r.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {r.enabled ? "Pause rule" : "Enable rule"}
            </Button>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-medium">Out of scope here:</strong> attendance below
          75%, marks thresholds, homework missing, and other single-institute academic rules — configure
          those in Admin.
        </div>
      </div>
    </Card>
  );
}
