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
  Clock,
  Lock,
  Plus,
  Search,
  Undo2,
  Wand2,
} from "lucide-react";
import { TimetableConflictBanner } from "@/components/timetable/TimetableConflictBanner";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  getGrades,
  getSubjectsByGrade,
  getInstituteTeachers,
  buildDefaultSubjectPeriods,
  getClassSubjectTeacherAssignments,
  detectConflicts,
  emptyGrid,
  countEmptySlots,
  countTeachingSlotsPerWeek,
  validateSubjectPeriodBudget,
  getRecordSchedule,
  getRecordDays,
  hasTimetable,
  teachersForSubject,
  slotVenue,
  classKey,
  classLocationLabel,
  capSubjectPeriodsToOnePerDay,
  type TimetableRecord,
  type TimetableSlot,
  type TimetableCellRef,
  type PlacementPreference,
} from "@/lib/timetable-data";
import { teacherById } from "@/lib/subjects-data";
import {
  buildScheduleConfig,
  defaultScheduleInput,
  isSlotApplicable,
  scheduleInputFromConfig,
  scheduleSummary,
  validateBellItems,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import {
  loadInstituteScheduleDefault,
  loadTimetableDirectory,
  replaceTimetableDirectory,
  saveInstituteScheduleDefault,
} from "@/lib/timetable-directory-store";
import {
  notifyTimetablePublished,
  notifyTimetableChanged,
} from "@lumenx/module-notifications";
import { TimetableWeekGrid } from "@/components/timetable/TimetableViews";
import { ScheduleConfigForm } from "@/components/timetable/ScheduleConfigForm";
import { TeacherAssignPanel } from "@/components/timetable/TeacherAssignPanel";
import { TimetableCards } from "@/components/timetable/TimetableCards";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { getAcademicSections, getInstituteClasses, isCollegeMode } from "@/lib/academic-data";
import { loadClassDirectory } from "@/lib/class-directory-store";
import {
  evaluatePublishReadiness,
  getTimetableReadiness,
  buildTimetableReadinessById,
  readinessLabel,
  readinessTone,
  sanitizeSubjectSlotSelections,
  summarizeReadiness,
  toggleLockedCell,
  validateCellPlacement,
  validatePreferenceCapacity,
  type TimetableReadiness,
} from "@/lib/timetable-manager";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";

export const Route = createFileRoute("/timetable")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) || undefined,
    createGrade: (s.createGrade as string) || undefined,
    createSection: (s.createSection as string) || undefined,
    openCreate: s.openCreate === true || s.openCreate === "true" || undefined,
  }),
  head: () => ({ meta: [{ title: "Timetable — LumenX Admin" }] }),
  component: TimetablePage,
});

function countFilled(grid: TimetableRecord["grid"], schedule: ReturnType<typeof getRecordSchedule>) {
  return countTeachingSlotsPerWeek(schedule) - countEmptySlots(grid, schedule);
}

