import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import { CalendarClock, Plus } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { getLevelLabels } from "@/lib/academic-data";
import {
  getInstituteClassSectionOptions,
} from "@/lib/exam-timetable-data";
import { AttendanceConfigurationHistory } from "@/components/academic-management/views/AttendanceConfigurationHistory";
import {
  ATTENDANCE_METHOD_OPTIONS,
  ATTENDANCE_OWNER_OPTIONS,
  ATTENDANCE_SCOPE_OPTIONS,
  appendAttendanceConfig,
  attendanceMethodLabel,
  attendanceOwnerLabel,
  attendanceScopeLabel,
  getActiveAttendanceConfig,
  loadAttendanceConfigVersions,
  validateNewAttendanceConfig,
  type AttendanceConfigScope,
  type AttendanceConfigVersion,
  type AttendanceMethod,
  type AttendanceOwner,
} from "@/lib/attendance-config-store";
import { scopeTargetsLabel, todayIso } from "@/lib/attendance-config-labels";

export function AttendanceConfigurationPanel() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const { profileId } = useDemoProfile();
  const [revision, setRevision] = useState(0);

  const versions = useMemo(() => {
    void revision;
    return loadAttendanceConfigVersions();
  }, [revision]);

  const today = todayIso();
  const active = useMemo(() => {
    void revision;
    return getActiveAttendanceConfig(today);
  }, [revision, today]);

  const classOptions = useMemo(() => getLevelLabels(), [profileId]);
  const sectionOptions = useMemo(
    () => getInstituteClassSectionOptions(),
    [profileId],
  );

  const [method, setMethod] = useState<AttendanceMethod>("daily");
  const [owner, setOwner] = useState<AttendanceOwner>("class_teacher");
  const [scope, setScope] = useState<AttendanceConfigScope>("institute");
  const [classTargets, setClassTargets] = useState<string[]>([]);
  const [sectionTargets, setSectionTargets] = useState<string[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleClass = (label: string) => {
    setClassTargets((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  const toggleSection = (key: string) => {
    setSectionTargets((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  const save = () => {
    const input = {
      effectiveFrom,
      method,
      owner,
      scope,
      classTargets,
      sectionTargets,
      createdBy: user?.name || "Admin",
    };
    const error = validateNewAttendanceConfig(input);
    if (error === "effective_from_required") {
      setFormError("Effective From date is required.");
      return;
    }
    if (error === "effective_from_invalid") {
      setFormError("Effective From must be a valid date.");
      return;
    }
    if (error === "class_targets_required") {
      setFormError("Select at least one class for Class scope.");
      return;
    }
    if (error === "section_targets_required") {
      setFormError("Select at least one section for Section scope.");
      return;
    }

    appendAttendanceConfig(input);
    setFormError(null);
    setRevision((n) => n + 1);
    notify(
      `Attendance configuration saved · effective ${effectiveFrom} (history preserved)`,
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Attendance Configuration"
          hint="Method · taken by · scope · effective from date — past versions are never changed"
        />
        <CardBody className="space-y-5">
          {active ? (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="success">Institute default today</Pill>
                <span className="text-xs text-muted-foreground">
                  Effective from {active.effectiveFrom} · class/section overrides may apply
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {attendanceMethodLabel(active.method)}
                {" · "}
                {attendanceOwnerLabel(active.owner)}
                {" · "}
                {attendanceScopeLabel(active.scope)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Scope targets: {scopeTargetsLabel(active)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No configuration effective for today yet. Add one with an Effective
              From date on or before today.
            </p>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Attendance Method</p>
            <OptionGrid
              options={ATTENDANCE_METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Attendance Taken By</p>
            <OptionGrid
              options={ATTENDANCE_OWNER_OPTIONS}
              value={owner}
              onChange={setOwner}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Configuration Scope</p>
            <OptionGrid
              options={ATTENDANCE_SCOPE_OPTIONS}
              value={scope}
              onChange={(next) => {
                setScope(next);
                if (next === "institute") {
                  setClassTargets([]);
                  setSectionTargets([]);
                }
              }}
            />
          </div>

          {scope === "class" ? (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">
                Classes <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {classOptions.map((label) => {
                  const on = classTargets.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleClass(label)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {scope === "section" ? (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">
                Sections <span className="text-destructive">*</span>
              </p>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-2">
                {sectionOptions.map((opt) => {
                  const on = sectionTargets.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleSection(opt.key)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Field
            label="Effective From Date"
            required
            hint="New rules apply from this date. Marks taken before this date keep the previous configuration."
          >
            <TextInput
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </Field>

          {formError ? (
            <p className="text-xs text-destructive">{formError}</p>
          ) : (
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
              Saving adds a new version only. Existing configuration history is never
              edited or deleted — historical Attendance % and Working Days stay unchanged.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={save}>
              <Plus className="size-3.5" /> Save configuration
            </Button>
          </div>
        </CardBody>
      </Card>

      <AttendanceConfigurationHistory
        versions={versions}
        activeId={active?.id ?? null}
      />
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              selected
                ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <p className="text-xs font-semibold text-foreground">{opt.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
