import { useEffect, useMemo, useRef, useState } from "react";
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
import { isApiAuthMode } from "@/auth/auth-mode";
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
import {
  createAttendanceConfig,
  loadAttendanceConfigList,
  type AttendanceConfigDto,
  type AttendanceConfigLoadStatus,
} from "@/lib/attendance";
import { listClassesCatalog, type ClassDto, type SectionDto } from "@/lib/classes";
import { useInstituteContext } from "@/lib/institutes";

function dtoToHistoryVersion(dto: AttendanceConfigDto): AttendanceConfigVersion {
  return {
    id: dto.id,
    effectiveFrom: dto.effectiveFrom,
    method: dto.method,
    owner: dto.owner,
    scope: dto.scope,
    classTargets: dto.classCodes,
    sectionTargets: dto.sectionCodes,
    createdAt: dto.createdAt,
    createdBy: dto.createdByUserProfileId ?? "API",
  };
}

function pickActiveDto(
  items: AttendanceConfigDto[],
  today: string,
): AttendanceConfigDto | null {
  const eligible = items
    .filter((row) => row.effectiveFrom <= today)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return eligible[0] ?? null;
}

export function AttendanceConfigurationPanel() {
  if (isApiAuthMode()) {
    return <AttendanceConfigurationApiPanel />;
  }
  return <AttendanceConfigurationDemoPanel />;
}

function AttendanceConfigurationApiPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [items, setItems] = useState<AttendanceConfigDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<AttendanceConfigLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const [method, setMethod] = useState<AttendanceMethod>("daily");
  const [owner, setOwner] = useState<AttendanceOwner>("class_teacher");
  const [scope, setScope] = useState<AttendanceConfigScope>("institute");
  const [classTargets, setClassTargets] = useState<string[]>([]);
  const [sectionTargets, setSectionTargets] = useState<string[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setItems([]);
      setLoadStatus("loading");
      setLoadError(null);
      setClasses([]);
      setSections([]);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setClasses([]);
      setSections([]);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setClasses([]);
      setSections([]);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);

    void Promise.all([
      loadAttendanceConfigList(requestInstituteId),
      listClassesCatalog({ instituteId: requestInstituteId }),
    ]).then(([configState, catalog]) => {
      if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
      setItems(configState.items);
      setLoadStatus(configState.status);
      setLoadError(configState.errorMessage);
      setClasses(catalog.classes);
      setSections(catalog.sections);
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

  const versions = useMemo(() => items.map(dtoToHistoryVersion), [items]);
  const active = useMemo(() => pickActiveDto(items, today), [items, today]);

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...classes]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .flatMap((cls) => {
        const code = cls.code.trim() || cls.name.trim();
        if (!code || seen.has(code)) return [];
        seen.add(code);
        return [{ value: code, label: cls.name.trim() || code }];
      });
  }, [classes]);

  const sectionOptions = useMemo(() => {
    const classesById = new Map(classes.map((cls) => [cls.id, cls]));
    return [...sections]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((section) => {
        const cls = classesById.get(section.classId);
        const code = section.code.trim() || section.name.trim();
        const classLabel = cls?.name.trim() || cls?.code.trim() || "Class";
        return {
          id: section.id,
          key: code,
          label: `${classLabel} · Sec ${code}`,
        };
      })
      .filter((opt) => Boolean(opt.key));
  }, [classes, sections]);

  const toggleClass = (code: string) => {
    setClassTargets((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const toggleSection = (code: string) => {
    setSectionTargets((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const save = () => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      setFormError("Select an institute first.");
      return;
    }
    if (!effectiveFrom.trim()) {
      setFormError("Effective From date is required.");
      return;
    }
    if (scope === "class" && classTargets.length === 0) {
      setFormError("Select at least one class for Class scope.");
      return;
    }
    if (scope === "section" && sectionTargets.length === 0) {
      setFormError("Select at least one section for Section scope.");
      return;
    }

    setSaving(true);
    setFormError(null);
    void createAttendanceConfig({
      instituteId,
      effectiveFrom,
      method,
      owner,
      scope,
      classCodes: scope === "class" ? classTargets : undefined,
      sectionCodes: scope === "section" ? sectionTargets : undefined,
    })
      .then(() => {
        setReloadKey((n) => n + 1);
        notify(
          `Attendance configuration saved · effective ${effectiveFrom} (history preserved)`,
        );
      })
      .catch((err) => {
        setFormError(err instanceof Error ? err.message : "Failed to save configuration");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const loadHint =
    loadStatus === "loading"
      ? "Loading attendance configuration…"
      : loadStatus === "needs_institute"
        ? "Select an institute to manage attendance configuration."
        : loadStatus === "forbidden"
          ? (loadError ?? "Access denied.")
          : loadStatus === "error"
            ? (loadError ?? "Failed to load attendance configuration.")
            : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Attendance Configuration"
          hint="Method · taken by · scope · effective from date — past versions are never changed"
        />
        <CardBody className="space-y-5">
          {loadHint ? (
            <p className="text-xs text-muted-foreground">{loadHint}</p>
          ) : active ? (
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
                Scope targets:{" "}
                {active.scope === "institute"
                  ? "All classes & sections"
                  : active.scope === "class"
                    ? active.classCodes.join(", ") || "—"
                    : active.sectionCodes.join(", ") || "—"}
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
                {classOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No classes in catalog.</p>
                ) : (
                  classOptions.map((opt) => {
                    const on = classTargets.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleClass(opt.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {scope === "section" ? (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">
                Sections <span className="text-destructive">*</span>
              </p>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-2">
                {sectionOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sections in catalog.</p>
                ) : (
                  sectionOptions.map((opt) => {
                    const on = sectionTargets.includes(opt.key);
                    return (
                      <button
                        key={opt.id}
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
                  })
                )}
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
            <Button
              variant="primary"
              onClick={save}
              disabled={saving || loadStatus === "needs_institute" || loadStatus === "loading"}
            >
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

function AttendanceConfigurationDemoPanel() {
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
