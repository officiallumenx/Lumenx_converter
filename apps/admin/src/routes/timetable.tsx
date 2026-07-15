import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Field,
  Select,
  TextInput,
  Pill,
  PageStack,
  EmptyState,
} from "@lumenx/ui-admin";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Plus,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  getGrades,
  getInitialTimetables,
  getSubjectsByGrade,
  getInstituteTeachers,
  autoGenerateTimetable,
  autoSuggestSubjectTeachers,
  inferSubjectTeachersFromTimetables,
  assignSubjectTeachersByExperience,
  buildDefaultSubjectPeriods,
  buildDefaultSubjectSlotSelections,
  inferSubjectPeriodsFromGrid,
  inferSubjectSlotsFromGrid,
  mergeSubjectTeachersForGrade,
  rankTeachersByExperience,
  detectConflicts,
  resolveConflictsForTimetable,
  conflictCountByTimetable,
  emptyGrid,
  fillEmptySlots,
  countEmptySlots,
  countTeachingSlotsPerWeek,
  getRecordSchedule,
  getRecordDays,
  hasTimetable,
  teachersForSubject,
  slotVenue,
  classKey,
  classLocationLabel,
  type TimetableRecord,
  type TimetableSlot,
  type TeacherAssignMode,
  type TimetableCellRef,
} from "@/lib/timetable-data";
import {
  buildScheduleConfig,
  defaultScheduleInput,
  scheduleSummary,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import { TimetableWeekGrid } from "@/components/timetable/TimetableViews";
import { ScheduleConfigForm } from "@/components/timetable/ScheduleConfigForm";
import { TeacherAssignPanel } from "@/components/timetable/TeacherAssignPanel";
import { TimetableCards } from "@/components/timetable/TimetableCards";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { getAcademicSections, getInstituteClasses, isCollegeMode } from "@/lib/academic-data";

export const Route = createFileRoute("/timetable")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) || undefined,
  }),
  head: () => ({ meta: [{ title: "Timetable — LumenX Admin" }] }),
  component: TimetablePage,
});

function countFilled(grid: TimetableRecord["grid"], schedule: ReturnType<typeof getRecordSchedule>) {
  return countTeachingSlotsPerWeek(schedule) - countEmptySlots(grid, schedule);
}

