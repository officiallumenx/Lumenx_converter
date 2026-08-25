import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
import { appendBroadcastInbox, postDemoSync } from "@lumenx/utils";
import {
  notifySystemOpsCritical,
  notifySystemWarning,
} from "@lumenx/module-notifications";
import {
  BroadcastAudiencePicker,
  EMPTY_BROADCAST_AUDIENCE,
  formatBroadcastAudience,
  isBroadcastAudienceValid,
  type BroadcastAudienceValue,
} from "@/components/BroadcastAudiencePicker";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Modal,
  Field,
  Select,
  TextInput,
  TextArea,
} from "@lumenx/ui-admin";
import {
  Plus,
  Siren,
  ShieldAlert,
  AlertTriangle,
  MessageSquareWarning,
  ClipboardCheck,
} from "lucide-react";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { useEffect, useMemo, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  addAlertRule,
  resolveAlertFire,
  scheduleAlertRuleEvaluation,
  toggleAlertRuleActive,
  updateAlertRuleConfig,
  useAlertRulesState,
  type AlertRuleIconKey,
} from "@/lib/alert-rules-store";
import { loadStudentDirectory } from "@/lib/student-directory-store";
import { DEMO_COMPLAINTS_SEED } from "@/lib/complaints-data";
import { loadDemoComplaints } from "@lumenx/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — LumenX Admin" }] }),
  component: AlertsPage,
});

const RULE_ICONS: Record<AlertRuleIconKey, typeof ClipboardCheck> = {
  attendance: ClipboardCheck,
  warning: AlertTriangle,
  complaint: MessageSquareWarning,
  security: ShieldAlert,
  emergency: Siren,
};

