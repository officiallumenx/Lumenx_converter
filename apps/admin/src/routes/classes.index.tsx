import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type {
  ClassImportRow,
  SectionImportRow,
} from "@/lib/academics/bulk-import-parse";
import { remainingFailedAfterOuterError } from "@/lib/academics/bulk-import-counts";
import { RouteChunkFallback } from "@/components/RouteChunkFallback";

const AcademicsBulkImportDialog = lazy(() =>
  import("@/components/academics/AcademicsBulkImportDialog").then((m) => ({
    default: m.AcademicsBulkImportDialog,
  })),
);

import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { useAdminToast } from "@/components/AdminActionToast";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  outcomeAfterSuccessfulCreate,
  shouldIgnoreDuplicateCreateClick,
  type CreateSubmitMode,
} from "@/lib/forms/create-and-add-another";
import {
  createClass,
  createSection,
  listClasses,
  listSections,
  invalidateClassesListCache,
  resolveClassesListView,
  sectionDtoToListItem,
  sortClassListItems,
  type ClassListItem,
  type ClassesListStatus,
} from "@/lib/classes";
import { useClassesListQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateSetupChecklistCache } from "@/lib/institute-setup-checklist";
import { listAcademicYears } from "@/lib/academic-years";
import {
  listTeachers,
  updateTeacher,
  type TeacherDto,
} from "@/lib/teachers";
import { formatApiClientError, isConflictError } from "@/lib/api/errors";
import { Button, Card, EmptyState, Field, Modal, Pill, Select, TextInput } from "@lumenx/ui-admin";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  collegeTimetableGrade,
  isCollegeMode,
} from "@/lib/academic-data";
import {
  loadClassDirectory,
  saveClassDirectory,
  type ClassSection,
} from "@/lib/class-directory-store";
import { loadTimetableDirectory } from "@/lib/timetable-directory-store";
import {
  capitalizeClassName,
  capitalizeSectionName,
  classCodeFromName,
  classIdentityKey,
  classSectionExists,
  classSortRank,
  classesReferToSame,
  normalizeSchoolClassName,
  sectionSortRank,
} from "@/lib/classes/name-format";

export const Route = createFileRoute("/classes/")({
  head: () => ({ meta: [{ title: "Classes — LumenX Admin" }] }),
  component: ClassesPage,
});

type ClassRow = ClassSection | ClassListItem;

