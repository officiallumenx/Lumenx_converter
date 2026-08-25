import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Pill,
} from "@lumenx/ui-admin";
import { Bell, Sparkles } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import {
  ATTENDANCE_NOTIFICATION_RECIPIENT_OPTIONS,
  ATTENDANCE_NOTIFICATION_TIMING_OPTIONS,
  ATTENDANCE_NOTIFICATION_TRIGGER_OPTIONS,
  attendanceNotificationTimingLabel,
  attendanceNotificationTriggerLabel,
  emitAttendanceNotifications,
  ensureDailyAttendanceSummariesFlushed,
  listAttendanceNotificationOutbox,
  listAttendanceNotificationQueue,
  loadAttendanceNotificationConfig,
  saveAttendanceNotificationConfig,
  type AttendanceNotificationRecipient,
  type AttendanceNotificationTiming,
  type AttendanceNotificationTrigger,
} from "@lumenx/module-attendance";

function toggleIn<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

const WORKFLOW_STEPS = [
  {
    title: "Admin Settings",
    body: "Configure timing, triggers, and recipients under Attendance Notifications.",
  },
  {
    title: "Attendance marked",
    body: "Teacher or Attendance Coordinator submits a slot via the shared Attendance Engine.",
  },
  {
    title: "Config gate",
    body: "If Disabled → stop. Else require an enabled trigger and at least one recipient.",
  },
  {
    title: "Immediate",
    body: "Deliver Parent / Student messages to the Attendance Notification Inbox right away.",
  },
  {
    title: "Daily Summary",
    body:
      "Queue events for the day; they auto-flush for past dates and after the demo end-of-day hour. Clock-scheduled delivery needs a backend cron.",
  },
] as const;

export function AttendanceNotificationConfigPanel() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);

  const config = useMemo(() => {
    void revision;
    return loadAttendanceNotificationConfig();
  }, [revision]);

  const outbox = useMemo(() => {
    void revision;
    return listAttendanceNotificationOutbox().slice(0, 12);
  }, [revision]);

  const queue = useMemo(() => {
    void revision;
    return listAttendanceNotificationQueue();
  }, [revision]);

  const [timing, setTiming] = useState<AttendanceNotificationTiming>(config.timing);
  const [triggers, setTriggers] = useState<AttendanceNotificationTrigger[]>(config.triggers);
  const [recipients, setRecipients] = useState<AttendanceNotificationRecipient[]>(
    config.recipients,
  );

  useEffect(() => {
    setTiming(config.timing);
    setTriggers(config.triggers);
    setRecipients(config.recipients);
  }, [config]);

  useEffect(() => {
    // Auto-flush due Daily Summaries when Admin opens this panel (no manual trigger).
    const delivered = ensureDailyAttendanceSummariesFlushed();
    if (delivered.length) setRevision((n) => n + 1);
  }, []);

  const save = () => {
    if (timing !== "no_notification" && triggers.length === 0) {
      notify("Select at least one notification trigger");
      return;
    }
    if (timing !== "no_notification" && recipients.length === 0) {
      notify("Select at least one recipient");
      return;
    }
    saveAttendanceNotificationConfig({
      timing,
      triggers,
      recipients,
      updatedBy: user?.name || "Admin",
    });
    setRevision((n) => n + 1);
    notify("Attendance notification settings saved");
  };

  const simulate = (trigger: AttendanceNotificationTrigger) => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const messages = emitAttendanceNotifications({
      trigger,
      date,
      sectionKey: "10::B",
      classLabel: "10",
      section: "B",
      slotId: trigger === "period_absence" ? "slot:period:1" : "slot:day",
      slotLabel: trigger === "period_absence" ? "P2 · Mathematics" : "Full day",
      // Canonical attendance student id for Parent child C1 (Class 10-B roll 14)
      students: [{ id: "stu:10:B:14", name: "Aarav Sharma" }],
    });
    setRevision((n) => n + 1);
    notify(
      messages.length
        ? `Flow ran · ${messages.length} notification(s) (${attendanceNotificationTimingLabel(timing)})`
        : "Flow skipped · check timing, triggers, and recipients",
    );
  };

  const disabled = timing === "no_notification";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Attendance Notifications"
          hint="Admin Settings · timing · triggers · recipients"
        />
        <CardBody className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
            Current:{" "}
            <span className="font-medium text-foreground">
              {attendanceNotificationTimingLabel(config.timing)}
            </span>
            {" · "}
            {config.triggers.map(attendanceNotificationTriggerLabel).join(", ") || "No triggers"}
            {" · "}
            {config.recipients.map((r) => (r === "parent" ? "Parent" : "Student")).join(", ") ||
              "No recipients"}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Options</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ATTENDANCE_NOTIFICATION_TIMING_OPTIONS.map((opt) => {
                const on = timing === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTiming(opt.value)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      on
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
            <p className="text-xs font-semibold text-foreground">Triggers</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ATTENDANCE_NOTIFICATION_TRIGGER_OPTIONS.map((opt) => {
                const on = triggers.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTriggers((prev) => toggleIn(prev, opt.value))}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                      on
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
            <p className="text-xs font-semibold text-foreground">Recipients</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ATTENDANCE_NOTIFICATION_RECIPIENT_OPTIONS.map((opt) => {
                const on = recipients.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRecipients((prev) => toggleIn(prev, opt.value))}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                      on
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={save}>
              <Bell className="size-3.5" /> Save notification settings
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Notification workflow"
          hint="Frontend-only · localStorage outbox / queue / inbox"
        />
        <CardBody className="space-y-4">
          <ol className="space-y-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-[11px] font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold text-foreground">Try the flow</p>
            <p className="text-[11px] text-muted-foreground">
              Submit attendance in Connect / Student Attendance, or simulate an absence here.
              Daily Summary queues auto-flush (past days / after 4:00 PM local) — no manual flush.
              {queue.length ? ` · ${queue.length} event(s) still queued.` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => simulate("daily_absence")}>
                <Sparkles className="size-3.5" /> Daily Absent
              </Button>
              <Button size="sm" variant="outline" onClick={() => simulate("period_absence")}>
                <Sparkles className="size-3.5" /> Period Absent
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Notification outbox"
          hint="Recent demo messages · merged into Connect Attendance inbox"
        />
        <CardBody className="p-0">
          {outbox.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              No notifications yet. Save settings and run a simulation or submit attendance.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {outbox.map((msg) => (
                <li key={msg.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{msg.title}</span>
                    <Pill tone={msg.status === "delivered" ? "success" : "neutral"}>
                      {msg.status}
                    </Pill>
                    <Pill tone="info">
                      {msg.recipient === "parent" ? "Parent" : "Student"}
                    </Pill>
                    <Pill tone="warning">
                      {attendanceNotificationTriggerLabel(msg.trigger)}
                    </Pill>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                    {msg.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
