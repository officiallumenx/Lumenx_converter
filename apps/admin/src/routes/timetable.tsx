import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card, CardHeader, Button, Modal, Field, Select, TextInput, Pill,
  PageStack, KpiGrid, Kpi, SegmentedControl, EmptyState,
} from "@lumenx/ui-admin";
import { AlertTriangle, CalendarDays, Plus, Wand2, Zap, LayoutGrid, CheckCircle2, Filter } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GRADES,
  INITIAL_TIMETABLES,
  getSubjectsByGrade,
  getInstituteTeachers,
  autoGenerateTimetable,
  autoSuggestSubjectTeachers,
  assignSubjectTeachersByExperience,
  generateAllInstituteTimetables,
  classKey,
  classLocationLabel,
  detectConflicts,
  emptyGrid,
  fillEmptySlots,
  countEmptySlots,
  countTeachingSlotsPerWeek,
  getRecordSchedule,
  getRecordDays,
  hasTimetable,
  sectionsForGrade,
  teachersForSubject,
  SECTIONS,
  slotVenue,
  INSTITUTE_CLASSES,
  type TimetableRecord,
  type TimetableSlot,
  type TeacherAssignMode,
  type GenerateScope,
  type InstituteGenerateResult,
} from "@/lib/timetable-data";
import {
  buildScheduleConfig,
  defaultScheduleInput,
  scheduleInputFromConfig,
  scheduleSummary,
  isSlotApplicable,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import { TimetableWeekGrid } from "@/components/timetable/TimetableViews";
import { ScheduleConfigForm } from "@/components/timetable/ScheduleConfigForm";

export const Route = createFileRoute("/timetable")({
  validateSearch: (s: Record<string, unknown>) => ({
    grade: (s.grade as string) || "Grade 10",
    section: (s.section as string) || "A",
  }),
  head: () => ({ meta: [{ title: "Timetable — LumenX Admin" }] }),
  component: TimetablePage,
});

function TeacherAssignPanel({
  mode,
  onModeChange,
  subjects,
  subjectTeachers,
  onSubjectTeacherChange,
}: {
  mode: TeacherAssignMode;
  onModeChange: (mode: TeacherAssignMode) => void;
  subjects: { id: string; name: string; code: string; periodsPerWeek: number }[];
  subjectTeachers: Record<string, string>;
  onSubjectTeacherChange: (subjectId: string, teacherId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Teacher assignment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <label className={`lx-teacher-mode-card ${mode === "auto" ? "lx-teacher-mode-card--active" : ""}`}>
            <input
              type="radio"
              name="teacher-mode"
              checked={mode === "auto"}
              onChange={() => onModeChange("auto")}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Auto-assign</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Best match by qualification, experience, and workload.
              </div>
            </div>
          </label>
          <label className={`lx-teacher-mode-card ${mode === "manual" ? "lx-teacher-mode-card--active" : ""}`}>
            <input
              type="radio"
              name="teacher-mode"
              checked={mode === "manual"}
              onChange={() => onModeChange("manual")}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Pick manually</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Choose a teacher for each subject before generating.
              </div>
            </div>
          </label>
        </div>
      </Field>

      <div className="rounded-lg border border-border overflow-hidden bg-surface">
        {subjects.map((sub) => {
          const qualified = teachersForSubject(sub.code, sub.name);
          const teacherId = subjectTeachers[sub.id] ?? qualified[0]?.id ?? "";
          const teacher = getInstituteTeachers().find((t) => t.id === teacherId);
          return (
            <div key={sub.id} className="lx-teacher-assign-row">
              <div className="min-w-0">
                <div className="text-sm font-medium">{sub.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {sub.code} · {sub.periodsPerWeek} periods/week
                </div>
              </div>
              {mode === "manual" ? (
                <Select
                  value={teacherId}
                  onChange={(e) => onSubjectTeacherChange(sub.id, e.target.value)}
                  className="h-9 text-xs w-full sm:w-56"
                >
                  {qualified.length === 0 && <option value="">No qualified teacher</option>}
                  {qualified.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.experienceYears}y
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="text-xs text-right sm:min-w-[10rem]">
                  <div className="font-medium">{teacher?.name ?? "—"}</div>
                  {teacher && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {teacher.experienceYears}y experience
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countFilledPeriods(grid: (TimetableSlot | null)[][], schedule: ReturnType<typeof getRecordSchedule>) {
  return countTeachingSlotsPerWeek(schedule) - countEmptySlots(grid, schedule);
}

function GeneratePreviewPanel({
  preview,
  scope,
  grade,
  section,
}: {
  preview: InstituteGenerateResult;
  scope: GenerateScope;
  grade: string;
  section: string;
}) {
  const ck = classKey(grade, section);
  const sampleSchedule = getRecordSchedule(preview.timetables[0]);

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${preview.teacherConflicts > 0 ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"}`}>
        <div className={`text-sm font-semibold ${preview.teacherConflicts > 0 ? "text-warning" : "text-success"}`}>
          Preview ready — review before applying
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{scheduleSummary(sampleSchedule)}</p>
        <ul className="mt-2 text-[11px] text-muted-foreground space-y-1">
          <li>
            <span className="font-medium text-foreground">{preview.classCount}</span>{" "}
            {preview.classCount === 1 ? "class timetable" : "class timetables"} will be updated
          </li>
          <li>
            <span className={`font-medium ${preview.teacherConflicts > 0 ? "text-warning" : "text-success"}`}>
              {preview.teacherConflicts}
            </span>{" "}
            teacher period conflicts
          </li>
          {preview.unplacedPeriods > 0 && (
            <li className="text-warning">
              {preview.unplacedPeriods} periods could not be placed
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 py-2 bg-muted/40 text-[10px] font-mono uppercase text-muted-foreground border-b border-border">
          <span>Class</span>
          <span>Subject</span>
          <span>Teacher</span>
        </div>
        {scope === "all" ? (
          INSTITUTE_CLASSES.flatMap((cls) => {
            const ck2 = classKey(cls.grade, cls.section);
            const subs = getSubjectsByGrade()[cls.grade] ?? [];
            return subs.map((sub) => {
              const teacherId = preview.assignments[ck2]?.[sub.id];
              const teacher = getInstituteTeachers().find((t) => t.id === teacherId);
              return (
                <div
                  key={`${ck2}-${sub.id}`}
                  className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 py-2 border-b border-border text-xs items-center last:border-b-0"
                >
                  <span className="font-mono">{ck2}</span>
                  <span>{sub.name}</span>
                  <span>
                    {teacher ? (
                      <>
                        <span className="font-medium">{teacher.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({teacher.experienceYears}y)</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              );
            });
          })
        ) : (
          (getSubjectsByGrade()[grade] ?? []).map((sub) => {
            const teacherId = preview.assignments[ck]?.[sub.id];
            const teacher = getInstituteTeachers().find((t) => t.id === teacherId);
            return (
              <div
                key={sub.id}
                className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 py-2 border-b border-border text-xs items-center"
              >
                <span className="font-mono">{ck}</span>
                <span>{sub.name}</span>
                <span className="font-medium">{teacher?.name ?? "—"}</span>
              </div>
            );
          })
        )}
      </div>

      {scope === "current" && (() => {
        const previewTt = preview.timetables.find((t) => t.grade === grade && t.section === section);
        const previewSchedule = getRecordSchedule(previewTt);
        return (
          <p className="text-[11px] text-muted-foreground">
            {countFilledPeriods(previewTt?.grid ?? emptyGrid(previewSchedule), previewSchedule)}{" "}
            periods scheduled for {ck}.
          </p>
        );
      })()}

      <p className="text-[11px] text-muted-foreground">
        Click <span className="font-medium text-foreground">Confirm & apply</span> to save these timetables, or{" "}
        <span className="font-medium text-foreground">Back</span> to change settings. <span className="font-medium text-foreground">Cancel</span>{" "}
        discards this preview.
      </p>
    </div>
  );
}

function TimetablePage() {
  const search = useSearch({ from: "/timetable" });
  const navigate = useNavigate({ from: "/timetable" });

  const [grade, setGrade] = useState(search.grade);
  const [section, setSection] = useState(search.section);
  const [timetables, setTimetables] = useState<TimetableRecord[]>(INITIAL_TIMETABLES);

  const [editOpen, setEditOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ day: number; period: number } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createGrade, setCreateGrade] = useState("Grade 11");
  const [createSection, setCreateSection] = useState("C");
  const [createTerm, setCreateTerm] = useState("2025–26 · Term 2");
  const [createAutoGen, setCreateAutoGen] = useState(true);
  const [createTeacherMode, setCreateTeacherMode] = useState<TeacherAssignMode>("auto");
  const [createSubjectTeachers, setCreateSubjectTeachers] = useState<Record<string, string>>({});

  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [autoGenStep, setAutoGenStep] = useState<"configure" | "preview">("configure");
  const [autoGenScope, setAutoGenScope] = useState<GenerateScope>("current");
  const [autoTeacherMode, setAutoTeacherMode] = useState<TeacherAssignMode>("auto");
  const [autoSubjectTeachers, setAutoSubjectTeachers] = useState<Record<string, string>>({});
  const [generatePreview, setGeneratePreview] = useState<InstituteGenerateResult | null>(null);
  const [autoScheduleInput, setAutoScheduleInput] = useState<ScheduleInput>(() => defaultScheduleInput());
  const [createScheduleInput, setCreateScheduleInput] = useState<ScheduleInput>(() => defaultScheduleInput());

  useEffect(() => {
    setGrade(search.grade);
    setSection(search.section);
  }, [search.grade, search.section]);

  const syncUrl = useCallback(
    (g: string, s: string) => {
      void navigate({ search: { grade: g, section: s } });
    },
    [navigate],
  );

  const onGradeChange = (g: string) => {
    setGrade(g);
    const sections = sectionsForGrade(g, timetables);
    const nextSection = sections.includes(section) ? section : sections[0] ?? "A";
    setSection(nextSection);
    syncUrl(g, nextSection);
  };

  const onSectionChange = (s: string) => {
    setSection(s);
    syncUrl(grade, s);
  };

  const current = useMemo(
    () => timetables.find((t) => t.grade === grade && t.section === section),
    [timetables, grade, section],
  );

  const currentSchedule = useMemo(() => getRecordSchedule(current), [current]);
  const recordDays = useMemo(() => getRecordDays(current), [current]);

  const grid = current?.grid ?? emptyGrid(currentSchedule);
  const ck = classKey(grade, section);

  const allConflicts = useMemo(() => detectConflicts(timetables), [timetables]);
  const classConflicts = useMemo(
    () => (current ? detectConflicts(timetables, current.id) : []),
    [timetables, current],
  );

  const subjectsByGrade = useMemo(() => getSubjectsByGrade(), [timetables]);
  const teachers = useMemo(() => getInstituteTeachers(), [timetables]);

  const subjectsForGrade = subjectsByGrade[grade] ?? subjectsByGrade["Grade 10"]!;
  const createSubjects = subjectsByGrade[createGrade] ?? [];

  const initSubjectTeachers = useCallback(
    (g: string, fromGrid?: typeof grid) => {
      const subs = subjectsByGrade[g] ?? [];
      const fromAuto = autoSuggestSubjectTeachers(g, section, timetables);
      if (!fromGrid) return fromAuto;
      const map = { ...fromAuto };
      for (const sub of subs) {
        for (const dayCol of fromGrid) {
          const slot = dayCol.find((s) => s?.subjectId === sub.id || s?.subject === sub.code);
          if (slot?.teacherId) {
            map[sub.id] = slot.teacherId;
            break;
          }
        }
      }
      return map;
    },
    [timetables],
  );

  const instituteAssignments = useMemo(() => assignSubjectTeachersByExperience(INSTITUTE_CLASSES), []);

  const closeAutoGenModal = () => {
    setAutoGenOpen(false);
    setAutoGenStep("configure");
    setGeneratePreview(null);
  };

  const openAutoGenModal = () => {
    setAutoGenScope("current");
    setAutoGenStep("configure");
    setAutoTeacherMode("auto");
    setGeneratePreview(null);
    setAutoSubjectTeachers(initSubjectTeachers(grade, grid));
    setAutoScheduleInput(
      current ? scheduleInputFromConfig(getRecordSchedule(current)) : defaultScheduleInput(),
    );
    setAutoGenOpen(true);
  };

  const openCreateModal = (g?: string, s?: string) => {
    const targetGrade = g ?? createGrade;
    if (g) setCreateGrade(g);
    if (s) setCreateSection(s);
    setCreateTeacherMode("auto");
    setCreateSubjectTeachers(autoSuggestSubjectTeachers(targetGrade, s ?? createSection, timetables));
    setCreateScheduleInput(defaultScheduleInput());
    setCreateOpen(true);
  };

  const onAutoTeacherModeChange = (mode: TeacherAssignMode) => {
    setAutoTeacherMode(mode);
    if (mode === "auto") {
      setAutoSubjectTeachers(autoSuggestSubjectTeachers(grade, section, timetables));
    }
  };

  const onCreateTeacherModeChange = (mode: TeacherAssignMode) => {
    setCreateTeacherMode(mode);
    if (mode === "auto") {
      setCreateSubjectTeachers(autoSuggestSubjectTeachers(createGrade, createSection, timetables));
    }
  };

  const buildAutoGenConfig = (
    g: string,
    sec: string,
    mode: TeacherAssignMode,
    subjectTeachers: Record<string, string>,
    schedule: ReturnType<typeof buildScheduleConfig>,
    excludeId?: string,
  ) => ({
    teacherMode: mode,
    grade: g,
    section: sec,
    schedule,
    subjectTeachers,
    existingTimetables: timetables,
    excludeTimetableId: excludeId,
  });
  const qualifiedTeachers = useMemo(
    () => (editSubject ? teachersForSubject(editSubject) : teachers),
    [editSubject, teachers],
  );

  const updateCurrentGrid = (updater: (prev: typeof grid) => typeof grid) => {
    if (!current) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? { ...t, grid: updater(t.grid), updatedAt: new Date().toISOString().slice(0, 10), status: "draft" as const }
          : t,
      ),
    );
  };

  const openEdit = (day: number, period: number) => {
    if (currentSchedule.periodRows[period]?.isBreak || !current) return;
    if (!isSlotApplicable(currentSchedule, day, period)) return;
    const slot = grid[day]?.[period];
    setEditCell({ day, period });
    setEditSubject(slot?.subject ?? subjectsForGrade[0]?.code ?? "MTH 101");
    setEditTeacherId(slot?.teacherId ?? teachersForSubject(slot?.subject ?? "MTH 101")[0]?.id ?? teachers[0]?.id ?? "");
    setEditOpen(true);
  };

  const saveSlot = () => {
    if (!editCell || !current) return;
    const { day, period } = editCell;
    const teacher = teachers.find((t) => t.id === editTeacherId);
    const subject = subjectsForGrade.find((s) => s.code === editSubject);
    const slot: TimetableSlot = {
      subjectId: subject?.id ?? editSubject,
      subject: editSubject,
      teacherId: editTeacherId,
      teacher: teacher?.name ?? editTeacherId,
      room: slotVenue(grade, section),
    };
    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      next[day]![period] = slot;
      return next;
    });
    setEditOpen(false);
  };

  const clearSlot = () => {
    if (!editCell) return;
    const { day, period } = editCell;
    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      next[day]![period] = null;
      return next;
    });
    setEditOpen(false);
  };

  const createTimetable = () => {
    if (hasTimetable(createGrade, createSection, timetables)) return;
    const id = `TT-${createGrade.replace("Grade ", "")}${createSection}`;
    const schedule = buildScheduleConfig(createAutoGen ? createScheduleInput : defaultScheduleInput());
    const grid = createAutoGen
      ? autoGenerateTimetable(
          createGrade,
          createSection,
          buildAutoGenConfig(createGrade, createSection, createTeacherMode, createSubjectTeachers, schedule),
        )
      : emptyGrid(schedule);
    setTimetables((prev) => [
      ...prev,
      {
        id,
        grade: createGrade,
        section: createSection,
        term: createTerm,
        status: "draft",
        grid,
        schedule,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    setCreateOpen(false);
    setGrade(createGrade);
    setSection(createSection);
    syncUrl(createGrade, createSection);
  };

  const buildGenerationPreview = (): InstituteGenerateResult | null => {
    const term = current?.term ?? createTerm;
    const today = new Date().toISOString().slice(0, 10);
    const schedule = buildScheduleConfig(autoScheduleInput);

    if (autoGenScope === "all") {
      return generateAllInstituteTimetables(timetables, term, schedule);
    }

    if (!current) return null;

    const grid = autoGenerateTimetable(
      grade,
      section,
      buildAutoGenConfig(grade, section, autoTeacherMode, autoSubjectTeachers, schedule, current.id),
    );
    const previewTimetables = timetables.map((t) =>
      t.id === current.id ? { ...t, grid, schedule, status: "draft" as const, updatedAt: today } : t,
    );
    const teacherConflicts = detectConflicts(previewTimetables).filter((c) => c.kind === "teacher").length;

    return {
      timetables: previewTimetables,
      classCount: 1,
      unplacedPeriods: 0,
      teacherConflicts,
      assignments: { [classKey(grade, section)]: autoSubjectTeachers },
    };
  };

  const previewGeneration = () => {
    const activeDays = autoScheduleInput.days.filter((d) => d.active);
    if (activeDays.length === 0) return;
    const preview = buildGenerationPreview();
    if (!preview) return;
    setGeneratePreview(preview);
    setAutoGenStep("preview");
  };

  const confirmGeneration = () => {
    if (!generatePreview) return;
    setTimetables(generatePreview.timetables);
    if (!current && generatePreview.timetables[0]) {
      const first = generatePreview.timetables[0];
      setGrade(first.grade);
      setSection(first.section);
      syncUrl(first.grade, first.section);
    }
    closeAutoGenModal();
  };

  const backToConfigure = () => {
    setAutoGenStep("configure");
    setGeneratePreview(null);
  };

  const publishTimetable = () => {
    if (!current || classConflicts.length > 0) return;
    setTimetables((prev) =>
      prev.map((t) => (t.id === current.id ? { ...t, status: "published" as const } : t)),
    );
  };

  const fillEmptyPeriods = () => {
    if (!current) return;
    const subjectTeachers = autoSuggestSubjectTeachers(grade, section, timetables);
    const { grid: nextGrid, filled } = fillEmptySlots(
      grade,
      section,
      current.grid,
      buildAutoGenConfig(grade, section, "auto", subjectTeachers, currentSchedule, current.id),
    );
    if (filled === 0) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? { ...t, grid: nextGrid, status: "draft" as const, updatedAt: new Date().toISOString().slice(0, 10) }
          : t,
      ),
    );
  };

  const slotHasConflict = (day: number, period: number, slot: TimetableSlot) => {
    const dayLabel = recordDays[day] ?? "";
    const periodLabel = currentSchedule.periodRows[period]?.label ?? "";
    return classConflicts.some(
      (c) =>
        c.day === dayLabel &&
        c.period === periodLabel &&
        (c.resource === slot.teacher || c.resource === slot.teacherId || c.resource === slot.room),
    );
  };

  const teachingSlotsPerWeek = countTeachingSlotsPerWeek(currentSchedule);
  const filledCount = useMemo(() => countFilledPeriods(grid, currentSchedule), [grid, currentSchedule]);
  const emptyCount = useMemo(() => countEmptySlots(grid, currentSchedule), [grid, currentSchedule]);
  const fillPct = current ? Math.round((filledCount / teachingSlotsPerWeek) * 100) : 0;

  const availableSections = sectionsForGrade(grade, timetables);
  const missingTimetable = !current;

  const switchClass = (g: string, s: string) => {
    setGrade(g);
    setSection(s);
    syncUrl(g, s);
  };

  const timetableShortcuts = useMemo(
    () =>
      [...timetables]
        .sort((a, b) => {
          const ga = Number.parseInt(a.grade.replace(/\D/g, ""), 10);
          const gb = Number.parseInt(b.grade.replace(/\D/g, ""), 10);
          return gb - ga || a.section.localeCompare(b.section);
        })
        .map((t) => ({
          id: t.id,
          grade: t.grade,
          section: t.section,
          label: classKey(t.grade, t.section),
          status: t.status,
        })),
    [timetables],
  );

  return (
    <AppShell
      title="Timetable"
      subtitle="Plan and publish weekly class schedules"
      actions={
        current ? (
          <Button
            variant="primary"
            onClick={publishTimetable}
            disabled={classConflicts.length > 0 || current.status === "published" || emptyCount > 0}
          >
            <CheckCircle2 className="size-3.5" />
            Publish
          </Button>
        ) : undefined
      }
    >
      <PageStack>
        <Card>
          <CardHeader
            title="Class filter"
            hint={`Viewing ${ck} — pick grade and section, or jump to an existing timetable below`}
            action={
              current ? (
                <Pill tone={current.status === "published" ? "success" : "warning"}>
                  {current.status === "published" ? "Published" : "Draft"}
                </Pill>
              ) : (
                <Pill tone="neutral">No timetable</Pill>
              )
            }
          />
          <div className="px-4 sm:px-5 pb-5 space-y-4">
            <div className="lx-timetable-filter-row">
              <div className="lx-timetable-filter-field">
                <Field label="Class (grade)">
                  <Select
                    value={grade}
                    onChange={(e) => onGradeChange(e.target.value)}
                    className="h-10 text-sm"
                    aria-label="Select grade"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="lx-timetable-filter-field">
                <Field label="Section">
                  <Select
                    value={section}
                    onChange={(e) => onSectionChange(e.target.value)}
                    className="h-10 text-sm"
                    aria-label="Select section"
                  >
                    {availableSections.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="lx-timetable-filter-current">
                <Filter className="size-4 text-primary shrink-0" aria-hidden />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Active class</div>
                  <div className="text-sm font-semibold">{ck}</div>
                </div>
              </div>
            </div>

            {timetableShortcuts.length > 0 && (
              <div className="lx-timetable-class-jump">
                <span className="lx-timetable-class-jump__label">Quick switch</span>
                <div className="lx-timetable-class-jump__chips">
                  {timetableShortcuts.map((t) => {
                    const active = t.grade === grade && t.section === section;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => switchClass(t.grade, t.section)}
                        className={`lx-timetable-class-chip ${active ? "lx-timetable-class-chip--active" : ""}`}
                        aria-current={active ? "true" : undefined}
                      >
                        <span>{t.label}</span>
                        <span className={`lx-timetable-class-chip__dot ${t.status === "published" ? "lx-timetable-class-chip__dot--published" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hidden md:block">
              <div className="lx-timetable-picker__label mb-2">Or tap grade / section</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <SegmentedControl
                  value={grade}
                  onChange={onGradeChange}
                  options={GRADES.map((g) => ({ value: g, label: g.replace("Grade ", "G") }))}
                />
                <SegmentedControl
                  value={section}
                  onChange={onSectionChange}
                  options={availableSections.map((s) => ({ value: s, label: `Sec ${s}` }))}
                />
              </div>
            </div>
          </div>
        </Card>

        {current && (
          <KpiGrid cols={4}>
            <Kpi
              label="Completion"
              value={`${fillPct}%`}
              delta={`${filledCount}/${teachingSlotsPerWeek} periods`}
              tone={fillPct >= 100 ? "up" : emptyCount > 0 ? "neutral" : "up"}
              icon={<LayoutGrid />}
            />
            <Kpi
              label="Empty slots"
              value={String(emptyCount)}
              delta={emptyCount > 0 ? "Needs assignment" : "All filled"}
              tone={emptyCount > 0 ? "down" : "up"}
              icon={<Plus />}
            />
            <Kpi
              label="Conflicts"
              value={String(classConflicts.length)}
              delta={classConflicts.length > 0 ? "Fix before publish" : "Clear"}
              tone={classConflicts.length > 0 ? "down" : "up"}
              icon={<AlertTriangle />}
            />
            <Kpi
              label="Schedule"
              value={recordDays.length ? `${recordDays.length} days` : "—"}
              delta={scheduleSummary(currentSchedule).split("·")[0]?.trim()}
              icon={<CalendarDays />}
            />
          </KpiGrid>
        )}

        <div className="lx-timetable-actions">
          {current && emptyCount > 0 && (
            <Button variant="outline" onClick={fillEmptyPeriods}>
              <Zap className="size-3.5" /> Fill empty ({emptyCount})
            </Button>
          )}
          <Button variant="outline" onClick={openAutoGenModal}>
            <Wand2 className="size-3.5" /> Auto-generate
          </Button>
          <Button variant="outline" onClick={() => openCreateModal()}>
            <Plus className="size-3.5" /> New class
          </Button>
        </div>

        {allConflicts.length > 0 && (
          <div className="lx-timetable-conflict-banner" role="status">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <strong>{allConflicts.length} scheduling conflict{allConflicts.length !== 1 ? "s" : ""}</strong>
              {" — "}
              {allConflicts.slice(0, 2).map((c, i) => (
                <span key={i}>
                  {i > 0 && "; "}
                  {c.resource} on {c.day} · {c.period}
                </span>
              ))}
              {allConflicts.length > 2 && ` +${allConflicts.length - 2} more`}
            </div>
          </div>
        )}

        <Card>
          {missingTimetable ? (
            <EmptyState
              icon={<CalendarDays className="size-6 text-primary" />}
              title={`No timetable for ${ck}`}
              hint="Create a schedule for this class or auto-generate the full week in one step."
              action={
                <>
                  <Button variant="primary" onClick={() => openCreateModal(grade, section)}>
                    <Plus className="size-3.5" /> Create {ck}
                  </Button>
                  <Button variant="outline" onClick={openAutoGenModal}>
                    <Wand2 className="size-3.5" /> Auto-generate
                  </Button>
                </>
              }
            />
          ) : (
            <>
              <CardHeader
                title={`${ck} weekly schedule`}
                hint={`${current.term} · Click any period to edit`}
              />
              <div className="px-4 sm:px-5 pb-5">
                <TimetableWeekGrid
                  grid={grid}
                  schedule={currentSchedule}
                  onEdit={openEdit}
                  slotHasConflict={slotHasConflict}
                />
              </div>
            </>
          )}
        </Card>
      </PageStack>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          editCell
            ? grid[editCell.day]?.[editCell.period]
              ? `Change assignment · ${recordDays[editCell.day]} · ${currentSchedule.periodRows[editCell.period]?.id}`
              : `Assign period · ${recordDays[editCell.day]} · ${currentSchedule.periodRows[editCell.period]?.id}`
            : "Assign period"
        }
        subtitle={
          editCell
            ? `${currentSchedule.periodRows[editCell.period]?.start ?? ""} – ${currentSchedule.periodRows[editCell.period]?.end ?? ""}`
            : undefined
        }
        footer={
          <>
            {editCell && grid[editCell.day]?.[editCell.period] && (
              <Button variant="danger" onClick={clearSlot} className="mr-auto">
                Clear
              </Button>
            )}
            <Button onClick={() => setEditOpen(false)} className={!(editCell && grid[editCell.day]?.[editCell.period]) ? "mr-auto" : ""}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveSlot}>
              {editCell && !grid[editCell.day]?.[editCell.period] ? "Assign" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Subject">
            <Select
              value={editSubject}
              onChange={(e) => {
                setEditSubject(e.target.value);
                const q = teachersForSubject(e.target.value);
                setEditTeacherId(q[0]?.id ?? teachers[0]?.id ?? "");
              }}
            >
              {subjectsForGrade.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Teacher" hint="Filtered by subject qualification">
            <Select value={editTeacherId} onChange={(e) => setEditTeacherId(e.target.value)}>
              {qualifiedTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class section" hint="All periods are assigned to this class">
            <TextInput value={classLocationLabel(grade, section)} readOnly disabled className="opacity-80" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create timetable"
        size="lg"
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={createTimetable}
              disabled={hasTimetable(createGrade, createSection, timetables)}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Grade" required>
            <Select
              value={createGrade}
              onChange={(e) => {
                setCreateGrade(e.target.value);
                setCreateSubjectTeachers(autoSuggestSubjectTeachers(e.target.value, createSection, timetables));
              }}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select value={createSection} onChange={(e) => setCreateSection(e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Academic term">
            <TextInput value={createTerm} onChange={(e) => setCreateTerm(e.target.value)} />
          </Field>
          <div className="sm:col-span-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Timetable will be created for{" "}
            <span className="font-medium text-foreground">{classKey(createGrade, createSection)}</span>
            {" "}— slots are assigned by class and section, not room number.
          </div>
          <div className="sm:col-span-2">
            <Field label="Initial fill">
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={createAutoGen}
                  onChange={(e) => setCreateAutoGen(e.target.checked)}
                  className="rounded border-border"
                />
                Auto-generate weekly slots from grade subjects
              </label>
            </Field>
          </div>
          {createAutoGen && (
            <>
              <div className="sm:col-span-2">
                <ScheduleConfigForm value={createScheduleInput} onChange={setCreateScheduleInput} />
              </div>
              <div className="sm:col-span-2">
                <TeacherAssignPanel
                mode={createTeacherMode}
                onModeChange={onCreateTeacherModeChange}
                subjects={createSubjects}
                subjectTeachers={createSubjectTeachers}
                onSubjectTeacherChange={(subjectId, teacherId) =>
                  setCreateSubjectTeachers((prev) => ({ ...prev, [subjectId]: teacherId }))
                }
                />
              </div>
            </>
          )}
          {hasTimetable(createGrade, createSection, timetables) && (
            <p className="sm:col-span-2 text-[11px] text-warning">
              A timetable already exists for {classKey(createGrade, createSection)}.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={autoGenOpen}
        onClose={closeAutoGenModal}
        title={autoGenStep === "preview" ? "Review generated timetables" : "Auto-generate timetables"}
        subtitle={
          autoGenStep === "preview"
            ? "Confirm to apply or go back to change settings"
            : "Configure options, preview the result, then confirm"
        }
        size="lg"
        footer={
          autoGenStep === "preview" ? (
            <>
              <Button variant="outline" onClick={backToConfigure} className="mr-auto">
                Back
              </Button>
              <Button onClick={closeAutoGenModal}>Cancel</Button>
              <Button variant="primary" onClick={confirmGeneration}>
                Confirm & apply
              </Button>
            </>
          ) : (
            <>
              <Button onClick={closeAutoGenModal} className="mr-auto">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={previewGeneration}
                disabled={autoGenScope === "current" && !current}
              >
                <Wand2 className="size-3.5" />
                Preview generation
              </Button>
            </>
          )
        }
      >
        {autoGenStep === "preview" && generatePreview ? (
          <GeneratePreviewPanel
            preview={generatePreview}
            scope={autoGenScope}
            grade={grade}
            section={section}
          />
        ) : (
          <div className="space-y-4">
            <ScheduleConfigForm value={autoScheduleInput} onChange={setAutoScheduleInput} />

            <Field label="Generation scope">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <label
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${autoGenScope === "current" ? "border-primary bg-primary/5" : "border-border hover:bg-surface-hover"}`}
                >
                  <input
                    type="radio"
                    name="gen-scope"
                    checked={autoGenScope === "current"}
                    onChange={() => setAutoGenScope("current")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">Current class only</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Generate for {current ? ck : "selected class"} — choose teachers manually or use auto-assign.
                    </div>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${autoGenScope === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-surface-hover"}`}
                >
                  <input
                    type="radio"
                    name="gen-scope"
                    checked={autoGenScope === "all"}
                    onChange={() => { setAutoGenScope("all"); setAutoTeacherMode("auto"); }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">All classes (institute-wide)</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Generate every class timetable in one run. Prevents the same teacher being assigned to two classes
                      at the same period. Senior grades get higher-experience teachers.
                    </div>
                  </div>
                </label>
              </div>
            </Field>

            {autoGenScope === "current" ? (
              <>
                {!current && (
                  <p className="text-[11px] text-warning">
                    No timetable exists for {ck}. Create one first, or use institute-wide generation.
                  </p>
                )}
                <TeacherAssignPanel
                  mode={autoTeacherMode}
                  onModeChange={onAutoTeacherModeChange}
                  subjects={subjectsForGrade}
                  subjectTeachers={autoSubjectTeachers}
                  onSubjectTeacherChange={(subjectId, teacherId) =>
                    setAutoSubjectTeachers((prev) => ({ ...prev, [subjectId]: teacherId }))
                  }
                />
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {INSTITUTE_CLASSES.length} classes · 4 qualified teachers per subject · experience matched to grade
                  level (Grade 12 → most experienced, Grade 9 → least experienced).
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 py-2 bg-muted/40 text-[10px] font-mono uppercase text-muted-foreground border-b border-border">
                    <span>Class</span>
                    <span>Subject</span>
                    <span>Assigned teacher</span>
                  </div>
                  {INSTITUTE_CLASSES.flatMap((cls) => {
                    const ck2 = classKey(cls.grade, cls.section);
                    const subs = getSubjectsByGrade()[cls.grade] ?? [];
                    return subs.map((sub) => {
                      const teacherId = instituteAssignments[ck2]?.[sub.id];
                      const teacher = getInstituteTeachers().find((t) => t.id === teacherId);
                      return (
                        <div
                          key={`${ck2}-${sub.id}`}
                          className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 py-2 border-b border-border text-xs items-center last:border-b-0"
                        >
                          <span className="font-mono">{ck2}</span>
                          <span>{sub.name}</span>
                          <span>
                            {teacher ? (
                              <>
                                <span className="font-medium">{teacher.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-1">({teacher.experienceYears}y)</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