function ClassesPage() {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const { profileId, profile } = useDemoProfile();
  const academic = profile.academic;
  const college = isCollegeMode();
  const [classes, setClasses] = useState<ClassSection[]>(() =>
    apiMode ? [] : loadClassDirectory(),
  );
  const [apiItems, setApiItems] = useState<ClassListItem[]>([]);
  const [listStatus, setListStatus] = useState<ClassesListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [teachersReload, setTeachersReload] = useState(0);
  const bumpClassesReload = () => {
    const instituteId = instituteCtx.activeInstituteId ?? undefined;
    invalidateClassesListCache(instituteId);
    invalidateSetupChecklistCache(instituteId);
    setTeachersReload((k) => k + 1);
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.classes),
      });
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.catalog),
      });
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.teachers),
      });
    }
  };
  const [creating, setCreating] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportEntity, setBulkImportEntity] = useState<"classes" | "sections">(
    "classes",
  );
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importClassCodes, setImportClassCodes] = useState<string[]>([]);
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const classesQuery = useClassesListQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );

  const listView = resolveClassesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus:
      classesQuery.isLoading && !classesQuery.data ? "loading" : listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: ClassRow[] = apiMode
    ? sortClassListItems(listView.items)
    : sortClassListItems(classes as ClassListItem[]);


  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(academic.levels[0]!.label);
  const [section, setSection] = useState(academic.sections[0] ?? "A");
  const [customClassName, setCustomClassName] = useState("");
  const [customSectionName, setCustomSectionName] = useState("");
  const [departmentId, setDepartmentId] = useState(academic.departments[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [students, setStudents] = useState("0");
  const [teacher, setTeacher] = useState(classes[0]?.teacher ?? "Prof. Meera Nair");
  const [teacherId, setTeacherId] = useState("");
  const [instituteTeachers, setInstituteTeachers] = useState<TeacherDto[]>([]);
  const timetables = useMemo(
    () => (apiMode ? [] : loadTimetableDirectory()),
    [apiMode, profileId],
  );

  useEffect(() => {
    if (apiMode) return;
    setClasses(loadClassDirectory());
    const { levels, sections, departments } = profile.academic;
    setLevel(levels[0]!.label);
    setSection(sections[0] ?? "A");
    setDepartmentId(departments[0]?.id ?? "");
  }, [apiMode, profileId, profile.academic]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    if (classesQuery.isLoading && !classesQuery.data) {
      setListStatus("loading");
      setListError(null);
      return;
    }
    if (classesQuery.isError && !classesQuery.data) {
      setApiItems([]);
      setListStatus("error");
      setListError(
        classesQuery.error instanceof Error
          ? classesQuery.error.message
          : "Failed to load classes",
      );
      setResolvedForInstituteId(requestInstituteId);
      return;
    }
    if (!classesQuery.data) return;

    const next = classesQuery.data;
    setApiItems((prev) => {
      const items = next.items.length > 0 ? next.items : prev;
      setListStatus(items.length > 0 ? "ready" : next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      return sortClassListItems(items);
    });
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    classesQuery.data,
    classesQuery.isLoading,
    classesQuery.isError,
    classesQuery.error,
    classesQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    setOpen(false);
    setRoom("");
    setStudents("0");
    setTeacherId("");
  }, [instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!apiMode || !instituteCtx.activeInstituteId) {
      setInstituteTeachers([]);
      return;
    }
    let cancelled = false;
    void listTeachers({ instituteId: instituteCtx.activeInstituteId })
      .then((items) => {
        if (cancelled) return;
        setInstituteTeachers(items);
        setTeacherId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : items[0]?.id ?? "",
        );
      })
      .catch(() => {
        if (!cancelled) setInstituteTeachers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteCtx.activeInstituteId, teachersReload, classesQuery.dataUpdatedAt]);

  const departmentsForLevel = useMemo(() => {
    const levelId = academic.levels.find((item) => item.label === level)?.id;
    if (!levelId) return academic.departments;
    return academic.departments.filter((department) => department.levelIds.includes(levelId));
  }, [academic, level]);

  const persist = (next: ClassSection[]) => {
    setClasses(next);
    saveClassDirectory(next);
  };

  const nameConflict = useMemo(() => {
    if (college) return false;
    const className = normalizeSchoolClassName(customClassName || level);
    const sectionName = capitalizeSectionName(customSectionName || section);
    return classSectionExists(displayItems, className, sectionName);
  }, [college, customClassName, customSectionName, level, section, displayItems]);

  const resetCreateFormFields = (opts?: { keepClassContext?: boolean }) => {
    // Create & Add Another: keep class/level parent so the next row is another section.
    if (!opts?.keepClassContext) {
      setCustomClassName("");
    }
    setCustomSectionName("");
    setRoom("");
    setStudents("0");
  };

  const importClasses = (importRows: ClassImportRow[]) => {
    if (!apiMode) {
      notify("Bulk import is available in API mode");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || !writesEnabled) {
      notify("Select an institute before importing classes");
      return;
    }
    setBulkImporting(true);
    void (async () => {
      let created = 0;
      let failed = 0;
      const failures: string[] = [];
      try {
        const years = await listAcademicYears({ instituteId });
        const year = years.find((item) => item.status === "active");
        if (!year) {
          notify(
            years.length === 0
              ? "Create an academic year before importing classes"
              : "Activate an academic year before importing classes",
          );
          setBulkImporting(false);
          return;
        }
        for (const row of importRows) {
          try {
            const sortOrder = row.sortOrder.trim()
              ? Number(row.sortOrder)
              : classSortRank(row.name);
            const cls = await createClass({
              instituteId,
              academicYearId: year.id,
              name: row.name.trim(),
              code: row.code.trim(),
              sortOrder,
            });
            const sectionName = row.sectionName.trim();
            if (sectionName) {
              const sectionCode = (row.sectionCode.trim() || sectionName).slice(0, 50);
              await createSection({
                instituteId,
                academicYearId: year.id,
                classId: cls.id,
                name: sectionName,
                code: sectionCode,
                sortOrder: sectionSortRank(sectionName),
              });
            }
            created += 1;
          } catch (err) {
            failed += 1;
            failures.push(
              `${row.code || row.name}: ${formatApiClientError(err, "create failed")}`,
            );
          }
        }
      } catch (err) {
        failed += remainingFailedAfterOuterError({
          totalRows: importRows.length,
          created,
          failed,
        });
        failures.push(formatApiClientError(err, "import failed"));
      }
      setBulkImporting(false);
      setBulkImportOpen(false);
      bumpClassesReload();
      const summary = `${created} classes created${failed ? ` · ${failed} failed` : ""}`;
      notify(
        failures.length > 0
          ? `${summary}. ${failures.slice(0, 3).join(" · ")}${failures.length > 3 ? "…" : ""}`
          : summary,
      );
    })();
  };

  const importSections = (importRows: SectionImportRow[]) => {
    if (!apiMode) {
      notify("Bulk import is available in API mode");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || !writesEnabled) {
      notify("Select an institute before importing sections");
      return;
    }
    setBulkImporting(true);
    void (async () => {
      let created = 0;
      let failed = 0;
      const failures: string[] = [];
      try {
        const years = await listAcademicYears({ instituteId });
        const year = years.find((item) => item.status === "active");
        if (!year) {
          notify(
            years.length === 0
              ? "Create an academic year before importing sections"
              : "Activate an academic year before importing sections",
          );
          setBulkImporting(false);
          return;
        }
        const classesList = await listClasses({
          instituteId,
          academicYearId: year.id,
        });
        const byCode = new Map(
          classesList.map((c) => [c.code.trim().toLowerCase(), c]),
        );
        for (const row of importRows) {
          try {
            const parent = byCode.get(row.classCode.trim().toLowerCase());
            if (!parent) {
              failed += 1;
              failures.push(`${row.code}: unknown class_code "${row.classCode}"`);
              continue;
            }
            await createSection({
              instituteId,
              academicYearId: year.id,
              classId: parent.id,
              name: row.name.trim(),
              code: row.code.trim().slice(0, 50),
              capacity: row.capacity.trim()
                ? Math.max(0, Math.floor(Number(row.capacity)))
                : null,
              room: row.room.trim() || null,
              sortOrder: sectionSortRank(row.name),
            });
            created += 1;
          } catch (err) {
            failed += 1;
            failures.push(
              `${row.code || row.name}: ${formatApiClientError(err, "create failed")}`,
            );
          }
        }
      } catch (err) {
        failed += remainingFailedAfterOuterError({
          totalRows: importRows.length,
          created,
          failed,
        });
        failures.push(formatApiClientError(err, "import failed"));
      }
      setBulkImporting(false);
      setBulkImportOpen(false);
      bumpClassesReload();
      const summary = `${created} sections created${failed ? ` · ${failed} failed` : ""}`;
      notify(
        failures.length > 0
          ? `${summary}. ${failures.slice(0, 3).join(" · ")}${failures.length > 3 ? "…" : ""}`
          : summary,
      );
    })();
  };

  const addClass = (mode: CreateSubmitMode = "create") => {
    if (!writesEnabled || shouldIgnoreDuplicateCreateClick(creating)) return;
    const cap = Number(capacity) || 50;
    const studentCount = Number(students) || 0;
    const typedClass = normalizeSchoolClassName(customClassName || level);
    const typedSection = capitalizeSectionName(customSectionName || section);
    const levelMeta =
      academic.levels.find((item) => item.label === level) ??
      academic.levels.find(
        (item) =>
          classIdentityKey(item.label) === classIdentityKey(typedClass) ||
          item.label.toLowerCase() === typedClass.toLowerCase(),
      ) ??
      academic.levels[0];
    const department = academic.departments.find((item) => item.id === departmentId);

    if (!college && (!typedClass || !typedSection)) {
      notify("Enter class name and section");
      return;
    }
    if (!college && nameConflict) {
      notify("This class and section already exists — change the name");
      return;
    }
    if (!levelMeta && college) return;

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute first");
        return;
      }
      const className =
        college && department ? `${department.code} · ${level}` : typedClass;
      const classCode =
        college && department
          ? `${department.code}-${levelMeta?.shortLabel ?? "Y"}`.slice(0, 50)
          : classCodeFromName(typedClass);
      const sectionLabel = college ? section : typedSection;
      setCreating(true);
      void (async () => {
        try {
          const years = await listAcademicYears({ instituteId });
          const year = years.find((item) => item.status === "active");
          if (!year) {
            notify(
              years.length === 0
                ? "Create an academic year before adding classes"
                : "Activate an academic year before adding classes",
            );
            return;
          }
          const existing = await listClasses({ instituteId });
          const existingClass = existing.find(
            (item) =>
              item.academicYearId === year.id &&
              classesReferToSame(item, className, classCode),
          );
          let cls = existingClass;
          if (!cls) {
            cls = await createClass({
              instituteId,
              academicYearId: year.id,
              name: className,
              code: classCode,
              sortOrder: classSortRank(className),
            });
          } else {
            const classId = cls!.id;
            const sectionsForClass = await listSections({
              instituteId,
              classId,
            });
            const sectionExists = sectionsForClass.some(
              (item) =>
                item.classId === classId &&
                (item.code.toLowerCase() ===
                  sectionLabel.slice(0, 50).toLowerCase() ||
                  item.name.toLowerCase() === sectionLabel.toLowerCase()),
            );
            if (sectionExists) {
              notify("This class and section already exists — change the name");
              return;
            }
          }
          if (!cls) return;
          const createdSection = await createSection({
            instituteId,
            academicYearId: year.id,
            classId: cls.id,
            name: sectionLabel,
            code: sectionLabel.slice(0, 50),
            capacity: cap,
            room: room.trim() || null,
            classTeacherId: teacherId || null,
            sortOrder: sectionSortRank(sectionLabel),
          });
          const selectedTeacher = instituteTeachers.find(
            (item) => item.id === teacherId,
          );
          if (selectedTeacher) {
            const assignmentLabel = `${cls.code}-${createdSection.code}`;
            await updateTeacher(selectedTeacher.id, {
              assignedSectionLabels: [
                ...new Set([
                  ...(selectedTeacher.assignedSectionLabels ?? []),
                  assignmentLabel,
                ]),
              ],
            });
          }
          // Paint immediately so a stale empty cache cannot hide the new row.
          const createdRow = sectionDtoToListItem(
            createdSection,
            new Map([[cls.id, cls]]),
          );
          if (selectedTeacher?.displayName) {
            createdRow.teacher = selectedTeacher.displayName;
          }
          setApiItems((prev) => {
            if (prev.some((item) => item.id === createdRow.id)) {
              return sortClassListItems(prev);
            }
            return sortClassListItems([...prev, createdRow]);
          });
          setListStatus("ready");
          setListError(null);
          setResolvedForInstituteId(instituteId);
          bumpClassesReload();
          notify("Class section created");
          const outcome = outcomeAfterSuccessfulCreate(mode);
          resetCreateFormFields({ keepClassContext: outcome.stayOpen });
          if (!outcome.stayOpen) {
            setOpen(false);
            setTeacherId("");
          }
        } catch (err) {
          // Failure: leave entered fields intact for correction / retry.
          notify(
            isConflictError(err) || /already exists/i.test(err instanceof Error ? err.message : "")
              ? "This class and section already exists — change the name"
              : formatApiClientError(err, "Failed to create class section"),
          );
        } finally {
          setCreating(false);
        }
      })();
      return;
    }

    if (!levelMeta) return;
    const created: ClassSection =
      college && department
        ? {
            id: `${department.id}-${levelMeta.id}-${section.toLowerCase()}`,
            name: `${department.code} · ${level} · Sec ${section}`,
            levelId: levelMeta.id,
            timetableGrade: collegeTimetableGrade(department.id, levelMeta.id),
            section,
            departmentId: department.id,
            departmentCode: department.code,
            departmentName: department.name,
            teacher,
            students: studentCount,
            capacity: cap,
            room: room || "TBD",
            hasTimetable: false,
            subjectTeacherAssignments: {},
          }
        : {
            id: `${typedClass.replace(/\s+/g, "-")}-${typedSection}`,
            name: `${typedClass}-${typedSection}`,
            levelId: levelMeta.id,
            timetableGrade: typedClass,
            section: typedSection,
            teacher,
            students: studentCount,
            capacity: cap,
            room: room || "TBD",
            hasTimetable: false,
            subjectTeacherAssignments: {},
          };

    if (classes.some((item) => item.id === created.id)) {
      notify("This class and section already exists — change the name");
      return;
    }

    persist([...classes, created]);
    notify("Class section created");
    const outcome = outcomeAfterSuccessfulCreate(mode);
    resetCreateFormFields({ keepClassContext: outcome.stayOpen });
    if (!outcome.stayOpen) setOpen(false);
  };

  const openClassDetail = (id: string) => {
    void navigate({ to: "/classes/$id", params: { id } });
  };

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading classes…"
      : listView.status === "needs_institute"
        ? "Select an institute to load classes."
        : listView.status === "forbidden"
          ? listView.errorMessage ?? "You do not have access to classes for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load classes."
            : listView.status === "empty"
              ? "No class sections found for this institute."
              : null;

  return (
    <AppShell
      title={academic.classPageTitle}
      subtitle={
        apiMode
          ? `${countLabel(displayItems.length)} sections`
          : academic.classPageSubtitle
      }
      actions={
        writesEnabled ? (
          <div className="flex flex-wrap gap-2">
            {apiMode ? (
              <>
                <Button
                  onClick={() => {
                    setBulkImportEntity("classes");
                    setBulkImportOpen(true);
                  }}
                  disabled={bulkImporting}
                >
                  <Upload className="size-3.5" /> Import Classes
                </Button>
                <Button
                  onClick={() => {
                    void (async () => {
                      const instituteId = instituteCtx.activeInstituteId;
                      if (!instituteId) {
                        notify("Select an institute first");
                        return;
                      }
                      try {
                        // Match commit path: only active-year class codes are valid parents.
                        const years = await listAcademicYears({ instituteId });
                        const year = years.find((item) => item.status === "active");
                        if (!year) {
                          setImportClassCodes([]);
                          notify(
                            years.length === 0
                              ? "Create an academic year before importing sections"
                              : "Activate an academic year before importing sections",
                          );
                          return;
                        }
                        const classesList = await listClasses({
                          instituteId,
                          academicYearId: year.id,
                        });
                        setImportClassCodes(
                          [...new Set(classesList.map((c) => c.code).filter(Boolean))],
                        );
                      } catch {
                        setImportClassCodes([]);
                        notify("Could not load class catalog for the active year");
                      }
                      setBulkImportEntity("sections");
                      setBulkImportOpen(true);
                    })();
                  }}
                  disabled={bulkImporting}
                >
                  <Upload className="size-3.5" /> Import Sections
                </Button>
              </>
            ) : null}
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> {college ? "New Batch" : "New Class"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <ModuleHero
        eyebrow="Academics"
        title={M.classes}
        subtitle={
          apiMode
            ? `${countLabel(displayItems.length)} sections`
            : academic.classPageSubtitle
        }
       helpKey="classes" />
      {college && writesEnabled && (
        <div className="mb-4 flex flex-wrap gap-2">
          {academic.departments.map((department) => (
            <Pill key={department.id} tone="neutral">
              <span className="font-semibold">{department.code}</span>
              <span className="ml-1.5 text-muted-foreground">{department.name}</span>
            </Pill>
          ))}
        </div>
      )}

      {!listView.rowsValid ? (
        <Card>
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading classes…"}
          </div>
        </Card>
      ) : displayItems.length === 0 ? (
        <Card>
          <EmptyState
            title="No classes found"
            hint={listHint ?? "Create a class section to get started."}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((classSection) => {
            const fill =
              classSection.capacity > 0
                ? (classSection.students / classSection.capacity) * 100
                : 0;
            const timetable = timetables.find(
              (record) =>
                record.grade === classSection.timetableGrade &&
                record.section === classSection.section,
            );
            return (
              <Card
                key={classSection.id}
                role={writesEnabled ? "link" : undefined}
                tabIndex={writesEnabled ? 0 : undefined}
                className={
                  writesEnabled
                    ? "cursor-pointer p-5 transition-colors hover:bg-surface-hover"
                    : "p-5"
                }
                onClick={
                  writesEnabled
                    ? () => openClassDetail(classSection.id)
                    : undefined
                }
                onKeyDown={
                  writesEnabled
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openClassDetail(classSection.id);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{classSection.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Room {classSection.room}
                      {classSection.departmentName ? ` · ${classSection.departmentName}` : ""}
                    </div>
                  </div>
                  {classSection.capacity > 0 && fill >= 100 ? (
                    <Pill tone="warning">Full</Pill>
                  ) : classSection.capacity > 0 ? (
                    <Pill tone="success">Open</Pill>
                  ) : null}
                </div>
                <div className="mt-4 text-[11px] text-muted-foreground">
                  {college ? "Faculty advisor" : "Class teacher"}
                </div>
                <div className="mt-0.5 text-sm font-medium">{classSection.teacher}</div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-mono">
                      {classSection.students} / {classSection.capacity}
                    </span>
                  </div>
                  {classSection.capacity > 0 ? (
                    <div className="h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className={`h-full ${fill >= 100 ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${Math.min(fill, 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                {writesEnabled ? (
                  <div
                    className="mt-5 flex gap-2"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Link
                      to="/classes/$id"
                      params={{ id: classSection.id }}
                      className="flex-1"
                    >
                      <Button className="w-full justify-center">View class</Button>
                    </Link>
                    <Link
                      to="/timetable"
                      search={
                        apiMode
                          ? {
                              id: classSection.id,
                              createGrade: undefined,
                              createSection: undefined,
                              openCreate: undefined,
                            }
                          : timetable
                            ? {
                                id: timetable.id,
                                createGrade: undefined,
                                createSection: undefined,
                                openCreate: undefined,
                              }
                            : {
                                id: undefined,
                                openCreate: true,
                                createGrade: classSection.timetableGrade,
                                createSection: classSection.section,
                              }
                      }
                      className="flex-1"
                    >
                      <Button className="w-full justify-center">Timetable</Button>
                    </Link>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {apiMode && writesEnabled && bulkImportOpen ? (
        <Suspense fallback={<RouteChunkFallback label="Loading importer…" />}>
          <AcademicsBulkImportDialog
            open={bulkImportOpen}
            onClose={() => {
              if (!bulkImporting) setBulkImportOpen(false);
            }}
            entity={bulkImportEntity}
            title={
              bulkImportEntity === "classes"
                ? "Import classes"
                : "Import sections"
            }
            importing={bulkImporting}
            classCodes={importClassCodes}
            onImportClasses={importClasses}
            onImportSections={importSections}
          />
        </Suspense>
      ) : null}

      {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={college ? "New department · year · section" : "New class section"}
          size="lg"
          footer={
            <>
              <Button onClick={() => setOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button
                onClick={() => addClass("create_and_add_another")}
                disabled={creating || (!college && nameConflict)}
              >
                Create &amp; Add Another
              </Button>
              <Button
                variant="primary"
                onClick={() => addClass("create")}
                disabled={creating || (!college && nameConflict)}
              >
                {creating ? "Creating…" : "Create"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {college && (
              <Field label={academic.departmentLabel} required className="sm:col-span-2">
                <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                  {departmentsForLevel.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code} — {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Class name" required>
              {college ? (
                <Select value={level} onChange={(event) => setLevel(event.target.value)}>
                  {academic.levels.map((item) => (
                    <option key={item.id} value={item.label}>{item.label}</option>
                  ))}
                </Select>
              ) : (
                <TextInput
                  value={customClassName}
                  onChange={(event) => setCustomClassName(event.target.value)}
                  onBlur={() =>
                    setCustomClassName((v) =>
                      v.trim() ? normalizeSchoolClassName(v) : v,
                    )
                  }
                  placeholder="e.g. Class 8"
                  list="lx-class-name-suggestions"
                />
              )}
              {!college ? (
                <datalist id="lx-class-name-suggestions">
                  {academic.levels.map((item) => (
                    <option key={item.id} value={item.label} />
                  ))}
                </datalist>
              ) : null}
            </Field>
            <Field label="Section name" required>
              {college ? (
                <Select value={section} onChange={(event) => setSection(event.target.value)}>
                  {academic.sections.map((item) => <option key={item}>{item}</option>)}
                </Select>
              ) : (
                <TextInput
                  value={customSectionName}
                  onChange={(event) => setCustomSectionName(event.target.value)}
                  onBlur={() =>
                    setCustomSectionName((v) => (v.trim() ? capitalizeSectionName(v) : v))
                  }
                  placeholder="e.g. A"
                  list="lx-section-name-suggestions"
                />
              )}
              {!college ? (
                <datalist id="lx-section-name-suggestions">
                  {academic.sections.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              ) : null}
            </Field>
            {!college && nameConflict ? (
              <p className="sm:col-span-2 text-xs text-destructive" role="alert">
                This class and section already exists — change the name to continue.
              </p>
            ) : null}
            <Field label="Room no">
              <TextInput
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="Block A-101"
              />
            </Field>
            <Field
              label="Class teacher"
              hint={
                apiMode && instituteTeachers.length === 0
                  ? "Optional — onboard teachers later, or leave blank"
                  : undefined
              }
            >
              <Select
                value={apiMode ? teacherId : teacher}
                onChange={(event) =>
                  apiMode
                    ? setTeacherId(event.target.value)
                    : setTeacher(event.target.value)
                }
              >
                {apiMode ? (
                  <>
                    <option value="">No class teacher yet</option>
                    {instituteTeachers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName}
                        {item.employeeId ? ` · ${item.employeeId}` : ""}
                      </option>
                    ))}
                  </>
                ) : (
                  [...new Set(classes.map((item) => item.teacher))].map((item) => (
                    <option key={item}>{item}</option>
                  ))
                )}
              </Select>
            </Field>
            <Field label="Class capacity" required>
              <TextInput
                type="number"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </Field>
            <Field label="Current students">
              <TextInput
                type="number"
                value={students}
                onChange={(event) => setStudents(event.target.value)}
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
