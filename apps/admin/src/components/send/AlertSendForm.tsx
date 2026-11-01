import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import {
  CalendarDays,
  CloudRain,
  HeartPulse,
  Loader2,
  Megaphone,
  Send,
  Siren,
  ShieldAlert,
} from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import {
  broadcastSchoolAlert,
  type SchoolAlertAudience,
  type SchoolAlertCategory,
  type SchoolAlertSeverity,
} from "@/lib/school-alerts";
import { shouldIgnoreDuplicateSendClick } from "@/lib/communications/send-category";

type BroadcastPreset = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Siren;
  severity: SchoolAlertSeverity;
  category: SchoolAlertCategory;
  sourceLabel: string;
  titlePlaceholder: string;
  summaryPlaceholder: string;
  detailPlaceholder: string;
};

const PRESETS: BroadcastPreset[] = [
  {
    id: "holiday",
    label: "Holiday",
    hint: "Scheduled break · mandatory for parents & students",
    icon: CalendarDays,
    severity: "mandatory",
    category: "holiday",
    sourceLabel: "Holidays",
    titlePlaceholder: "Holiday — school closed on …",
    summaryPlaceholder: "Institute closed for the holiday.",
    detailPlaceholder: "All classes and activities are suspended on the listed dates.",
  },
  {
    id: "closure",
    label: "Emergency closure",
    hint: "Urgent shutdown · emergency severity",
    icon: Siren,
    severity: "emergency",
    category: "closure",
    sourceLabel: "Emergency",
    titlePlaceholder: "School closed today — emergency",
    summaryPlaceholder: "Institute closed until further notice.",
    detailPlaceholder: "Do not send students to campus. Await official reopening notice.",
  },
  {
    id: "weather",
    label: "Weather advisory",
    hint: "Storms, heat, floods · mandatory",
    icon: CloudRain,
    severity: "mandatory",
    category: "weather",
    sourceLabel: "Weather",
    titlePlaceholder: "Weather advisory — …",
    summaryPlaceholder: "Adjust travel plans due to severe weather.",
    detailPlaceholder: "Transport may be delayed. Follow institute updates.",
  },
  {
    id: "health",
    label: "Health advisory",
    hint: "Outbreak, vaccination, wellness",
    icon: HeartPulse,
    severity: "mandatory",
    category: "health",
    sourceLabel: "Health office",
    titlePlaceholder: "Health advisory — …",
    summaryPlaceholder: "Important health notice for families.",
    detailPlaceholder: "Review symptoms policy and contact the health office if needed.",
  },
  {
    id: "safety",
    label: "Safety alert",
    hint: "Security or on-campus safety",
    icon: ShieldAlert,
    severity: "emergency",
    category: "safety",
    sourceLabel: "Safety",
    titlePlaceholder: "Safety alert — …",
    summaryPlaceholder: "Important safety notice.",
    detailPlaceholder: "Follow staff instructions and monitor official channels.",
  },
  {
    id: "general",
    label: "General alert",
    hint: "Exam change, schedule, institute-wide notice",
    icon: Megaphone,
    severity: "mandatory",
    category: "general",
    sourceLabel: "Institute",
    titlePlaceholder: "Important notice — …",
    summaryPlaceholder: "Short summary shown in the alert inbox.",
    detailPlaceholder: "Full details for parents and students.",
  },
];

const CATEGORY_LABELS: Record<SchoolAlertCategory, string> = {
  absence: "Absence",
  health: "Health",
  remark: "Remark",
  safety: "Safety",
  attendance: "Attendance",
  leave: "Leave",
  holiday: "Holiday",
  closure: "Closure",
  weather: "Weather",
  general: "General",
};

function formatAudience(audience: SchoolAlertAudience): string {
  if (audience === "parents") return "Parents";
  if (audience === "students") return "Students";
  return "Parents & students";
}

