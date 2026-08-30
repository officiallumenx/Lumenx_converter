import { useEffect, useRef, useState } from "react";
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
  loadAlertRules,
  resolveAlertRulesView,
  runAlertRulesEvaluation,
  shouldCommitAlertRulesLoad,
  updateAlertRule,
  type AlertFireDto,
  type AlertRuleDto,
  type AlertRulesLoadStatus,
} from "@/lib/alert-rules-api";
import { Pencil, Plus, Play, Siren, Trash2 } from "lucide-react";

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
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [rules, setRules] = useState<AlertRuleDto[]>([]);
  const [fired, setFired] = useState<AlertFireDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<AlertRulesLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRuleDto | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState("P2");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState<AlertRuleDto["iconKey"]>(
    "complaint",
  );
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setRules([]);
      setFired([]);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setRules([]);
      setFired([]);
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
      setRules([]);
      setFired([]);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadAlertRules(requestInstituteId).then((next) => {
      if (
        !shouldCommitAlertRulesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setRules(next.rules);
      setFired([]);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

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
      setReloadKey((k) => k + 1);
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
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const removeRule = async (rule: AlertRuleDto) => {
    try {
      await deleteAlertRule(rule.id);
      notify(`Deleted ${rule.name}`);
      setReloadKey((k) => k + 1);
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
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setFired(nextFired);
        notify(
          nextFired.length === 0
            ? "Evaluation complete · no rules fired"
            : `Evaluation complete · ${nextFired.length} fired`,
        );
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to evaluate alert rules");
      })
      .finally(() => setEvaluating(false));
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
          hint="Rules persist in alert_rule. Evaluate is on-demand (not stored) and only fires for complaint-trigger rules vs open high-priority complaints."
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
                      {r.iconKey === "complaint" ? "complaint · evaluated" : `${r.iconKey} · stored only`}
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
          <CardHeader title="Evaluation results" hint="In-memory for this session. Fires are not written to the database." />
          <div className="px-5 pb-5 space-y-2">
            {view.fired.map((f) => (
              <div key={f.id} className="text-sm border border-border rounded-lg p-3">
                <div className="font-medium">{f.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{f.at}</div>
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
              <option value="warning">Warning (stored only · not evaluated)</option>
              <option value="attendance">Attendance (stored only · not evaluated)</option>
              <option value="security">Security (stored only · not evaluated)</option>
              <option value="emergency">Emergency (stored only · not evaluated)</option>
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