function TimetablePage() {
  const { id: selectedId } = useSearch({ from: "/timetable" });
  const navigate = useNavigate({ from: "/timetable" });
  const { profileId, profile } = useDemoProfile();
  const college = isCollegeMode();
  const grades = useMemo(() => {
    if (college) {
      return [...new Set(getInstituteClasses().map((c) => c.grade))];
    }
    return [...getGrades()];
  }, [profileId, college]);
  const sections = useMemo(() => getAcademicSections(), [profileId]);
  const defaultGrade = grades[0] ?? "Grade 10";

  const [timetables, setTimetables] = useState<TimetableRecord[]>(() => getInitialTimetables());

  const [editOpen, setEditOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ day: number; period: number } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createGrade, setCreateGrade] = useState(defaultGrade);
  const [createSection, setCreateSection] = useState(sections[0] ?? "A");
  const [createTerm, setCreateTerm] = useState("2025–26 · Term 2");
  const [createTeacherMode, setCreateTeacherMode] = useState<TeacherAssignMode>("manual");
  const [createSubjectTeachers, setCreateSubjectTeachers] = useState<Record<string, string>>({});
  const [createSubjectPeriods, setCreateSubjectPeriods] = useState<Record<string, number>>({});
  const [createSubjectSlotSelections, setCreateSubjectSlotSelections] = useState<
    Record<string, TimetableCellRef[]>
  >({});
  const [createScheduleInput, setCreateScheduleInput] = useState<ScheduleInput>(() =>
    defaultScheduleInput(),
  );

  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [staffTeacherMode, setStaffTeacherMode] = useState<TeacherAssignMode>("manual");
  const [staffSubjectTeachers, setStaffSubjectTeachers] = useState<Record<string, string>>({});
  const [staffSubjectPeriods, setStaffSubjectPeriods] = useState<Record<string, number>>({});
  const [staffSubjectSlotSelections, setStaffSubjectSlotSelections] = useState<
    Record<string, TimetableCellRef[]>
  >({});

  const openDetail = useCallback(
    (id: string) => {
      void navigate({ search: { id } });
    },
    [navigate],
  );

  const backToList = useCallback(() => {
    void navigate({ search: { id: undefined } });
  }, [navigate]);

  const current = useMemo(
    () => (selectedId ? timetables.find((t) => t.id === selectedId) : undefined),
    [timetables, selectedId],
  );

  const currentSchedule = useMemo(() => getRecordSchedule(current), [current]);
  const recordDays = useMemo(() => getRecordDays(current), [current]);
  const grid = current?.grid ?? emptyGrid(currentSchedule);
  const grade = current?.grade ?? "";
  const section = current?.section ?? "";
  const ck = current ? classKey(grade, section) : "";

  const conflictCounts = useMemo(() => conflictCountByTimetable(timetables), [timetables]);
  const allConflicts = useMemo(() => detectConflicts(timetables), [timetables]);
  const classConflicts = useMemo(
    () => (current ? detectConflicts(timetables, current.id) : []),
    [timetables, current],
  );

  const subjectsByGrade = useMemo(() => getSubjectsByGrade(), [profileId]);
  const teachers = useMemo(() => getInstituteTeachers(), []);

  useEffect(() => {
    setTimetables(getInitialTimetables());
    setCreateGrade(defaultGrade);
    setCreateSection(sections[0] ?? "A");
    navigate({ search: { id: undefined }, replace: true });
  }, [profileId]);

  const subjectsForGrade = current
    ? (subjectsByGrade[grade] ?? subjectsByGrade[defaultGrade] ?? [])
    : [];
  const createSubjects = subjectsByGrade[createGrade] ?? [];
  const createSchedulePreview = useMemo(
    () => buildScheduleConfig(createScheduleInput),
    [createScheduleInput],
  );
  const createMaxPeriods = countTeachingSlotsPerWeek(createSchedulePreview);

  const teachingSlotsPerWeek = current ? countTeachingSlotsPerWeek(currentSchedule) : 0;
  const filledCount = current ? countFilled(grid, currentSchedule) : 0;
  const emptyCount = current ? countEmptySlots(grid, currentSchedule) : 0;

  const qualifiedTeachers = useMemo(
    () => (editSubject ? teachersForSubject(editSubject) : teachers),
    [editSubject, teachers],
  );

  const updateCurrentGrid = (updater: (prev: typeof grid) => typeof grid) => {
    if (!current) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: updater(t.grid),
              updatedAt: new Date().toISOString().slice(0, 10),
              status: "draft" as const,
            }
          : t,
      ),
    );
  };

  const initSubjectPlanning = useCallback(
    (grade: string, schedule: ReturnType<typeof buildScheduleConfig>) => {
      const subs = subjectsByGrade[grade] ?? [];
      const periods = buildDefaultSubjectPeriods(subs);
      const slots = buildDefaultSubjectSlotSelections(subs, schedule, periods);
      return { periods, slots };
    },
    [subjectsByGrade],
  );

  const openCreateModal = () => {
    const scheduleInput = defaultScheduleInput();
    const schedule = buildScheduleConfig(scheduleInput);
    const { periods, slots } = initSubjectPlanning(createGrade, schedule);
    const suggested = inferSubjectTeachersFromTimetables(createGrade, createSection, timetables);
    const fromExisting = Object.keys(suggested).length > 0;
    setCreateTeacherMode(fromExisting ? "manual" : "auto");
    setCreateSubjectTeachers(
      mergeSubjectTeachersForGrade(
        createGrade,
        createSection,
        fromExisting
          ? suggested
          : assignSubjectTeachersByExperience([
              { id: "x", grade: createGrade, section: createSection },
            ])[classKey(createGrade, createSection)] ??
              autoSuggestSubjectTeachers(createGrade, createSection, timetables),
      ),
    );
    setCreateSubjectPeriods(periods);
    setCreateSubjectSlotSelections(slots);
    setCreateScheduleInput(scheduleInput);
    setCreateOpen(true);
  };

  const onCreateGradeChange = (g: string) => {
    setCreateGrade(g);
    const schedule = buildScheduleConfig(createScheduleInput);
    const { periods, slots } = initSubjectPlanning(g, schedule);
    setCreateSubjectPeriods(periods);
    setCreateSubjectSlotSelections(slots);
    const suggested = inferSubjectTeachersFromTimetables(g, createSection, timetables);
    setCreateSubjectTeachers(
      mergeSubjectTeachersForGrade(
        g,
        createSection,
        Object.keys(suggested).length > 0
          ? suggested
          : autoSuggestSubjectTeachers(g, createSection, timetables),
      ),
    );
  };

  const onCreateScheduleChange = (input: ScheduleInput) => {
    setCreateScheduleInput(input);
    const schedule = buildScheduleConfig(input);
    const subs = subjectsByGrade[createGrade] ?? [];
    setCreateSubjectSlotSelections(
      buildDefaultSubjectSlotSelections(subs, schedule, createSubjectPeriods),
    );
  };

  const createTimetable = () => {
    if (hasTimetable(createGrade, createSection, timetables)) return;
    const schedule = buildScheduleConfig(createScheduleInput);
    const subjectTeachers =
      createTeacherMode === "auto"
        ? autoSuggestSubjectTeachers(createGrade, createSection, timetables)
        : mergeSubjectTeachersForGrade(createGrade, createSection, createSubjectTeachers);

    const newGrid = autoGenerateTimetable(createGrade, createSection, {
      teacherMode: createTeacherMode,
      grade: createGrade,
      section: createSection,
      schedule,
      subjectTeachers,
      subjectPeriodsPerWeek: createSubjectPeriods,
      subjectSlotSelections: createSubjectSlotSelections,
      existingTimetables: timetables,
    });

    const idSuffix = college
      ? (() => {
          const m = createGrade.match(/^([A-Z]+)\s·\s(.+)$/);
          if (!m) return `FY${createSection}`;
          const dept = m[1];
          const level = profile.academic.levels.find((l) => l.label === m[2]?.trim());
          return `${dept}-${level?.shortLabel ?? "FY"}${createSection}`;
        })()
      : `${createGrade.replace("Grade ", "")}${createSection}`;
    const id = `TT-${idSuffix}`;
    const record: TimetableRecord = {
      id,
      grade: createGrade,
      section: createSection,
      term: createTerm,
      status: "draft",
      grid: newGrid,
      schedule,
      subjectPeriodsPerWeek: { ...createSubjectPeriods },
      subjectSlotSelections: JSON.parse(JSON.stringify(createSubjectSlotSelections)),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    setTimetables((prev) => [...prev, record]);
    setCreateOpen(false);
    openDetail(id);
  };

  const openEdit = (day: number, period: number) => {
    if (!current || currentSchedule.periodRows[period]?.isBreak) return;
    const slot = grid[day]?.[period];
    setEditCell({ day, period });
    setEditSubject(slot?.subject ?? subjectsForGrade[0]?.code ?? "MTH 101");
    setEditTeacherId(
      slot?.teacherId ?? teachersForSubject(slot?.subject ?? "MTH 101")[0]?.id ?? teachers[0]?.id ?? "",
    );
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

  const fillEmptyPeriods = () => {
    if (!current) return;
    const subjectTeachers = inferSubjectTeachersFromTimetables(grade, section, timetables);
    const subjectPeriods =
      current.subjectPeriodsPerWeek ?? inferSubjectPeriodsFromGrid(current.grid, subjectsForGrade);
    const slotSelections =
      current.subjectSlotSelections ??
      inferSubjectSlotsFromGrid(current.grid, subjectsForGrade, currentSchedule);
    const { grid: nextGrid, filled } = fillEmptySlots(grade, section, current.grid, {
      teacherMode: "auto",
      grade,
      section,
      schedule: currentSchedule,
      subjectTeachers,
      subjectPeriodsPerWeek: subjectPeriods,
      subjectSlotSelections: slotSelections,
      existingTimetables: timetables,
      excludeTimetableId: current.id,
    });
    if (filled === 0) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? { ...t, grid: nextGrid, status: "draft", updatedAt: new Date().toISOString().slice(0, 10) }
          : t,
      ),
    );
  };

  const fixConflicts = () => {
    if (!current) return;
    const { timetables: next, fixed } = resolveConflictsForTimetable(timetables, current.id);
    setTimetables(next);
    if (fixed > 0) return;
  };

  const regenerateCurrent = () => {
    if (!current) return;
    const subjectTeachers =
      staffTeacherMode === "auto"
        ? autoSuggestSubjectTeachers(grade, section, timetables.filter((t) => t.id !== current.id))
        : mergeSubjectTeachersForGrade(grade, section, staffSubjectTeachers);

    const newGrid = autoGenerateTimetable(grade, section, {
      teacherMode: staffTeacherMode,
      grade,
      section,
      schedule: currentSchedule,
      subjectTeachers,
      subjectPeriodsPerWeek: staffSubjectPeriods,
      subjectSlotSelections: staffSubjectSlotSelections,
      existingTimetables: timetables,
      excludeTimetableId: current.id,
    });

    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: newGrid,
              subjectPeriodsPerWeek: { ...staffSubjectPeriods },
              subjectSlotSelections: JSON.parse(JSON.stringify(staffSubjectSlotSelections)),
              status: "draft",
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : t,
      ),
    );
    setStaffPanelOpen(false);
  };

  const publishTimetable = () => {
    if (!current || classConflicts.length > 0 || emptyCount > 0) return;
    setTimetables((prev) =>
      prev.map((t) => (t.id === current.id ? { ...t, status: "published" as const } : t)),
    );
  };

  const slotHasConflict = (day: number, period: number, slot: TimetableSlot) => {
    const dayLabel = recordDays[day] ?? "";
    const periodLabel = currentSchedule.periodRows[period]?.label ?? "";
    return classConflicts.some(
      (c) =>
        c.day === dayLabel &&
        c.period === periodLabel &&
        (c.resource === slot.teacher || c.resource === slot.teacherId),
    );
  };

  const openStaffPanel = () => {
    if (!current) return;
    const inferred = inferSubjectTeachersFromTimetables(grade, section, timetables);
    setStaffSubjectTeachers(mergeSubjectTeachersForGrade(grade, section, inferred));
    setStaffSubjectPeriods(
      current.subjectPeriodsPerWeek ?? inferSubjectPeriodsFromGrid(current.grid, subjectsForGrade),
    );
    setStaffSubjectSlotSelections(
      current.subjectSlotSelections ??
        inferSubjectSlotsFromGrid(current.grid, subjectsForGrade, currentSchedule),
    );
    setStaffTeacherMode("manual");
    setStaffPanelOpen(true);
  };

  const moveSlot = (
    from: TimetableCellRef,
    to: TimetableCellRef,
  ) => {
    if (!current) return;
    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      const source = next[from.day]?.[from.period] ?? null;
      const target = next[to.day]?.[to.period] ?? null;
      next[from.day]![from.period] = target;
      next[to.day]![to.period] = source;
      return next;
    });
  };

  const assignSubjectToCell = (
    subjectId: string,
    to: TimetableCellRef,
    meta: { code: string; name: string },
  ) => {
    if (!current) return;
    const sub = subjectsForGrade.find((s) => s.id === subjectId);
    const teacher =
      rankTeachersByExperience(sub ?? { id: subjectId, name: meta.name, code: meta.code, periodsPerWeek: 1 })[0] ??
      teachers[0];
    if (!teacher) return;
    const slot: TimetableSlot = {
      subjectId,
      subject: meta.code,
      teacherId: teacher.id,
      teacher: teacher.name,
      room: slotVenue(grade, section),
    };
    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      next[to.day]![to.period] = slot;
      return next;
    });
  };

  const createAutoFilled = Object.keys(
    inferSubjectTeachersFromTimetables(createGrade, createSection, timetables),
  ).length > 0;

  /* ── List view ── */
  if (!selectedId || !current) {
    return (
      <AppShell
        title="Timetables"
        subtitle={`${timetables.length} class schedules · click a card to open`}
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="size-3.5" /> New timetable
          </Button>
        }
      >
        <PageStack>
          {allConflicts.length > 0 && (
            <div className="lx-timetable-conflict-banner" role="status">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              <div>
                <strong>
                  {allConflicts.length} teacher conflict{allConflicts.length !== 1 ? "s" : ""}
                </strong>
                {" across timetables — open a timetable and use "}
                <span className="font-medium">Fix conflicts</span> to resolve.
              </div>
            </div>
          )}

          {timetables.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6 text-primary" />}
              title="No timetables yet"
              hint="Create your first class timetable — assign subjects, staff, and period timings."
              action={
                <Button variant="primary" onClick={openCreateModal}>
                  <Plus className="size-3.5" /> Create timetable
                </Button>
              }
            />
          ) : (
            <TimetableCards
              timetables={timetables}
              conflictCounts={conflictCounts}
              onOpen={openDetail}
            />
          )}
        </PageStack>

        <CreateTimetableModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          createGrade={createGrade}
          createSection={createSection}
          createTerm={createTerm}
          createSubjects={createSubjects}
          createTeacherMode={createTeacherMode}
          createSubjectTeachers={createSubjectTeachers}
          createSubjectPeriods={createSubjectPeriods}
          createSubjectSlotSelections={createSubjectSlotSelections}
          createScheduleInput={createScheduleInput}
          createMaxPeriods={createMaxPeriods}
          autoFilledFromExisting={createAutoFilled}
          timetables={timetables}
          onGradeChange={onCreateGradeChange}
          onSectionChange={setCreateSection}
          onTermChange={setCreateTerm}
          onTeacherModeChange={(mode) => {
            setCreateTeacherMode(mode);
            if (mode === "auto") {
              setCreateSubjectTeachers(
                autoSuggestSubjectTeachers(createGrade, createSection, timetables),
              );
            }
          }}
          onSubjectTeacherChange={(subjectId, teacherId) =>
            setCreateSubjectTeachers((prev) => ({ ...prev, [subjectId]: teacherId }))
          }
          onSubjectPeriodChange={(subjectId, periods) =>
            setCreateSubjectPeriods((prev) => ({ ...prev, [subjectId]: periods }))
          }
          onSlotSelectionsChange={setCreateSubjectSlotSelections}
          onScheduleChange={onCreateScheduleChange}
          onCreate={createTimetable}
          gradeOptions={grades}
          sectionOptions={sections}
          levelLabel={profile.academic.levelLabel}
        />
      </AppShell>
    );
  }

  /* ── Detail view ── */
  return (
    <AppShell
      title={ck}
      subtitle={`${current.term} · ${scheduleSummary(currentSchedule)}`}
      actions={
        <>
          {classConflicts.length > 0 && (
            <Button variant="outline" onClick={fixConflicts}>
              <Wand2 className="size-3.5" /> Fix conflicts ({classConflicts.length})
            </Button>
          )}
          <Button
            variant="primary"
            onClick={publishTimetable}
            disabled={
              classConflicts.length > 0 || current.status === "published" || emptyCount > 0
            }
          >
            <CheckCircle2 className="size-3.5" />
            Publish
          </Button>
        </>
      }
    >
      <PageStack>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="size-3.5" /> All timetables
          </Button>
          <Pill tone={current.status === "published" ? "success" : "warning"}>
            {current.status === "published" ? "Published" : "Draft"}
          </Pill>
          <Pill tone="neutral">
            {filledCount}/{teachingSlotsPerWeek} periods
          </Pill>
          {classConflicts.length > 0 && (
            <Pill tone="danger">
              <AlertTriangle className="size-3" />
              {classConflicts.length} conflict{classConflicts.length !== 1 ? "s" : ""}
            </Pill>
          )}
        </div>

        {classConflicts.length > 0 && (
          <div className="lx-timetable-conflict-banner" role="status">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <strong>Teacher double-booked</strong>
              {" — "}
              {classConflicts.slice(0, 2).map((c, i) => (
                <span key={i}>
                  {i > 0 && "; "}
                  {c.resource} on {c.day} · {c.period} ({c.classes.join(" vs ")})
                </span>
              ))}
              {classConflicts.length > 2 && ` +${classConflicts.length - 2} more`}
            </div>
          </div>
        )}

        <div className="lx-timetable-actions">
          {emptyCount > 0 && (
            <Button variant="outline" onClick={fillEmptyPeriods}>
              <Zap className="size-3.5" /> Fill empty ({emptyCount})
            </Button>
          )}
          <Button variant="outline" onClick={openStaffPanel}>
            <Wand2 className="size-3.5" /> Staff & regenerate
          </Button>
        </div>

        <Card>
          <CardHeader
            title="Weekly schedule"
            hint="Drag subjects onto periods, drag periods to move, or click to edit"
          />
          <div className="px-4 sm:px-5 pb-5">
            <TimetableWeekGrid
              grid={grid}
              schedule={currentSchedule}
              onEdit={openEdit}
              slotHasConflict={slotHasConflict}
              subjects={subjectsForGrade}
              enableDragDrop
              onMoveSlot={moveSlot}
              onAssignSubject={assignSubjectToCell}
            />
          </div>
        </Card>
      </PageStack>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          editCell
            ? grid[editCell.day]?.[editCell.period]
              ? `Edit · ${recordDays[editCell.day]} · ${currentSchedule.periodRows[editCell.period]?.id}`
              : `Assign · ${recordDays[editCell.day]} · ${currentSchedule.periodRows[editCell.period]?.id}`
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
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveSlot}>
              Save
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
          <Field label="Teacher" hint="Qualified staff for this subject">
            <Select value={editTeacherId} onChange={(e) => setEditTeacherId(e.target.value)}>
              {qualifiedTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.experienceYears}y
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class">
            <TextInput value={classLocationLabel(grade, section)} readOnly disabled className="opacity-80" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={staffPanelOpen}
        onClose={() => setStaffPanelOpen(false)}
        title="Staff assignment & regenerate"
        subtitle="Pick day/period slots per subject, assign teachers, then rebuild"
        size="xl"
        footer={
          <>
            <Button onClick={() => setStaffPanelOpen(false)} className="mr-auto">
              Cancel
            </Button>
            <Button variant="primary" onClick={regenerateCurrent}>
              <Wand2 className="size-3.5" /> Regenerate timetable
            </Button>
          </>
        }
      >
        <TeacherAssignPanel
          mode={staffTeacherMode}
          onModeChange={(mode) => {
            setStaffTeacherMode(mode);
            if (mode === "auto") {
              setStaffSubjectTeachers(
                autoSuggestSubjectTeachers(
                  grade,
                  section,
                  timetables.filter((t) => t.id !== current.id),
                ),
              );
            }
          }}
          subjects={subjectsForGrade}
          subjectTeachers={staffSubjectTeachers}
          subjectPeriods={staffSubjectPeriods}
          subjectSlotSelections={staffSubjectSlotSelections}
          schedule={currentSchedule}
          maxPeriodsPerWeek={teachingSlotsPerWeek}
          onSubjectTeacherChange={(subjectId, teacherId) =>
            setStaffSubjectTeachers((prev) => ({ ...prev, [subjectId]: teacherId }))
          }
          onSubjectPeriodChange={(subjectId, periods) =>
            setStaffSubjectPeriods((prev) => ({ ...prev, [subjectId]: periods }))
          }
          onSlotSelectionsChange={setStaffSubjectSlotSelections}
          autoFilledFromExisting={Object.keys(staffSubjectTeachers).length > 0}
        />
      </Modal>
    </AppShell>
  );
}

