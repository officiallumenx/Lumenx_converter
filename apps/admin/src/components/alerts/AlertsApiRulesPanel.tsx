import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Pill,
  Select,
  TextInput,
  TextArea,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createAlertRule,
  deleteAlertRule,
  resolveAlertRulesView,
  runAlertRulesEvaluation,
  resolveAlertFire,
  updateAlertRule,
  type AlertFireDto,
  type AlertRuleDto,
  type AlertRulesLoadStatus,
  type AlertRulesState,
} from "@/lib/alert-rules-api";
import { Pencil, Plus, Play, Siren, Trash2 } from "lucide-react";
import {
  useAlertRulesQuery,
  adminModulePrefix,
  adminQueryKeys,
  adminQueryRoots,
} from "@/lib/admin-queries";

function statusHint(status: AlertRulesLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading alert rules…";
  if (status === "needs_institute") return "Select an institute to load alert rules.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load alert rules.";
  if (status === "empty") return "No alert rules yet.";
  return "";
}

export function AlertsApiRulesPanel() {
  const notify = useAdminToast();
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [evaluating, setEvaluating] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRuleDto | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState("P2");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState<AlertRuleDto["iconKey"]>(
    "complaint",
  );

  const alertsEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const alertsQuery = useAlertRulesQuery(
    instituteCtx.activeInstituteId,
    alertsEnabled,
  );

  const rules = alertsQuery.data?.rules ?? [];
  const fired = alertsQuery.data?.fired ?? [];
  const loadStatus: AlertRulesLoadStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : alertsQuery.isLoading && !alertsQuery.data
              ? "loading"
              : (alertsQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (alertsQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    alertsQuery.data && alertsEnabled ? instituteCtx.activeInstituteId : null;

  const view = resolveAlertRulesView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedRules: rules,
    storedFired: fired,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);

  const invalidateAlerts = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.alerts),
    });
  };

  const patchAlertsCache = (updater: (prev: AlertRulesState) => AlertRulesState) => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    queryClient.setQueryData(
      adminQueryKeys.alerts(id),
      (prev: AlertRulesState | undefined) => (prev ? updater(prev) : prev),
    );
  };

  const resetForm = () => {
    setEditing(null);
    setRuleName("");
    setRuleDesc("");
    setRulePriority("P2");
    setRuleTrigger("complaint");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (rule: AlertRuleDto) => {
    setEditing(rule);
    setRuleName(rule.name);
    setRuleDesc(rule.desc);
    setRulePriority(rule.priority);
    setRuleTrigger(rule.iconKey);
    setOpen(true);
  };

  const saveRule = async () => {
    if (!ruleName.trim()) return;
    const priority = (
      ["P0", "P1", "P2", "P3"] as const
    ).includes(rulePriority as AlertRuleDto["priority"])
      ? (rulePriority as AlertRuleDto["priority"])
      : "P2";
    try {
      if (editing) {
        await updateAlertRule(editing.id, {
          name: ruleName.trim(),
          desc: ruleDesc.trim() || "Custom alert rule",
          priority,
          iconKey: ruleTrigger,
        });
        notify(`Updated ${ruleName.trim()}`);
      } else {
        if (!instituteCtx.activeInstituteId) return;
        await createAlertRule({
          instituteId: instituteCtx.activeInstituteId,
          name: ruleName.trim(),
          desc: ruleDesc.trim() || undefined,
          priority,
          iconKey: ruleTrigger,
        });
        notify(`Alert rule "${ruleName.trim()}" created`);
      }
      resetForm();
      setOpen(false);
      invalidateAlerts();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : editing
            ? "Failed to update rule"
            : "Failed to create rule",
      );
    }
  };

  const toggleActive = async (rule: AlertRuleDto) => {
    try {
      await updateAlertRule(rule.id, { active: !rule.active });
      notify(`${rule.active ? "Paused" : "Activated"} ${rule.name}`);
      invalidateAlerts();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const removeRule = async (rule: AlertRuleDto) => {
    try {
      await deleteAlertRule(rule.id);
      notify(`Deleted ${rule.name}`);
      invalidateAlerts();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const runEvaluate = () => {
    if (!instituteCtx.activeInstituteId || evaluating) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    setEvaluating(true);
    void runAlertRulesEvaluation(requestInstituteId)
      .then((nextFired) => {
        if (instituteCtx.activeInstituteId !== requestInstituteId) return;
        patchAlertsCache((prev) => ({ ...prev, fired: nextFired }));
        notify(
          nextFired.length === 0
            ? "Evaluation complete · no active fires"
            : `${nextFired.length} active alert fire(s)`,
        );
        if (nextFired.length > 0) {
          void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
            const first = nextFired[0]!;
            dispatchInAppAlert({
              title: first.title,
              body:
                nextFired.length === 1
                  ? "Alert rule fired — review on Alerts"
                  : `${nextFired.length} alert rules fired — review on Alerts`,
              href: "/alerts",
              variant: "alert",
              severity: "mandatory",
            });
          });
        }
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to evaluate alert rules");
      })
      .finally(() => setEvaluating(false));
  };

  const markFireHandled = async (fire: AlertFireDto) => {
    try {
      await resolveAlertFire(fire.id);
      patchAlertsCache((prev) => ({
        ...prev,
        fired: prev.fired.filter((row) => row.id !== fire.id),
      }));
      notify("Alert marked handled");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to mark handled");
    }
  };

  return (
    <>
      <div className="lx-kpi-grid lx-kpi-grid--3 mb-3">
        {[
          { label: "Active rules", value: String(view.rules.filter((r) => r.active).length) },
          { label: "Fired (evaluate)", value: String(view.fired.length) },
          { label: "Total rules", value: String(view.rules.length) },
        ].map((s) => (
          <Card key={s.label}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="lx-kpi-stat__value tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Alert rules"
          hint="Rules persist in alert_rule. Evaluate checks attendance, complaints, transport emergencies, and school emergencies. Active fires persist until marked handled."
          action={
            <div className="flex flex-wrap gap-2">
              {writesEnabled ? (
                <Button
                  variant="outline"
                  disabled={evaluating || !view.rowsValid}
                  onClick={runEvaluate}
                >
                  <Play className="size-3.5" /> Run evaluation
                </Button>
              ) : null}
              {writesEnabled ? (
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="size-3.5" /> New rule
                </Button>
              ) : undefined}
            </div>
          }
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {view.rules.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-background/40"
              >
                <Siren className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">{r.name}</div>
                    <Pill tone={r.priority === "P0" ? "danger" : "warning"}>{r.priority}</Pill>
                    <Pill tone={r.iconKey === "complaint" ? "success" : "neutral"}>
                      {r.iconKey} · evaluated
                    </Pill>
                    {r.channels.map((c) => (
                      <Pill key={c} tone="neutral">
                        {c}
                      </Pill>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.active ? "success" : "neutral"}>
                    {r.active ? "Active" : "Paused"}
                  </Pill>
                  {writesEnabled ? (
                    <Button onClick={() => openEdit(r)} aria-label={`Edit ${r.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                  {writesEnabled ? (
                    <Button onClick={() => void toggleActive(r)}>
                      {r.active ? "Pause" : "Activate"}
                    </Button>
                  ) : null}
                  {writesEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => void removeRule(r)}
                      aria-label={`Delete ${r.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {view.fired.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Active alert fires" hint="Persisted evaluation results. Mark handled when resolved." />
          <div className="px-5 pb-5 space-y-2">
            {view.fired.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 text-sm border border-border rounded-lg p-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{f.title}</div>
                  {f.detail ? (
                    <div className="text-xs text-muted-foreground mt-1">{f.detail}</div>
                  ) : null}
                  <div className="text-[11px] text-muted-foreground mt-1">{f.at}</div>
                </div>
                {writesEnabled ? (
                  <Button size="sm" onClick={() => void markFireHandled(f)}>
                    Mark handled
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal
        open={writesEnabled && open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title={editing ? "Edit alert rule" : "New alert rule"}
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveRule()} disabled={!ruleName.trim()}>
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Rule name" required>
            <TextInput
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Late fee overdue"
            />
          </Field>
          <Field label="Priority" required>
            <Select value={rulePriority} onChange={(e) => setRulePriority(e.target.value)}>
              <option value="P0">P0 · Critical</option>
              <option value="P1">P1 · High</option>
              <option value="P2">P2 · Medium</option>
              <option value="P3">P3 · Low</option>
            </Select>
          </Field>
          <Field label="Trigger" required>
            <Select
              value={ruleTrigger}
              onChange={(e) =>
                setRuleTrigger(
                  (e.target.value as AlertRuleDto["iconKey"]) || "complaint",
                )
              }
            >
              <option value="complaint">Open high-priority complaints (evaluated)</option>
              <option value="warning">Warning (open issues)</option>
              <option value="attendance">Attendance (below threshold)</option>
              <option value="security">Security (transport emergencies)</option>
              <option value="emergency">Emergency (school broadcasts)</option>
            </Select>
          </Field>
          <Field label="Description">
            <TextArea
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              placeholder="Trigger condition summary"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
