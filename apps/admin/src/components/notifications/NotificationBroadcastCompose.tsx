import { useMemo, useState } from "react";
import {
  BroadcastAudiencePicker,
  EMPTY_BROADCAST_AUDIENCE,
  formatBroadcastAudience,
  isBroadcastAudienceValid,
  type BroadcastAudienceValue,
} from "@/components/BroadcastAudiencePicker";
import { DateTimePicker12h, formatDateTime12h } from "@/components/DateTimePicker12h";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Field,
  TextInput,
  TextArea,
  Select,
} from "@lumenx/ui-admin";
import { CalendarClock, Send } from "lucide-react";
import { publishBroadcastNotification } from "@lumenx/notifications";
import { prependAdminNotification } from "@/lib/notification-center-store";

function audienceKindFrom(
  v: BroadcastAudienceValue,
): "everyone" | "parents" | "students" | "teachers" | "class_section" | "group" {
  if (v.role === "All") return "everyone";
  if (v.mode === "selective" && (v.classFilter || v.section)) return "class_section";
  if (v.role === "Parents") return "parents";
  if (v.role === "Students") return "students";
  if (v.role === "Teachers") return "teachers";
  return "group";
}

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Broadcast = {
  id: string;
  title: string;
  audience: string;
  time: string;
  priority: "normal" | "high" | "critical";
};

const INITIAL: Broadcast[] = [
  {
    id: "1",
    title: "Exam schedule released",
    audience: "All Students, All Parents",
    time: "2h ago",
    priority: "high",
  },
  {
    id: "2",
    title: "PTM rescheduled to Saturday",
    audience: "Grade 9–10 Parents",
    time: "Yesterday",
    priority: "normal",
  },
  {
    id: "3",
    title: "Sports day participation form",
    audience: "All Students",
    time: "2d ago",
    priority: "normal",
  },
  {
    id: "4",
    title: "Emergency: School closed tomorrow",
    audience: "Everyone",
    time: "1w ago",
    priority: "critical",
  },
];

/** Outbound broadcast composer (kept alongside the Notification Center inbox). */
export function NotificationBroadcastCompose() {
  const notify = useAdminToast();
  const [recent, setRecent] = useState(INITIAL);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<BroadcastAudienceValue>(EMPTY_BROADCAST_AUDIENCE);
  const [priority, setPriority] = useState<"normal" | "high" | "critical">("normal");
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = useState(nowDateTimeLocal);

  const [attachmentName, setAttachmentName] = useState("");
  const [deepLink, setDeepLink] = useState("/notifications");

  const minDateTime = useMemo(() => nowDateTimeLocal(), []);
  const scheduleValid = schedule === "now" || scheduleAt.trim().length > 0;
  const canSend =
    Boolean(title.trim()) && isBroadcastAudienceValid(audience) && scheduleValid;

  const send = () => {
    if (!canSend) return;
    const audienceLabel = formatBroadcastAudience(audience);
    const entry: Broadcast = {
      id: String(Date.now()),
      title: title.trim(),
      audience: audienceLabel,
      time: schedule === "now" ? "Just now" : `Scheduled · ${formatDateTime12h(scheduleAt)}`,
      priority,
    };
    const published = publishBroadcastNotification({
      id: entry.id,
      title: entry.title,
      message: message.trim(),
      audienceLabel,
      audienceKind: audienceKindFrom(audience),
      classFilter: audience.classFilter || undefined,
      section: audience.section || undefined,
      priority,
      sender: "Admin",
      href: deepLink.trim() || "/notifications",
      attachmentName: attachmentName.trim() || null,
      time: entry.time,
    });
    prependAdminNotification({
      id: published.appNotification.id,
      title: published.appNotification.title,
      desc: published.appNotification.desc,
      detail: published.broadcast.message,
      time: entry.time,
      type: priority === "critical" ? "warning" : priority === "high" ? "warning" : "info",
      category: "circulars",
      unread: true,
      priority: priority === "normal" ? "normal" : "high",
      createdAt: new Date().toISOString(),
      href: published.broadcast.href ?? "/notifications",
      templateId: published.foundation.templateId,
    });
    setRecent((prev) => [entry, ...prev]);
    setTitle("");
    setMessage("");
    setAttachmentName("");
    setDeepLink("/notifications");
    setSchedule("now");
    setScheduleAt(nowDateTimeLocal());
    setAudience(EMPTY_BROADCAST_AUDIENCE);
    notify(
      schedule === "now"
        ? `Broadcast sent to ${entry.audience} · ${priority} priority`
        : `Broadcast scheduled · ${formatDateTime12h(scheduleAt)} · ${entry.audience}`,
    );
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Compose Broadcast" />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Title" required>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-term exam schedule"
            />
          </Field>
          <Field label="Message">
            <TextArea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement…"
            />
          </Field>

          <BroadcastAudiencePicker value={audience} onChange={setAudience} required />

          <Field label="Schedule" required>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSchedule("now")}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  schedule === "now"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                Send now
                <div className="mt-0.5 text-[10px] font-normal opacity-80">Deliver immediately</div>
              </button>
              <button
                type="button"
                onClick={() => setSchedule("later")}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  schedule === "later"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                Schedule later
                <div className="mt-0.5 text-[10px] font-normal opacity-80">Pick date & time</div>
              </button>
            </div>
          </Field>

          {schedule === "later" ? (
            <Field label="Date & time" required hint="12-hour clock with AM / PM">
              <DateTimePicker12h value={scheduleAt} onChange={setScheduleAt} min={minDateTime} />
            </Field>
          ) : null}

          <Field label="Attachment (optional)" hint="File name only — no upload in demo">
            <TextInput
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="e.g. exam-schedule.pdf"
            />
          </Field>

          <Field label="Deep link (optional)">
            <TextInput
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/notifications"
            />
          </Field>

          <Field label="Priority">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical (Push)</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => notify("Draft saved")}>Save draft</Button>
            <Button variant="primary" onClick={send} disabled={!canSend}>
              {schedule === "later" ? (
                <>
                  <CalendarClock className="size-3.5" /> Schedule broadcast
                </>
              ) : (
                <>
                  <Send className="size-3.5" /> Send broadcast
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Recent Broadcasts" />
        <div className="px-5 pb-5 divide-y divide-border">
          {recent.map((n) => (
            <div key={n.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                {n.priority === "critical" && <Pill tone="danger">Critical</Pill>}
                {n.priority === "high" && <Pill tone="warning">High</Pill>}
                {n.priority === "normal" && <Pill tone="info">Normal</Pill>}
                <span className="text-[10px] text-muted-foreground ml-auto">{n.time}</span>
              </div>
              <div className="text-xs font-medium">{n.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">→ {n.audience}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