function CreateTimetableModal({
  open,
  onClose,
  createGrade,
  createSection,
  createTerm,
  createSubjects,
  createTeacherMode,
  createSubjectTeachers,
  createSubjectPeriods,
  createSubjectSlotSelections,
  createScheduleInput,
  createMaxPeriods,
  autoFilledFromExisting,
  timetables,
  onGradeChange,
  onSectionChange,
  onTermChange,
  onTeacherModeChange,
  onSubjectTeacherChange,
  onSubjectPeriodChange,
  onSlotSelectionsChange,
  onScheduleChange,
  onCreate,
  gradeOptions,
  sectionOptions,
  levelLabel,
}: {
  open: boolean;
  onClose: () => void;
  createGrade: string;
  createSection: string;
  createTerm: string;
  createSubjects: { id: string; name: string; code: string; periodsPerWeek: number }[];
  createTeacherMode: TeacherAssignMode;
  createSubjectTeachers: Record<string, string>;
  createSubjectPeriods: Record<string, number>;
  createSubjectSlotSelections: Record<string, TimetableCellRef[]>;
  createScheduleInput: ScheduleInput;
  createMaxPeriods: number;
  autoFilledFromExisting: boolean;
  timetables: TimetableRecord[];
  onGradeChange: (g: string) => void;
  onSectionChange: (s: string) => void;
  onTermChange: (t: string) => void;
  onTeacherModeChange: (mode: TeacherAssignMode) => void;
  onSubjectTeacherChange: (subjectId: string, teacherId: string) => void;
  onSubjectPeriodChange: (subjectId: string, periods: number) => void;
  onSlotSelectionsChange: (next: Record<string, TimetableCellRef[]>) => void;
  onScheduleChange: (input: ScheduleInput) => void;
  onCreate: () => void;
  gradeOptions: string[];
  sectionOptions: string[];
  levelLabel: string;
}) {
  const exists = hasTimetable(createGrade, createSection, timetables);
  const createSchedule = buildScheduleConfig(createScheduleInput);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create timetable"
      subtitle="Select class, set period timings, assign staff, then generate"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onCreate} disabled={exists}>
            <Plus className="size-3.5" /> Create & open
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={levelLabel} required>
            <Select value={createGrade} onChange={(e) => onGradeChange(e.target.value)}>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select value={createSection} onChange={(e) => onSectionChange(e.target.value)}>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Term">
            <TextInput value={createTerm} onChange={(e) => onTermChange(e.target.value)} />
          </Field>
        </div>

        {exists && (
          <p className="text-[11px] text-warning">
            A timetable already exists for {classKey(createGrade, createSection)}.
          </p>
        )}

        <ScheduleConfigForm value={createScheduleInput} onChange={onScheduleChange} />

        <TeacherAssignPanel
          mode={createTeacherMode}
          onModeChange={onTeacherModeChange}
          subjects={createSubjects}
          subjectTeachers={createSubjectTeachers}
          subjectPeriods={createSubjectPeriods}
          subjectSlotSelections={createSubjectSlotSelections}
          schedule={createSchedule}
          maxPeriodsPerWeek={createMaxPeriods}
          onSubjectTeacherChange={onSubjectTeacherChange}
          onSubjectPeriodChange={onSubjectPeriodChange}
          onSlotSelectionsChange={onSlotSelectionsChange}
          autoFilledFromExisting={autoFilledFromExisting}
        />
      </div>
    </Modal>
  );
}
