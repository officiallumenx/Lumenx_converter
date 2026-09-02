import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Pill,
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
  RefreshCw,
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
  listRecentSchoolAlerts,
  type AdminSchoolAlertDto,
  type SchoolAlertAudience,
  type SchoolAlertCategory,
  type SchoolAlertSeverity,
} from "@/lib/school-alerts";

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

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AlertsBroadcastPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [open, setOpen] = useState(false);
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
  const [recent, setRecent] = useState<AdminSchoolAlertDto[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

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

  const reloadRecent = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (
      instituteCtx.status !== "ready" ||
      !instituteCtx.activeInstituteId
    ) {
      setRecent([]);
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setRecentLoading(true);
    void listRecentSchoolAlerts(requestInstituteId)
      .then((rows) => {
        if (!cancelled && activeInstituteIdRef.current === requestInstituteId) {
          setRecent(rows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          notify(err instanceof Error ? err.message : "Failed to load recent broadcasts");
          setRecent([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, reloadKey, notify]);

  useEffect(() => {
    if (!open || !instituteCtx.activeInstituteId) return;
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
  }, [open, instituteCtx.activeInstituteId]);

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

  const sendBroadcast = async () => {
    if (!canSend || !instituteCtx.activeInstituteId) return;
    setSending(true);
    try {
      const result = await broadcastSchoolAlert({
        instituteId: instituteCtx.activeInstituteId,
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        detail: detail.trim() || summary.trim() || title.trim(),
        severity,
        category,
        sourceLabel: sourceLabel.trim() || "Institute",
        studentId: studentId.trim() || null,
        audience,
      });
      void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
        dispatchInAppAlert({
          title: title.trim(),
          body: `Broadcast sent to ${result.recipientCount} recipient(s)`,
          href: "/alerts",
          variant: severity === "emergency" ? "alert" : "alert",
          severity: severity === "emergency" ? "emergency" : "mandatory",
        });
      });
      notify(
        `Alert sent · ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`,
      );
      resetForm();
      setOpen(false);
      reloadRecent();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const instituteBlocked =
    instituteCtx.status === "loading" ||
    instituteCtx.status === "needs_selection" ||
    instituteCtx.status === "empty" ||
    !instituteCtx.activeInstituteId;

  return (
    <>
      <Card className="mb-6 border-destructive/25 bg-destructive/[0.03]">
        <CardHeader
          title="School alert broadcasts"
          hint="Holidays, closures, weather, health & emergencies — red inbox + urgent chime in Connect"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={reloadRecent} disabled={recentLoading}>
                <RefreshCw className={`size-3.5 ${recentLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!writesEnabled || instituteBlocked}
                onClick={() => {
                  applyPreset(PRESETS[0]);
                  setOpen(true);
                }}
              >
                <Siren className="size-3.5" /> New broadcast
              </Button>
            </div>
          }
        />

        <div className="px-5 pb-4">
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Broadcasts create mandatory/emergency rows in Connect{" "}
            <span className="font-medium text-foreground">/alerts</span> and push alert-styled
            notifications (distinct from the normal notification bell).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!writesEnabled || instituteBlocked}
                  onClick={() => {
                    applyPreset(p);
                    setOpen(true);
                  }}
                  className="rounded-xl border border-border bg-card px-3 py-3 text-left hover:border-destructive/40 hover:bg-destructive/[0.04] transition-colors disabled:opacity-50"
                >
                  <Icon
                    className={`size-4 mb-2 ${p.severity === "emergency" ? "text-destructive" : "text-foreground"}`}
                  />
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.hint}</div>
                </button>
              );
            })}
          </div>

          {instituteBlocked ? (
            <p className="text-sm text-muted-foreground py-4">
              Select an institute to view broadcast history and send alerts.
            </p>
          ) : recentLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="size-4 animate-spin" /> Loading recent broadcasts…
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No broadcasts sent yet for this institute.</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {recent.map((row) => {
                const urgent = row.severity === "emergency";
                return (
                  <div
                    key={row.id}
                    className={`px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 ${
                      urgent ? "bg-destructive/[0.05] border-l-4 border-l-destructive" : "bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium ${urgent ? "text-destructive" : ""}`}>
                          {row.title}
                        </span>
                        <Pill tone={urgent ? "danger" : "warning"}>
                          {urgent ? "Emergency" : "Mandatory"}
                        </Pill>
                        <Pill tone="neutral">{CATEGORY_LABELS[row.category] ?? row.category}</Pill>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.summary}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatWhen(row.createdAt)} · {row.recipientCount} recipients · {row.sourceLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          resetForm();
          setOpen(false);
        }}
        title={`Broadcast · ${preset.label}`}
        subtitle="Parents/students receive a red alert with urgent chime in Connect"
        size="lg"
        footer={
          <>
            <Button
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" disabled={!canSend} onClick={() => void sendBroadcast()}>
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}{" "}
              Send alert
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-lg border px-2 py-2 text-left text-xs ${
                  presetId === p.id
                    ? "border-destructive bg-destructive/10 text-destructive font-medium"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Severity" required>
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SchoolAlertSeverity)}
              >
                <option value="mandatory">Mandatory (important)</option>
                <option value="emergency">Emergency (critical)</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as SchoolAlertCategory)}
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
              />
            </Field>
          </div>

          <Field label="Title" required>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={preset.titlePlaceholder}
            />
          </Field>
          <Field label="Summary" hint="Shown in alert inbox list">
            <TextInput
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={preset.summaryPlaceholder}
            />
          </Field>
          <Field label="Full detail">
            <TextArea
              rows={4}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={preset.detailPlaceholder}
            />
          </Field>

          <Field
            label="Target one student (optional)"
            hint="Leave blank for institute-wide broadcast"
          >
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={studentsLoading}
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
            Sending to <span className="font-medium text-foreground">{formatAudience(audience)}</span>
            {studentId ? " · one student + linked parents" : " · whole institute"}.
          </p>
        </div>
      </Modal>
    </>
  );
}