function AlertsPage() {
  const notify = useAdminToast();
  const { rules, fired } = useAlertRulesState();
  const fired24h = fired.filter((row) => Date.now() - Date.parse(row.at) <= 24 * 60 * 60 * 1000).length;
  const activeAlerts = useMemo(
    () => fired.filter((row) => !row.resolvedAt).slice().sort((a, b) => b.at.localeCompare(a.at)),
    [fired],
  );
  const alertHistory = useMemo(
    () => fired.filter((row) => Boolean(row.resolvedAt)).slice().sort((a, b) => b.at.localeCompare(a.at)),
    [fired],
  );
  const ruleById = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules]);
  const studentsById = useMemo(
    () => new Map(loadStudentDirectory().map((row) => [row.id, row])),
    [],
  );
  const complaintsById = useMemo(
    () => new Map(loadDemoComplaints(DEMO_COMPLAINTS_SEED).map((row) => [row.id, row])),
    [],
  );
  const [open, setOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState("P2");
  const [ruleTrigger, setRuleTrigger] = useState("Attendance");
  const [ruleAudience, setRuleAudience] = useState("Class teachers");
  const [ruleCondition, setRuleCondition] = useState("");
  const [emergencies, setEmergencies] = useState<{ id: string; title: string; audience: string }[]>([]);
  const [emergencyTitle, setEmergencyTitle] = useState("");
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [emergencyAudience, setEmergencyAudience] =
    useState<BroadcastAudienceValue>(EMPTY_BROADCAST_AUDIENCE);
  const [attendanceThresholdInput, setAttendanceThresholdInput] = useState("");
  const [performanceThresholdInput, setPerformanceThresholdInput] = useState("");
  const [performanceConsecutiveInput, setPerformanceConsecutiveInput] = useState("");

  const canSendEmergency =
    Boolean(emergencyTitle.trim() && emergencyMsg.trim()) &&
    isBroadcastAudienceValid(emergencyAudience);

  const resetEmergency = () => {
    setEmergencyTitle("");
    setEmergencyMsg("");
    setEmergencyAudience(EMPTY_BROADCAST_AUDIENCE);
  };

  useEffect(() => {
    scheduleAlertRuleEvaluation();
  }, []);

  useEffect(() => {
    const attendanceRule = rules.find((row) => row.id === "1");
    const weakRule = rules.find((row) => row.id === "2");
    setAttendanceThresholdInput(String(attendanceRule?.config?.thresholdPct ?? 75));
    setPerformanceThresholdInput(String(weakRule?.config?.thresholdPct ?? 40));
    setPerformanceConsecutiveInput(String(weakRule?.config?.consecutiveExams ?? 2));
  }, [rules]);

  const createRule = () => {
    if (!ruleName.trim()) return;
    addAlertRule({
      id: String(Date.now()),
      name: ruleName.trim(),
      iconKey: "warning",
      desc: ruleCondition.trim() || `${ruleTrigger} · custom rule`,
      priority: rulePriority.startsWith("P0") ? "P0" : "P2",
      channels: ["Email"],
      audience: ruleAudience,
      active: true,
    });
    setRuleName("");
    setRuleCondition("");
    setOpen(false);
    notify(`Alert rule "${ruleName.trim()}" created`);
  };

  const sendEmergency = () => {
    if (!canSendEmergency) return;
    const audience = formatBroadcastAudience(emergencyAudience);
    const title = emergencyTitle.trim();
    const id = String(Date.now());
    setEmergencies((prev) => [{ id, title, audience }, ...prev]);
    appendBroadcastInbox({
      id,
      title,
      message: emergencyMsg.trim(),
      audience,
      priority: "critical",
      time: "Just now",
    });
    notifySystemOpsCritical({
      id: `emergency-${id}`,
      title,
      message: emergencyMsg.trim() || title,
    });
    notifySystemWarning({
      id: `emergency-warn-${id}`,
      title,
      message: `Emergency broadcast sent to ${audience}.`,
    });
    postDemoSync("emergency", { id, title, audience });
    resetEmergency();
    setEmergencyOpen(false);
    notify(`Emergency "${title}" sent · ${audience}`);
  };

  const saveAttendanceThreshold = () => {
    const threshold = Number(attendanceThresholdInput);
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
      notify("Attendance threshold must be between 1 and 100");
      return;
    }
    updateAlertRuleConfig("1", { thresholdPct: Math.round(threshold) });
    scheduleAlertRuleEvaluation();
    notify(`Attendance threshold updated to ${Math.round(threshold)}%`);
  };

  const saveWeakPerformanceThreshold = () => {
    const threshold = Number(performanceThresholdInput);
    const consecutive = Number(performanceConsecutiveInput);
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
      notify("Performance threshold must be between 1 and 100");
      return;
    }
    if (!Number.isFinite(consecutive) || consecutive < 2 || consecutive > 10) {
      notify("Consecutive exams must be between 2 and 10");
      return;
    }
    updateAlertRuleConfig("2", {
      thresholdPct: Math.round(threshold),
      consecutiveExams: Math.round(consecutive),
    });
    scheduleAlertRuleEvaluation();
    notify(
      `Weak performance rule updated: ${Math.round(consecutive)} exams below ${Math.round(threshold)}%`,
    );
  };

  return (
    <AppShell
      title={M.alerts}
      subtitle="Configure operational, academic & emergency alert rules"
      actions={
        <>
          <Button variant="danger" onClick={() => setEmergencyOpen(true)}>
            <Siren className="size-3.5" /> Emergency broadcast
          </Button>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New rule
          </Button>
        </>
      }
    >
      <div className="lx-kpi-grid lx-kpi-grid--3 mb-3">
        {[
          { label: "Active rules", value: String(rules.filter((r) => r.active).length) },
          { label: "Alerts fired · 24h", value: String(fired24h) },
            { label: "Active alerts", value: String(activeAlerts.length) },
        ].map((s) => (
          <Card key={s.label}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="lx-kpi-stat__value tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      {emergencies.length > 0 ? (
        <Card className="mb-6">
          <CardHeader title="Recent emergency broadcasts" hint="Stored locally until backend" />
          <div className="px-5 pb-5 space-y-2">
            {emergencies.map((e) => (
              <div key={e.id} className="text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-muted-foreground"> · {e.audience}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Alert rules"
          hint="Priorities map to delivery channels and on-call routing"
        />
        <div className="px-5 pb-5 space-y-3">
          {rules.map((r) => {
            const Icon = RULE_ICONS[r.iconKey] ?? AlertTriangle;
            return (
              <div
                key={r.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-background/40"
              >
                <IconChip icon={Icon} size="md" variant={r.priority === "P0" ? "danger" : "brand"} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">{r.name}</div>
                    <Pill tone={r.priority === "P0" ? "danger" : "warning"}>{r.priority}</Pill>
                    {r.channels.map((c) => (
                      <Pill key={c} tone="neutral">
                        {c}
                      </Pill>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    Routed to: <span className="text-foreground">{r.audience}</span>
                  </div>
                  {r.id === "1" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <Field label="Attendance threshold %" className="min-w-[12rem]">
                        <TextInput
                          value={attendanceThresholdInput}
                          onChange={(e) => setAttendanceThresholdInput(e.target.value)}
                          inputMode="numeric"
                        />
                      </Field>
                      <Button onClick={saveAttendanceThreshold}>Save threshold</Button>
                    </div>
                  ) : null}
                  {r.id === "2" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <Field label="Marks threshold %" className="min-w-[12rem]">
                        <TextInput
                          value={performanceThresholdInput}
                          onChange={(e) => setPerformanceThresholdInput(e.target.value)}
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="Consecutive exams" className="min-w-[12rem]">
                        <TextInput
                          value={performanceConsecutiveInput}
                          onChange={(e) => setPerformanceConsecutiveInput(e.target.value)}
                          inputMode="numeric"
                        />
                      </Field>
                      <Button onClick={saveWeakPerformanceThreshold}>Save thresholds</Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.active ? "success" : "neutral"}>
                    {r.active ? "Active" : "Paused"}
                  </Pill>
                  <Button
                    onClick={() => {
                      toggleAlertRuleActive(r.id);
                      notify(`${r.active ? "Paused" : "Activated"} ${r.name}`);
                    }}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Active alerts"
          hint="Current unresolved alerts generated by active rules"
        />
        <div className="px-5 pb-5 space-y-3">
          {activeAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active alerts.</p>
          ) : (
            activeAlerts.map((row) => {
              const rule = ruleById.get(row.ruleId);
              const student = row.studentId ? studentsById.get(row.studentId) : undefined;
              const complaint = row.complaintId ? complaintsById.get(row.complaintId) : undefined;
              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-border bg-background/40 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{row.title}</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        resolveAlertFire(row.id);
                        notify("Alert marked handled");
                      }}
                    >
                      Mark handled
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Rule: <span className="text-foreground">{rule?.name ?? row.ruleId}</span>
                  </div>
                  {student ? (
                    <div className="text-[11px] text-muted-foreground">
                      Student: <span className="text-foreground">{student.name}</span> · Class{" "}
                      <span className="text-foreground">{student.grade}</span>
                    </div>
                  ) : null}
                  {complaint ? (
                    <div className="text-[11px] text-muted-foreground">
                      Record: <span className="text-foreground">{complaint.id}</span> ·{" "}
                      <span className="text-foreground">{complaint.title}</span>
                    </div>
                  ) : null}
                  <div className="text-[11px] text-muted-foreground">
                    Triggered: {new Date(row.at).toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Alert history"
          hint="Resolved alerts preserved for audit trail in demo store"
        />
        <div className="px-5 pb-5 space-y-3">
          {alertHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resolved alerts yet.</p>
          ) : (
            alertHistory.map((row) => {
              const rule = ruleById.get(row.ruleId);
              return (
                <div key={row.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                  <div className="text-sm font-medium">{row.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Rule: <span className="text-foreground">{rule?.name ?? row.ruleId}</span> ·
                    Triggered {new Date(row.at).toLocaleString("en-IN")} · Resolved{" "}
                    {row.resolvedAt ? new Date(row.resolvedAt).toLocaleString("en-IN") : "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New alert rule"
        subtitle="Define trigger, priority, audience and channel"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createRule} disabled={!ruleName.trim()}>
              Create rule
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rule name" required>
            <TextInput
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Late fee overdue"
            />
          </Field>
          <Field label="Priority" required>
            <Select value={rulePriority} onChange={(e) => setRulePriority(e.target.value)}>
              <option>P0 · Critical</option>
              <option>P1 · High</option>
              <option>P2 · Medium</option>
              <option>P3 · Low</option>
            </Select>
          </Field>
          <Field label="Trigger source" required>
            <Select value={ruleTrigger} onChange={(e) => setRuleTrigger(e.target.value)}>
              <option>Attendance</option>
              <option>Exam scores</option>
              <option>Complaints SLA</option>
              <option>Security</option>
              <option>Custom webhook</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={ruleAudience} onChange={(e) => setRuleAudience(e.target.value)}>
              <option>Class teachers</option>
              <option>Heads of Department</option>
              <option>Principal</option>
              <option>Parents</option>
              <option>Institute-wide</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Trigger condition">
              <TextArea
                placeholder="e.g. attendance_monthly < 75"
                value={ruleCondition}
                onChange={(e) => setRuleCondition(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={emergencyOpen}
        onClose={() => {
          resetEmergency();
          setEmergencyOpen(false);
        }}
        title="Emergency broadcast"
        subtitle="Critical alert · title, message, and audience"
        size="lg"
        footer={
          <>
            <Button
              onClick={() => {
                resetEmergency();
                setEmergencyOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={sendEmergency} disabled={!canSendEmergency}>
              <Siren className="size-3.5" /> Send now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <TextInput
              value={emergencyTitle}
              onChange={(e) => setEmergencyTitle(e.target.value)}
              placeholder="e.g. School closed tomorrow"
            />
          </Field>
          <Field label="Message" required>
            <TextArea
              rows={4}
              value={emergencyMsg}
              onChange={(e) => setEmergencyMsg(e.target.value)}
              placeholder="e.g. Institute closed due to severe weather. All classes suspended."
            />
          </Field>
          <BroadcastAudiencePicker
            value={emergencyAudience}
            onChange={setEmergencyAudience}
            required
          />
        </div>
      </Modal>
    </AppShell>
  );
}