/** Inline school-alert send — same contract as AlertsBroadcastPanel / broadcastSchoolAlert. */
export function AlertSendForm({ onSent }: { onSent?: () => void }) {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [severity, setSeverity] = useState<SchoolAlertSeverity>("mandatory");
  const [category, setCategory] = useState<SchoolAlertCategory>("holiday");
  const [sourceLabel, setSourceLabel] = useState("Holidays");
  const [audience, setAudience] = useState<SchoolAlertAudience>("parents_and_students");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const applyPreset = useCallback((next: BroadcastPreset) => {
    setPresetId(next.id);
    setSeverity(next.severity);
    setCategory(next.category);
    setSourceLabel(next.sourceLabel);
    setTitle("");
    setSummary("");
    setDetail("");
  }, []);

  useEffect(() => {
    if (!instituteCtx.activeInstituteId) return;
    let cancelled = false;
    setStudentsLoading(true);
    void listStudents({ instituteId: instituteCtx.activeInstituteId, status: "active" })
      .then((rows) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.activeInstituteId]);

  const canSend =
    writesEnabled &&
    Boolean(instituteCtx.activeInstituteId) &&
    Boolean(title.trim()) &&
    !sending;

  const resetForm = () => {
    applyPreset(PRESETS[0]);
    setAudience("parents_and_students");
    setStudentId("");
  };

  const sendBroadcast = () => {
    if (shouldIgnoreDuplicateSendClick(sending)) return;
    if (!canSend || !instituteCtx.activeInstituteId) {
      if (!title.trim()) notify("Title is required");
      return;
    }
    setSending(true);
    void broadcastSchoolAlert({
      instituteId: instituteCtx.activeInstituteId,
      title: title.trim(),
      summary: summary.trim() || title.trim(),
      detail: detail.trim() || summary.trim() || title.trim(),
      severity,
      category,
      sourceLabel: sourceLabel.trim() || "Institute",
      studentId: studentId.trim() || null,
      audience,
    })
      .then((result) => {
        void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
          dispatchInAppAlert({
            title: title.trim(),
            body: `Broadcast sent to ${result.recipientCount} recipient(s)`,
            href: "/alerts",
            variant: "alert",
            severity: severity === "emergency" ? "emergency" : "mandatory",
          });
        });
        notify(
          `Alert sent · ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`,
        );
        resetForm();
        onSent?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to send broadcast");
      })
      .finally(() => setSending(false));
  };

  const instituteBlocked =
    instituteCtx.status === "loading" ||
    instituteCtx.status === "needs_selection" ||
    instituteCtx.status === "empty" ||
    !instituteCtx.activeInstituteId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              disabled={sending || instituteBlocked}
              onClick={() => applyPreset(p)}
              className={`rounded-lg border px-2 py-2 text-left text-xs ${
                presetId === p.id
                  ? "border-destructive bg-destructive/10 text-destructive font-medium"
                  : "border-border hover:bg-muted/40"
              } disabled:opacity-50`}
            >
              <Icon
                className={`size-3.5 mb-1 inline ${
                  p.severity === "emergency" ? "text-destructive" : ""
                }`}
              />{" "}
              {p.label}
            </button>
          );
        })}
      </div>

      <Field label="Title" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={preset.titlePlaceholder}
          disabled={sending || instituteBlocked}
        />
      </Field>
      <Field label="Body / message" hint="Summary + full detail for Connect alert inbox">
        <TextInput
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={preset.summaryPlaceholder}
          disabled={sending || instituteBlocked}
          className="mb-2"
        />
        <TextArea
          rows={4}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={preset.detailPlaceholder}
          disabled={sending || instituteBlocked}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Severity" required>
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SchoolAlertSeverity)}
            disabled={sending}
          >
            <option value="mandatory">Mandatory (important)</option>
            <option value="emergency">Emergency (critical)</option>
          </Select>
        </Field>
        <Field label="Alert type">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as SchoolAlertCategory)}
            disabled={sending}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audience" required>
          <Select
            value={audience}
            onChange={(e) => setAudience(e.target.value as SchoolAlertAudience)}
            disabled={sending}
          >
            <option value="parents_and_students">Parents & students</option>
            <option value="parents">Parents only</option>
            <option value="students">Students only</option>
          </Select>
        </Field>
        <Field label="Source label">
          <TextInput
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="Holidays, Emergency, …"
            disabled={sending}
          />
        </Field>
      </div>

      <Field
        label="Target one student (optional)"
        hint="Leave blank for institute-wide broadcast"
      >
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={studentsLoading || sending}
        >
          <option value="">Institute-wide</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName || `${s.firstName} ${s.surname}`}
              {s.classLabel ? ` · ${s.classLabel}` : ""}
              {s.sectionLabel ? ` ${s.sectionLabel}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <p className="text-[11px] text-muted-foreground">
        Sending to{" "}
        <span className="font-medium text-foreground">{formatAudience(audience)}</span>
        {studentId ? " · one student + linked parents" : " · whole institute"}.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="danger"
          disabled={!canSend || instituteBlocked}
          onClick={() => sendBroadcast()}
          className="gap-2"
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          Send alert
        </Button>
      </div>
    </div>
  );
}