function TimetablePage() {
  const search = useSearch({ from: "/timetable" });
  const { id: selectedId, createGrade: prefillGrade, createSection: prefillSection, openCreate } =
    search;
  const navigate = useNavigate();
  const { guardWriteAction, writesAllowed, reason } = useAdminWriteAccess();
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

  const [timetables, setTimetablesState] = useState<TimetableRecord[]>(() =>
    loadTimetableDirectory(),
  );

  const setTimetables = useCallback(
    (updater: TimetableRecord[] | ((prev: TimetableRecord[]) => TimetableRecord[])) => {
      setTimetablesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        replaceTimetableDirectory(next);
        return next;
      });
    },
    [],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ day: number; period: number } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createGrade, setCreateGrade] = useState(defaultGrade);
  const [createSection, setCreateSection] = useState(sections[0] ?? "A");
  const [createTerm, setCreateTerm] = useState("2025–26 · Term 2");
  const [createUseInstituteSchedule, setCreateUseInstituteSchedule] = useState(true);
  const [createScheduleInput, setCreateScheduleInput] = useState<ScheduleInput>(() =>
    loadInstituteScheduleDefault(),
  );

  const [subjectPlanOpen, setSubjectPlanOpen] = useState(false);
  const [staffSubjectTeachers, setStaffSubjectTeachers] = useState<Record<string, string>>({});
  const [staffSubjectPeriods, setStaffSubjectPeriods] = useState<Record<string, number>>({});
  const [staffSubjectSlotSelections, setStaffSubjectSlotSelections] = useState<
    Record<string, TimetableCellRef[]>
  >({});
  const [staffSubjectPreferences, setStaffSubjectPreferences] = useState<
    Record<string, PlacementPreference>
  >({});
  const [planCapacityError, setPlanCapacityError] = useState<string | null>(null);

  const [scheduleEditOpen, setScheduleEditOpen] = useState(false);
  const [scheduleEditInput, setScheduleEditInput] = useState<ScheduleInput>(() =>
    defaultScheduleInput(),
  );
  const [scheduleSaveAsInstitute, setScheduleSaveAsInstitute] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);

  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterReadiness, setFilterReadiness] = useState<"all" | TimetableReadiness>("all");
  const [filterQuery, setFilterQuery] = useState("");

  const openDetail = useCallback(
    (id: string) => {
      void navigate({
        to: "/timetable",
        search: {
          id,
          createGrade: undefined,
          createSection: undefined,
          openCreate: undefined,
        },
      });
    },
    [navigate],
  );

  const backToList = useCallback(() => {
    void navigate({
      to: "/timetable",
      search: {
        id: undefined,
        createGrade: undefined,
        createSection: undefined,
        openCreate: undefined,
      },
    });
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
  const currentClassKey = current ? classKey(grade, section) : "";

  const allConflicts = useMemo(() => detectConflicts(timetables), [timetables]);
  const conflictCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const timetable of timetables) {
      const classLabel = classKey(timetable.grade, timetable.section);
      counts[timetable.id] = allConflicts.filter((c) => c.classes.includes(classLabel)).length;
    }
    return counts;
  }, [timetables, allConflicts]);
  const classConflicts = useMemo(
    () =>
      current
        ? allConflicts.filter((c) => c.classes.includes(classKey(current.grade, current.section)))
        : [],
    [allConflicts, current],
  );
  const publishReport = useMemo(
    () => (current ? evaluatePublishReadiness(current, timetables, classConflicts) : null),
    [current, timetables, classConflicts],
  );
  const readinessById = useMemo(
    () => buildTimetableReadinessById(timetables, allConflicts),
    [timetables, allConflicts],
  );
  const readinessTotals = useMemo(
    () => summarizeReadiness(timetables, readinessById),
    [timetables, readinessById],
  );

  const subjectsByGrade = useMemo(() => getSubjectsByGrade(), [profileId]);
  const teachers = useMemo(() => getInstituteTeachers(), []);

  useEffect(() => {
    setTimetablesState(loadTimetableDirectory());
    setCreateGrade(prefillGrade ?? defaultGrade);
    setCreateSection(prefillSection ?? sections[0] ?? "A");
    setCreateScheduleInput(loadInstituteScheduleDefault());
    if (openCreate || prefillGrade) {
      setCreateOpen(true);
    }
  }, [profileId]);

  useEffect(() => {
    if (openCreate || prefillGrade) {
      setCreateGrade(prefillGrade ?? defaultGrade);
      setCreateSection(prefillSection ?? sections[0] ?? "A");
      setCreateOpen(true);
      void navigate({
        to: "/timetable",
        search: {
          id: selectedId,
          createGrade: undefined,
          createSection: undefined,
          openCreate: undefined,
        },
        replace: true,
      });
    }
  }, [openCreate, prefillGrade, prefillSection, defaultGrade, sections, navigate, selectedId]);

  const subjectsForGrade = current
    ? (subjectsByGrade[grade] ?? subjectsByGrade[defaultGrade] ?? [])
    : [];
  const createSchedulePreview = useMemo(
    () => buildScheduleConfig(createScheduleInput),
    [createScheduleInput],
  );
  const createScheduleIssues = validateBellItems(createScheduleInput.bellItems ?? []);
  const createHasScheduleErrors = createScheduleIssues.some((i) => i.severity === "error");

  const teachingSlotsPerWeek = current ? countTeachingSlotsPerWeek(currentSchedule) : 0;
  const filledCount = current ? countFilled(grid, currentSchedule) : 0;
  const emptyCount = current ? countEmptySlots(grid, currentSchedule) : 0;
  const staffBudget = validateSubjectPeriodBudget(staffSubjectPeriods, currentSchedule);

  const subjectPeriodStats = useMemo(() => {
    if (!current) return [];
    const targets =
      current.subjectPeriodsPerWeek ??
      Object.fromEntries(subjectsForGrade.map((s) => [s.id, s.periodsPerWeek]));
    return subjectsForGrade.map((subject) => {
      const target = targets[subject.id] ?? subject.periodsPerWeek;
      let filled = 0;
      for (const dayCol of grid) {
        for (const slot of dayCol) {
          if (slot && (slot.subjectId === subject.id || slot.subject === subject.code)) {
            filled += 1;
          }
        }
      }
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        target,
        filled,
        remaining: Math.max(0, target - filled),
      };
    });
  }, [current, subjectsForGrade, grid]);

  const plannedPeriodTotal = subjectPeriodStats.reduce((sum, row) => sum + row.target, 0);
  const plannedFilledTotal = subjectPeriodStats.reduce((sum, row) => sum + row.filled, 0);
  const plannedRemainingTotal = subjectPeriodStats.reduce((sum, row) => sum + row.remaining, 0);

  const classOptions = useMemo(() => {
    try {
      return loadClassDirectory();
    } catch {
      return [];
    }
  }, [profileId]);

  const gradeSectionOptions = useMemo(() => {
    if (classOptions.length > 0) {
      const gradesFromClasses = [...new Set(classOptions.map((c) => c.timetableGrade))];
      return { grades: gradesFromClasses.length ? gradesFromClasses : grades, sections };
    }
    return { grades, sections };
  }, [classOptions, grades, sections]);

  const sameGradePeers = useMemo(() => {
    if (!current) return [];
    return timetables
      .filter((t) => t.grade === current.grade)
      .sort((a, b) => a.section.localeCompare(b.section));
  }, [timetables, current]);

  const filteredTimetables = useMemo(() => {
    const normalizedQuery = filterQuery.trim().toLowerCase();
    return timetables.filter((timetable) => {
      if (filterGrade !== "all" && timetable.grade !== filterGrade) return false;
      const readiness = readinessById[timetable.id] ?? getTimetableReadiness(timetable, timetables);
      if (filterReadiness !== "all" && readiness !== filterReadiness) return false;
      if (!normalizedQuery) return true;
      const label = classKey(timetable.grade, timetable.section).toLowerCase();
      return (
        label.includes(normalizedQuery) ||
        timetable.term.toLowerCase().includes(normalizedQuery) ||
        timetable.id.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [timetables, filterGrade, filterReadiness, filterQuery, readinessById]);

  const qualifiedTeachers = useMemo(() => {
    if (!editSubject) return [] as typeof teachers;
    const subject = subjectsForGrade.find((s) => s.code === editSubject);
    return teachersForSubject(editSubject, subject?.name);
  }, [editSubject, teachers, subjectsForGrade]);

  const editTeacherOptions = useMemo(() => {
    const subject = subjectsForGrade.find((s) => s.code === editSubject);
    const plannedId = subject ? current?.subjectTeachers?.[subject.id] : undefined;
    const seen = new Set<string>();
    const planned: typeof teachers = [];
    const qualified: typeof teachers = [];
    const rest: typeof teachers = [];

    const pushUnique = (list: typeof teachers, teacher: (typeof teachers)[number]) => {
      if (seen.has(teacher.id)) return;
      seen.add(teacher.id);
      list.push(teacher);
    };

    if (plannedId) {
      const plannedTeacher = teacherById(plannedId) ?? teachers.find((t) => t.id === plannedId);
      if (plannedTeacher) pushUnique(planned, plannedTeacher);
    }
    for (const t of qualifiedTeachers) pushUnique(qualified, t);
    for (const t of teachers) {
      if (seen.has(t.id)) continue;
      rest.push(t);
    }
    return { planned, qualified, rest, plannedId };
  }, [editSubject, subjectsForGrade, current?.subjectTeachers, qualifiedTeachers, teachers]);

  const updateCurrent = (patch: Partial<TimetableRecord>) => {
    if (!current) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              ...patch,
              updatedAt: new Date().toISOString().slice(0, 10),
              status: patch.status ?? ("draft" as const),
            }
          : t,
      ),
    );
  };

  const updateCurrentGrid = (updater: (prev: typeof grid) => typeof grid) => {
    if (!current) return;
    // Always read the latest grid from state updater to avoid stale closures.
    setTimetables((prev) => {
      const focus = prev.find((t) => t.id === current.id);
      if (!focus) return prev;
      const nextGrid = updater(focus.grid);
      const next = prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: nextGrid,
              status: "draft" as const,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : t,
      );
      replaceTimetableDirectory(next);
      return next;
    });
  };

  const openCreateModal = () => {
    setCreateGrade(defaultGrade);
    setCreateSection(sections[0] ?? "A");
    setCreateUseInstituteSchedule(true);
    setCreateScheduleInput(loadInstituteScheduleDefault());
    setCreateOpen(true);
  };

  const createTimetable = () => {
    if (hasTimetable(createGrade, createSection, timetables)) return;
    if (createHasScheduleErrors) return;
    const schedule = createUseInstituteSchedule
      ? buildScheduleConfig(loadInstituteScheduleDefault())
      : buildScheduleConfig(createScheduleInput);

    const subjects = subjectsByGrade[createGrade] ?? [];
    const periods = capSubjectPeriodsToOnePerDay(buildDefaultSubjectPeriods(subjects), schedule);
    const preferences = Object.fromEntries(
      subjects.map((s) => [s.id, "any" as PlacementPreference]),
    );
    // Only use teachers already assigned on the class page — never auto-suggest.
    const subjectTeachers = getClassSubjectTeacherAssignments(createGrade, createSection);

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
      grid: emptyGrid(schedule),
      schedule,
      subjectPeriodsPerWeek: { ...periods },
      subjectSlotSelections: {},
      subjectTeachers: { ...subjectTeachers },
      subjectPlacementPreferences: preferences,
      relaxedPreferenceNotices: [],
      lockedCells: [],
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
    if (slot) {
      setEditSubject(slot.subject);
      setEditTeacherId(slot.teacherId);
    } else {
      setEditSubject("");
      setEditTeacherId("");
    }
    setEditError(null);
    setEditOpen(true);
  };

  const onEditSubjectChange = (code: string) => {
    setEditSubject(code);
    setEditError(null);
    const subject = subjectsForGrade.find((s) => s.code === code);
    if (!subject) {
      setEditTeacherId("");
      return;
    }
    // Prefer the teacher already chosen in Subject plan for this class.
    const plannedId = current?.subjectTeachers?.[subject.id];
    if (plannedId && (teacherById(plannedId) || teachers.some((t) => t.id === plannedId))) {
      setEditTeacherId(plannedId);
      return;
    }
    setEditTeacherId("");
  };

  const saveSlot = () => {
    if (!editCell || !current) return;
    const { day, period } = editCell;
    if (!editSubject) {
      setEditError("Select a subject.");
      return;
    }
    if (!editTeacherId) {
      setEditError("Select a teacher.");
      return;
    }
    const teacher = teacherById(editTeacherId) ?? teachers.find((t) => t.id === editTeacherId);
    const subject = subjectsForGrade.find((s) => s.code === editSubject);
    if (!teacher || !subject) {
      setEditError("Select both a subject and a teacher.");
      return;
    }
    const room = slotVenue(grade, section);
    const preference = current.subjectPlacementPreferences?.[subject.id] ?? "any";

    // Temporarily clear target so self-conflict checks ignore the cell being edited.
    const gridForValidation = current.grid.map((col, d) =>
      col.map((slot, p) => (d === day && p === period ? null : slot)),
    );
    const validation = validateCellPlacement({
      grid: gridForValidation,
      schedule: currentSchedule,
      day,
      period,
      subjectId: subject.id,
      subjectCode: subject.code,
      teacherId: teacher.id,
      room,
      preference,
      existingTimetables: timetables,
      excludeTimetableId: current.id,
    });
    if (!validation.ok) {
      setEditError(validation.reason ?? "Cannot place subject here.");
      return;
    }

    const slot: TimetableSlot = {
      subjectId: subject.id,
      subject: editSubject,
      teacherId: teacher.id,
      teacher: teacher.name,
      room,
    };
    setTimetables((prev) => {
      const focus = prev.find((t) => t.id === current.id);
      if (!focus) return prev;
      const nextGrid = focus.grid.map((col) => [...col]);
      nextGrid[day]![period] = slot;
      const next = prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: nextGrid,
              subjectTeachers: {
                ...(t.subjectTeachers ?? {}),
                [subject.id]: teacher.id,
              },
              status: "draft" as const,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : t,
      );
      replaceTimetableDirectory(next);
      return next;
    });
    setEditOpen(false);
  };

  const clearSlot = () => {
    if (!editCell || !current) return;
    const { day, period } = editCell;
    if ((current.lockedCells ?? []).some((c) => c.day === day && c.period === period)) {
      setEditError("Unlock this period before clearing it.");
      return;
    }
    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      next[day]![period] = null;
      return next;
    });
    setEditOpen(false);
  };

  const handleToggleLock = (day: number, period: number) => {
    if (!current) return;
    if (!current.grid[day]?.[period]) return;
    updateCurrent({
      lockedCells: toggleLockedCell(current.lockedCells, day, period),
      status: current.status,
    });
  };

  const openSubjectPlan = () => {
    if (!current) return;
    const classTeachers = getClassSubjectTeacherAssignments(grade, section);
    const saved = current.subjectTeachers ?? {};
    setStaffSubjectTeachers({ ...classTeachers, ...saved });
    setStaffSubjectPeriods(
      current.subjectPeriodsPerWeek ??
        Object.fromEntries(subjectsForGrade.map((s) => [s.id, s.periodsPerWeek])),
    );
    setStaffSubjectSlotSelections(
      sanitizeSubjectSlotSelections(
        current.subjectSlotSelections ?? {},
        currentSchedule,
        current.subjectPlacementPreferences,
      ),
    );
    setStaffSubjectPreferences(
      current.subjectPlacementPreferences ??
        Object.fromEntries(subjectsForGrade.map((s) => [s.id, "any" as PlacementPreference])),
    );
    setPlanCapacityError(null);
    setSubjectPlanOpen(true);
  };

  const saveSubjectPlanOnly = () => {
    if (!current) return;
    if (!staffBudget.ok) return;
    const capacity = validatePreferenceCapacity(
      staffSubjectPeriods,
      staffSubjectPreferences,
      currentSchedule,
    );
    if (!capacity.ok) {
      setPlanCapacityError(capacity.message ?? "Preference capacity exceeded.");
      return;
    }
    const cappedPeriods = capSubjectPeriodsToOnePerDay(staffSubjectPeriods, currentSchedule);
    const slots = sanitizeSubjectSlotSelections(
      staffSubjectSlotSelections,
      currentSchedule,
      staffSubjectPreferences,
    );

    // Apply planned teachers onto any periods already placed for that subject.
    const nextGrid = current.grid.map((col) =>
      col.map((cell) => {
        if (!cell) return null;
        const teacherId = staffSubjectTeachers[cell.subjectId];
        if (!teacherId) return cell;
        const teacher = teacherById(teacherId) ?? teachers.find((t) => t.id === teacherId);
        if (!teacher) return cell;
        return {
          ...cell,
          teacherId: teacher.id,
          teacher: teacher.name,
        };
      }),
    );

    setTimetables((prev) => {
      const next = prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: nextGrid,
              subjectPeriodsPerWeek: { ...cappedPeriods },
              subjectSlotSelections: slots,
              subjectTeachers: { ...staffSubjectTeachers },
              subjectPlacementPreferences: { ...staffSubjectPreferences },
              status: "draft" as const,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : t,
      );
      replaceTimetableDirectory(next);
      return next;
    });
    setStaffSubjectPeriods(cappedPeriods);
    setStaffSubjectSlotSelections(slots);
    setSubjectPlanOpen(false);
  };

  const publishTimetable = () => {
    if (!current || !publishReport?.canPublish) return;
    const wasPublished = current.status === "published";
    updateCurrent({ status: "published" });
    const label = classKey(current.grade, current.section);
    if (wasPublished) {
      notifyTimetableChanged({
        timetableId: current.id,
        classLabel: label,
        changeSummary: "Timetable republished with updates",
        important: true,
      });
    } else {
      notifyTimetablePublished({
        timetableId: current.id,
        classLabel: label,
        termLabel: current.term,
      });
    }
    setReviewOpen(false);
  };

  const unpublishTimetable = () => {
    if (!current) return;
    updateCurrent({ status: "draft" });
  };

  const slotHasConflict = (day: number, period: number, slot: TimetableSlot) => {
    const dayLabel = recordDays[day] ?? "";
    const periodLabel = currentSchedule.periodRows[period]?.label ?? "";
    return classConflicts.some(
      (c) =>
        c.day === dayLabel &&
        (c.period.includes(periodLabel) || c.period === periodLabel) &&
        (c.resource === slot.teacher ||
          c.resource === slot.teacherId ||
          c.resource === slot.room),
    );
  };

  const openScheduleEditor = () => {
    if (!current) return;
    setScheduleEditInput(scheduleInputFromConfig(currentSchedule));
    setScheduleSaveAsInstitute(false);
    setScheduleEditOpen(true);
  };

  const saveScheduleEdit = () => {
    if (!current) return;
    const issues = validateBellItems(scheduleEditInput.bellItems ?? []);
    if (issues.some((i) => i.severity === "error")) return;
    const schedule = buildScheduleConfig(scheduleEditInput);
    if (scheduleSaveAsInstitute) {
      saveInstituteScheduleDefault(scheduleEditInput);
    }
    const preferences =
      current.subjectPlacementPreferences ??
      Object.fromEntries(subjectsForGrade.map((s) => [s.id, "any" as PlacementPreference]));
    const slots = sanitizeSubjectSlotSelections(
      current.subjectSlotSelections ?? {},
      schedule,
      preferences,
    );
    // Keep existing manual placements where the period still exists; clear inapplicable cells.
    const nextGrid = emptyGrid(schedule).map((col, dayIdx) =>
      col.map((_, periodIdx) => {
        if (!isSlotApplicable(schedule, dayIdx, periodIdx)) return null;
        const prev = current.grid[dayIdx]?.[periodIdx] ?? null;
        return prev;
      }),
    );
    // Trim rows/cols if schedule shrank: emptyGrid already sized; copy only overlapping cells above.
    updateCurrent({
      schedule,
      grid: nextGrid,
      subjectSlotSelections: slots,
      subjectPlacementPreferences: preferences,
      status: "draft",
    });
    setScheduleEditOpen(false);
  };

  const moveSlot = (from: TimetableCellRef, to: TimetableCellRef) => {
    if (!current) return;
    const source = current.grid[from.day]?.[from.period];
    if (!source) return;
    const gridWithoutFrom = current.grid.map((col, d) =>
      col.map((slot, p) => (d === from.day && p === from.period ? null : slot)),
    );
    const target = gridWithoutFrom[to.day]?.[to.period] ?? null;

    const validateMove = (slot: TimetableSlot, day: number, period: number, baseGrid: typeof grid) =>
      validateCellPlacement({
        grid: baseGrid,
        schedule: currentSchedule,
        day,
        period,
        subjectId: slot.subjectId,
        subjectCode: slot.subject,
        teacherId: slot.teacherId,
        room: slot.room,
        preference: current.subjectPlacementPreferences?.[slot.subjectId] ?? "any",
        existingTimetables: timetables,
        excludeTimetableId: current.id,
      });

    const sourceCheck = validateMove(source, to.day, to.period, gridWithoutFrom);
    if (!sourceCheck.ok) {
      setEditError(sourceCheck.reason ?? "Cannot move here.");
      return;
    }
    if (target) {
      const gridWithoutBoth = gridWithoutFrom.map((col, d) =>
        col.map((slot, p) => (d === to.day && p === to.period ? null : slot)),
      );
      const targetCheck = validateMove(target, from.day, from.period, gridWithoutBoth);
      if (!targetCheck.ok) {
        setEditError(targetCheck.reason ?? "Cannot swap with that period.");
        return;
      }
    }

    updateCurrentGrid((prev) => {
      const next = prev.map((col) => [...col]);
      const src = next[from.day]?.[from.period] ?? null;
      const tgt = next[to.day]?.[to.period] ?? null;
      next[from.day]![from.period] = tgt;
      next[to.day]![to.period] = src;
      return next;
    });
  };

  const assignSubjectToCell = (
    subjectId: string,
    to: TimetableCellRef,
    meta: { code: string; name: string },
  ) => {
    if (!current) return;
    const teacherId = current.subjectTeachers?.[subjectId];
    const teacher = teacherId ? teacherById(teacherId) : null;
    if (!teacher) {
      setEditCell(to);
      setEditSubject(meta.code);
      setEditTeacherId("");
      setEditError("Select a teacher for this subject (Subject plan or here).");
      setEditOpen(true);
      return;
    }
    const room = slotVenue(grade, section);
    const preference = current.subjectPlacementPreferences?.[subjectId] ?? "any";
    const validation = validateCellPlacement({
      grid: current.grid,
      schedule: currentSchedule,
      day: to.day,
      period: to.period,
      subjectId,
      subjectCode: meta.code,
      teacherId: teacher.id,
      room,
      preference,
      existingTimetables: timetables,
      excludeTimetableId: current.id,
    });
    if (!validation.ok) {
      setEditError(validation.reason ?? "Cannot assign subject here.");
      return;
    }
    const slot: TimetableSlot = {
      subjectId,
      subject: meta.code,
      teacherId: teacher.id,
      teacher: teacher.name,
      room,
    };
    setTimetables((prev) => {
      const focus = prev.find((t) => t.id === current.id);
      if (!focus) return prev;
      const nextGrid = focus.grid.map((col) => [...col]);
      nextGrid[to.day]![to.period] = slot;
      const next = prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              grid: nextGrid,
              subjectTeachers: {
                ...(t.subjectTeachers ?? {}),
                [subjectId]: teacher.id,
              },
              status: "draft" as const,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : t,
      );
      replaceTimetableDirectory(next);
      return next;
    });
  };

  const publishAllReady = () => {
    setTimetables((prev) => {
      const next = prev.map((timetable) => {
        const report = evaluatePublishReadiness(timetable, prev);
        if (timetable.status === "published" || !report.canPublish) return timetable;
        notifyTimetablePublished({
          timetableId: timetable.id,
          classLabel: classKey(timetable.grade, timetable.section),
          termLabel: timetable.term,
        });
        return {
          ...timetable,
          status: "published" as const,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      });
      replaceTimetableDirectory(next);
      return next;
    });
  };

  const lockedCount = current?.lockedCells?.length ?? 0;
  const currentReadiness = current
    ? (readinessById[current.id] ?? getTimetableReadiness(current, timetables, classConflicts))
    : ("incomplete" as TimetableReadiness);

  /* ── List view ── */
  if (!selectedId || !current) {
    return (
      <AppShell
        title="Timetables"
        subtitle="Overview → create draft → assign manually → review → publish"
        actions={
          <Button
            variant="primary"
            data-admin-write
            disabled={!writesAllowed}
            title={!writesAllowed ? reason ?? undefined : undefined}
            onClick={() => guardWriteAction(openCreateModal)}
          >
            <Plus className="size-3.5" /> New draft
          </Button>
        }
      >
        <PageStack>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(readinessTotals) as TimetableReadiness[]).map((key) => (
              <Pill key={key} tone={readinessTone(key)}>
                {readinessLabel(key)} · {readinessTotals[key]}
              </Pill>
            ))}
          </div>

          <div className="lx-timetable-filter-row">
            <div className="lx-timetable-filter-field min-w-[160px]">
              <Field label="Grade">
                <Select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                  <option value="all">All grades</option>
                  {gradeSectionOptions.grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="lx-timetable-filter-field min-w-[160px]">
              <Field label="Status">
                <Select
                  value={filterReadiness}
                  onChange={(e) =>
                    setFilterReadiness(e.target.value as "all" | TimetableReadiness)
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="conflicts">Conflicts</option>
                  <option value="ready">Ready</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
            </div>
            <div className="lx-timetable-filter-field flex-1 min-w-[200px]">
              <Field label="Search class">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <TextInput
                    className="pl-8"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="e.g. Grade 10-A"
                  />
                </div>
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              data-admin-write
              onClick={() => guardWriteAction(publishAllReady)}
              disabled={readinessTotals.ready === 0}
            >
              <CheckCircle2 className="size-3.5" /> Publish all ready ({readinessTotals.ready})
            </Button>
          </div>

          {allConflicts.length > 0 && (
            <TimetableConflictBanner>
              <strong>
                {allConflicts.length} conflict{allConflicts.length !== 1 ? "s" : ""}
              </strong>
              {" across timetables — open a class and use Review & publish to fix."}
            </TimetableConflictBanner>
          )}

          {filteredTimetables.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6 text-primary" />}
              title={timetables.length === 0 ? "No timetables yet" : "No matches"}
              hint={
                timetables.length === 0
                  ? "Create a draft, assign subjects and teachers yourself, then publish."
                  : "Try another grade, status, or search."
              }
              action={
                timetables.length === 0 ? (
                  <Button
                    variant="primary"
                    data-admin-write
                    disabled={!writesAllowed}
                    title={!writesAllowed ? reason ?? undefined : undefined}
                    onClick={() => guardWriteAction(openCreateModal)}
                  >
                    <Plus className="size-3.5" /> Create draft
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TimetableCards
              timetables={filteredTimetables}
              conflictCounts={conflictCounts}
              readinessById={readinessById}
              onOpen={openDetail}
            />
          )}
        </PageStack>

        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create timetable draft"
          subtitle="Pick class, term, and bell schedule — assign periods manually on the detail page"
          size="md"
          footer={
            <>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                data-admin-write
                onClick={() => guardWriteAction(createTimetable)}
                disabled={
                  hasTimetable(createGrade, createSection, timetables) || createHasScheduleErrors
                }
              >
                <Plus className="size-3.5" /> Create empty draft
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={profile.academic.levelLabel} required>
                <Select value={createGrade} onChange={(e) => setCreateGrade(e.target.value)}>
                  {gradeSectionOptions.grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section" required>
                <Select value={createSection} onChange={(e) => setCreateSection(e.target.value)}>
                  {gradeSectionOptions.sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Term">
                <TextInput value={createTerm} onChange={(e) => setCreateTerm(e.target.value)} />
              </Field>
            </div>

            {hasTimetable(createGrade, createSection, timetables) && (
              <p className="text-[11px] text-warning">
                A timetable already exists for {classKey(createGrade, createSection)}.
              </p>
            )}

            <Field label="Bell schedule source">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <label
                  className={`lx-teacher-mode-card ${createUseInstituteSchedule ? "lx-teacher-mode-card--active" : ""}`}
                >
                  <input
                    type="radio"
                    checked={createUseInstituteSchedule}
                    onChange={() => {
                      setCreateUseInstituteSchedule(true);
                      setCreateScheduleInput(loadInstituteScheduleDefault());
                    }}
                  />
                  <div>
                    <div className="text-sm font-medium">Institute default</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {scheduleSummary(buildScheduleConfig(loadInstituteScheduleDefault()))}
                    </div>
                  </div>
                </label>
                <label
                  className={`lx-teacher-mode-card ${!createUseInstituteSchedule ? "lx-teacher-mode-card--active" : ""}`}
                >
                  <input
                    type="radio"
                    checked={!createUseInstituteSchedule}
                    onChange={() => setCreateUseInstituteSchedule(false)}
                  />
                  <div>
                    <div className="text-sm font-medium">Custom for this class</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Override days and period times
                    </div>
                  </div>
                </label>
              </div>
            </Field>

            {!createUseInstituteSchedule && (
              <ScheduleConfigForm
                value={createScheduleInput}
                onChange={setCreateScheduleInput}
                mode="class-override"
              />
            )}

            <p className="text-[11px] text-muted-foreground">
              Creates an empty grid. Assign subjects and teachers yourself on the next screen.
              Capacity: {countTeachingSlotsPerWeek(createSchedulePreview)} teaching slots / week
            </p>
          </div>
        </Modal>
      </AppShell>
    );
  }

  /* ── Detail view ── */
  return (
    <AppShell
      title={currentClassKey}
      subtitle={`${current.term} · ${scheduleSummary(currentSchedule)}`}
      actions={
        <>
          {current.status === "published" ? (
            <Button variant="outline" data-admin-write onClick={() => guardWriteAction(unpublishTimetable)}>
              <Undo2 className="size-3.5" /> Unpublish
            </Button>
          ) : (
            <Button
              variant="primary"
              data-admin-write
              onClick={() => guardWriteAction(() => setReviewOpen(true))}
              disabled={!publishReport?.canPublish}
            >
              <CheckCircle2 className="size-3.5" />
              Publish
            </Button>
          )}
        </>
      }
    >
      <PageStack>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="size-3.5" /> All timetables
          </Button>
          <Pill tone={readinessTone(currentReadiness)}>{readinessLabel(currentReadiness)}</Pill>
          <Pill tone="neutral">
            Slots {filledCount}/{teachingSlotsPerWeek}
          </Pill>
          {lockedCount > 0 && (
            <Pill tone="info">
              <Lock className="size-3" /> {lockedCount} locked
            </Pill>
          )}
          {classConflicts.length > 0 && (
            <Pill tone="danger">
              <AlertTriangle className="size-3" />
              {classConflicts.length} conflict{classConflicts.length !== 1 ? "s" : ""}
            </Pill>
          )}
        </div>

        {sameGradePeers.length > 1 && (
          <div className="lx-timetable-class-jump">
            <span className="lx-timetable-class-jump__label">{current.grade} sections</span>
            <div className="lx-timetable-class-jump__chips">
              {sameGradePeers.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className={`lx-timetable-filter-current ${peer.id === current.id ? "ring-1 ring-primary" : ""}`}
                  onClick={() => openDetail(peer.id)}
                >
                  Sec {peer.section}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="lx-period-summary">
          <div className="lx-period-summary__totals">
            <div>
              <span className="lx-period-summary__label">Teaching slots</span>
              <strong>{teachingSlotsPerWeek}</strong>
            </div>
            <div>
              <span className="lx-period-summary__label">Filled</span>
              <strong>{filledCount}</strong>
            </div>
            <div>
              <span className="lx-period-summary__label">Remaining empty</span>
              <strong className={emptyCount > 0 ? "text-warning" : ""}>{emptyCount}</strong>
            </div>
            <div>
              <span className="lx-period-summary__label">Subject plan</span>
              <strong>
                {plannedFilledTotal}/{plannedPeriodTotal}
                {plannedRemainingTotal > 0 ? ` · ${plannedRemainingTotal} left` : ""}
              </strong>
            </div>
          </div>
          <div className="lx-period-summary__subjects">
            {subjectPeriodStats.map((row) => (
              <div
                key={row.id}
                className={`lx-period-summary__chip ${row.remaining > 0 ? "lx-period-summary__chip--open" : "lx-period-summary__chip--done"}`}
                title={`${row.name}: ${row.filled} filled, ${row.remaining} remaining of ${row.target}/wk`}
              >
                <span className="font-medium truncate">{row.name}</span>
                <span className="font-mono">
                  {row.filled}/{row.target}
                  {row.remaining > 0 ? ` · ${row.remaining} left` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {editError && (
          <TimetableConflictBanner role="alert">
            <strong>Edit blocked</strong>
            {" — "}
            {editError}
            <button
              type="button"
              className="ml-2 text-primary underline text-[11px]"
              onClick={() => setEditError(null)}
            >
              Dismiss
            </button>
          </TimetableConflictBanner>
        )}

        {classConflicts.length > 0 && (
          <TimetableConflictBanner>
            <strong>Conflicts detected</strong>
            {" — "}
            {classConflicts.slice(0, 2).map((c, i) => (
              <span key={i}>
                {i > 0 && "; "}
                {c.kind} · {c.resource} on {c.day} · {c.period} ({c.classes.join(" vs ")})
              </span>
            ))}
            {classConflicts.length > 2 && ` +${classConflicts.length - 2} more`}
          </TimetableConflictBanner>
        )}

        <div className="lx-timetable-actions">
          <Button variant="outline" data-admin-write onClick={() => guardWriteAction(openSubjectPlan)}>
            <Wand2 className="size-3.5" /> Subject plan
          </Button>
          <Button variant="outline" data-admin-write onClick={() => guardWriteAction(openScheduleEditor)}>
            <Clock className="size-3.5" /> Bell & days
          </Button>
          <Button variant="outline" data-admin-write onClick={() => guardWriteAction(() => setReviewOpen(true))}>
            <CheckCircle2 className="size-3.5" /> Review & publish
          </Button>
        </div>

        <Card>
          <CardHeader
            title="Weekly schedule"
            hint="Click a cell to assign subject and teacher, or drag to move. Nothing is auto-filled."
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
              lockedCells={current.lockedCells}
              onToggleLock={handleToggleLock}
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
              <Button variant="danger" data-admin-write onClick={() => guardWriteAction(clearSlot)} className="mr-auto">
                Clear
              </Button>
            )}
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" data-admin-write onClick={() => guardWriteAction(saveSlot)}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editError && <p className="text-[11px] text-destructive">{editError}</p>}
          <Field label="Subject">
            <Select
              value={editSubject}
              onChange={(e) => onEditSubjectChange(e.target.value)}
            >
              <option value="">Select subject…</option>
              {subjectsForGrade.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Teacher"
            hint={
              editSubject
                ? "Planned / recommended teachers first — every staff member is listed"
                : "Pick a subject first, then choose a teacher"
            }
          >
            <Select
              value={editTeacherId}
              onChange={(e) => {
                setEditTeacherId(e.target.value);
                setEditError(null);
              }}
              disabled={!editSubject}
              className="h-10"
            >
              <option value="">Select teacher…</option>
              {editTeacherOptions.planned.length > 0 && (
                <optgroup label="From subject plan">
                  {editTeacherOptions.planned.map((t) => (
                    <option key={`planned-${t.id}`} value={t.id}>
                      {t.name} · {t.department}
                    </option>
                  ))}
                </optgroup>
              )}
              {editTeacherOptions.qualified.length > 0 && (
                <optgroup label="Recommended for subject">
                  {editTeacherOptions.qualified.map((t) => (
                    <option key={`qual-${t.id}`} value={t.id}>
                      {t.name} · {t.experienceYears}y · {t.department}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All teachers">
                {editTeacherOptions.rest.map((t) => (
                  <option key={`all-${t.id}`} value={t.id}>
                    {t.name} · {t.department}
                  </option>
                ))}
                {editTeacherOptions.rest.length === 0 &&
                  editTeacherOptions.planned.length === 0 &&
                  editTeacherOptions.qualified.length === 0 &&
                  teachers.map((t) => (
                    <option key={`fallback-${t.id}`} value={t.id}>
                      {t.name} · {t.department}
                    </option>
                  ))}
              </optgroup>
            </Select>
          </Field>
          <Field label="Class">
            <TextInput value={classLocationLabel(grade, section)} readOnly disabled className="opacity-80" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={subjectPlanOpen}
        onClose={() => setSubjectPlanOpen(false)}
        title="Subject plan"
        subtitle="Set periods, teachers, and timing — place periods on the grid yourself"
        size="xl"
        footer={
          <>
            <Button onClick={() => setSubjectPlanOpen(false)} className="mr-auto">
              Cancel
            </Button>
            <Button variant="primary" data-admin-write onClick={() => guardWriteAction(saveSubjectPlanOnly)} disabled={!staffBudget.ok}>
              Save subject plan
            </Button>
          </>
        }
      >
        {planCapacityError && (
          <p className="text-[11px] text-destructive mb-3">{planCapacityError}</p>
        )}
        <TeacherAssignPanel
          subjects={subjectsForGrade}
          subjectTeachers={staffSubjectTeachers}
          subjectPeriods={staffSubjectPeriods}
          subjectSlotSelections={staffSubjectSlotSelections}
          subjectPlacementPreferences={staffSubjectPreferences}
          schedule={currentSchedule}
          maxPeriodsPerWeek={teachingSlotsPerWeek}
          onSubjectTeacherChange={(subjectId, teacherId) =>
            setStaffSubjectTeachers((prev) => ({ ...prev, [subjectId]: teacherId }))
          }
          onSubjectPeriodChange={(subjectId, periods) =>
            setStaffSubjectPeriods((prev) => ({ ...prev, [subjectId]: periods }))
          }
          onSlotSelectionsChange={(next) => {
            setStaffSubjectSlotSelections(
              sanitizeSubjectSlotSelections(next, currentSchedule, staffSubjectPreferences),
            );
          }}
          onPlacementPreferenceChange={(subjectId, preference) => {
            setStaffSubjectPreferences((prev) => {
              const nextPrefs = { ...prev, [subjectId]: preference };
              setStaffSubjectSlotSelections((slots) =>
                sanitizeSubjectSlotSelections(slots, currentSchedule, nextPrefs),
              );
              return nextPrefs;
            });
          }}
        />
      </Modal>

      <Modal
        open={scheduleEditOpen}
        onClose={() => setScheduleEditOpen(false)}
        title="Bell & days"
        subtitle="Edit this class schedule — does not auto-fill the grid"
        size="lg"
        footer={
          <>
            <Button onClick={() => setScheduleEditOpen(false)} className="mr-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              data-admin-write
              onClick={() => guardWriteAction(saveScheduleEdit)}
              disabled={validateBellItems(scheduleEditInput.bellItems ?? []).some(
                (i) => i.severity === "error",
              )}
            >
              Save schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={scheduleSaveAsInstitute}
              onChange={(e) => setScheduleSaveAsInstitute(e.target.checked)}
            />
            <span>
              Also save as institute default for new drafts
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Existing class timetables keep their own schedules unless you edit them.
              </span>
            </span>
          </label>
          <ScheduleConfigForm
            value={scheduleEditInput}
            onChange={setScheduleEditInput}
            mode={scheduleSaveAsInstitute ? "institute-default" : "class-override"}
          />
        </div>
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review & publish"
        subtitle="Publish only when the readiness checklist passes"
        footer={
          <>
            <Button onClick={() => setReviewOpen(false)} className="mr-auto">
              Close
            </Button>
            {current.status === "published" ? (
              <Button variant="outline" data-admin-write onClick={() => guardWriteAction(unpublishTimetable)}>
                Unpublish
              </Button>
            ) : (
              <Button
                variant="primary"
                data-admin-write
                onClick={() => guardWriteAction(publishTimetable)}
                disabled={!publishReport?.canPublish}
              >
                <CheckCircle2 className="size-3.5" /> Publish timetable
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          {(publishReport?.checklist ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                {item.detail && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.detail}</div>
                )}
              </div>
              <Pill tone={item.ok ? "success" : "danger"}>{item.ok ? "OK" : "Fix"}</Pill>
            </div>
          ))}
          {!publishReport?.canPublish && (
            <p className="text-[11px] text-warning">
              Resolve checklist items before publishing. Use Subject plan and assign periods on the
              grid yourself.
            </p>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
