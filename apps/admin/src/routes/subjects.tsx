import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Pill,
  Modal,
  Field,
  TextInput,
  Select,
  SearchInput,
  PageToolbar,
  DataTable,
  EmptyState,
  Th,
} from "@lumenx/ui-admin";
import { BookOpen, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  gradesDisplayLabel,
  resolveSubjectsListView,
  createSubject as createSubjectApi,
  updateSubject as updateSubjectApi,
  deleteSubject as deleteSubjectApi,
  type SubjectListItem,
  type SubjectsListStatus,
} from "@/lib/subjects";
import { useSubjectsListQuery, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import {
  assignTeacherSubjectSection,
  loadAssignPickers,
  loadSubjectTeacherAssignments,
} from "@/lib/timetable";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import { listClasses } from "@/lib/classes/api";
import type { AcademicYearDto } from "@/lib/academic-years/types";
import type { TeacherAssignmentListItem } from "@/lib/timetable/types";
import { useAuth } from "@/auth/AuthContext";
import { useAdminToast } from "@/components/AdminActionToast";
import { softDeleteToRecycleBin } from "@lumenx/utils";
import {
  SUBJECT_CATEGORIES,
  addSubject,
  assignTeachersToSubject,
  deleteSubject,
  updateSubject,
  type SubjectCatalogItem,
} from "@/lib/subjects-data";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import { loadClassDirectory, saveClassDirectory } from "@/lib/class-directory-store";
import { useAnchoredRowMenu } from "@/hooks/useAnchoredRowMenu";
import { adminDataFacade } from "@/lib/admin-data-facade";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";

export const Route = createFileRoute("/subjects")({
  head: () => ({ meta: [{ title: "Subjects — LumenX Admin" }] }),
  component: SubjectsPage,
});

type FormMode = "create" | "edit";

type SubjectRow = SubjectCatalogItem | SubjectListItem;

const emptyForm = (defaultGrade: string) => ({
  name: "",
  code: "",
  category: SUBJECT_CATEGORIES[0]!,
  periods: "5",
  status: "active" as SubjectCatalogItem["status"],
  selectedGrades: [defaultGrade] as string[],
});

function SubjectsPage() {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const teacherAssignEnabled = true;
  const { profileId, profile } = useDemoProfile();
  const { guardWriteAction, writesAllowed, reason } = useAdminWriteAccess();
  const college = isCollegeMode();
  const [apiClassOptions, setApiClassOptions] = useState<
    Array<{ code: string; label: string }>
  >([]);
  const grades = useMemo(() => {
    if (apiMode && apiClassOptions.length > 0) {
      return apiClassOptions.map((c) => c.code);
    }
    return [...adminDataFacade.subjects.listGradeLabels()];
  }, [apiMode, apiClassOptions, profileId]);
  const gradeLabels = useMemo(() => {
    if (apiMode && apiClassOptions.length > 0) {
      return Object.fromEntries(apiClassOptions.map((c) => [c.code, c.label]));
    }
    return {} as Record<string, string>;
  }, [apiMode, apiClassOptions]);
  const subjectOptions = useMemo(() => adminDataFacade.subjects.listSubjectOptions(), [profileId]);
  const defaultGrade = grades[0] ?? "Grade 10";

  const [catalog, setCatalog] = useState(() =>
    apiMode ? [] : adminDataFacade.subjects.listCatalog(),
  );
  const [apiItems, setApiItems] = useState<SubjectListItem[]>([]);
  const [listStatus, setListStatus] = useState<SubjectsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [auxReload, setAuxReload] = useState(0);
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const subjectsQuery = useSubjectsListQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );
  const bumpSubjectsReload = () => {
    invalidateAdminCache("admin:subjects");
    setAuxReload((k) => k + 1);
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: [adminQueryRoots.subjects, instituteCtx.activeInstituteId],
      });
    }
  };

  const listView = resolveSubjectsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus:
      subjectsQuery.isLoading && !subjectsQuery.data ? "loading" : listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: SubjectRow[] = apiMode ? listView.items : catalog;
  const teachers = useMemo(
    () => (apiMode ? [] : adminDataFacade.subjects.listTeachers()),
    [apiMode, catalog],
  );
  const [createTeacherOptions, setCreateTeacherOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const createTeacherChoices = apiMode ? createTeacherOptions : teachers.map((t) => ({
    id: t.id,
    label: t.name,
  }));

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<SubjectCatalogItem | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<string>(SUBJECT_CATEGORIES[0]!);
  const [periods, setPeriods] = useState("5");
  const [status, setStatus] = useState<SubjectCatalogItem["status"]>("active");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([defaultGrade]);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [apiAssignYearId, setApiAssignYearId] = useState("");
  const [apiAssignClassId, setApiAssignClassId] = useState("");
  const [apiAssignSectionId, setApiAssignSectionId] = useState("");
  const [apiAssignTeacherId, setApiAssignTeacherId] = useState("");
  const [apiAssignYears, setApiAssignYears] = useState<AcademicYearDto[]>([]);
  const [apiAssignClasses, setApiAssignClasses] = useState<ClassDto[]>([]);
  const [apiAssignSections, setApiAssignSections] = useState<SectionDto[]>([]);
  const [apiAssignTeachers, setApiAssignTeachers] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [apiSubjectAssignments, setApiSubjectAssignments] = useState<
    Record<string, TeacherAssignmentListItem[]>
  >({});
  const [apiAssignExisting, setApiAssignExisting] = useState<TeacherAssignmentListItem[]>([]);
  const [apiAssignBusy, setApiAssignBusy] = useState(false);

  const refresh = () => setCatalog(adminDataFacade.subjects.listCatalog());
  const availableSubjectOptions = useMemo(
    () =>
      subjectOptions.filter(
        (option) =>
          (formMode === "edit" &&
            option.code.toLowerCase() === code.trim().toLowerCase()) ||
          !catalog.some(
            (subject) => subject.code.toLowerCase() === option.code.toLowerCase(),
          ),
      ),
    [subjectOptions, catalog, formMode, code],
  );

  useEffect(() => {
    if (apiMode) return;
    refresh();
    setSelectedGrades([grades[0] ?? "Grade 10"]);
  }, [apiMode, profileId]);

  useEffect(() => {
    if (!apiMode || !instituteCtx.activeInstituteId) {
      setApiClassOptions([]);
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void listClasses({ instituteId })
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((c) => c.status === "active");
        const options = active
          .map((c) => ({
            code: c.code.trim(),
            label: c.name.trim() || c.code.trim(),
          }))
          .filter((c) => c.code);
        // Dedupe by code
        const seen = new Set<string>();
        const unique = options.filter((c) => {
          const key = c.code.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setApiClassOptions(unique);
        setSelectedGrades((prev) => {
          const valid = prev.filter((g) =>
            unique.some((u) => u.code.toLowerCase() === g.toLowerCase()),
          );
          if (valid.length > 0) return valid;
          return unique[0] ? [unique[0].code] : [];
        });
      })
      .catch(() => {
        if (!cancelled) {
          setApiClassOptions([]);
          notify("Could not load class options for subjects");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteCtx.activeInstituteId, auxReload, notify]);

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

    if (subjectsQuery.isLoading && !subjectsQuery.data) {
      setListStatus("loading");
      setListError(null);
      return;
    }
    if (!subjectsQuery.data) return;

    const next = subjectsQuery.data;
    setApiItems(next.items);
    setListStatus(next.status);
    setListError(next.errorMessage);
    setResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    subjectsQuery.data,
    subjectsQuery.isLoading,
  ]);

  useEffect(() => {
    setQ("");
    setCategoryFilter("all");
    setFormOpen(false);
    setAssignOpen(false);
    setDeleteOpen(false);
    setActiveSubject(null);
  }, [instituteCtx.activeInstituteId]);

  const list = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (apiMode) {
      return displayItems.filter((s) => {
        if (categoryFilter !== "all" && s.category !== categoryFilter) {
          return false;
        }
        if (!search) return true;
        const hay = `${s.name} ${s.code} ${s.category}`.toLowerCase();
        return hay.includes(search);
      });
    }

    return catalog.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (!search) return true;
      const hay = `${s.name} ${s.code} ${s.category}`.toLowerCase();
      return hay.includes(search);
    });
  }, [apiMode, displayItems, catalog, q, categoryFilter]);

  const resetForm = () => {
    const e = emptyForm(defaultGrade);
    setName(e.name);
    setCode(e.code);
    setCategory(e.category);
    setPeriods(e.periods);
    setStatus(e.status);
    setSelectedGrades(e.selectedGrades);
    setAssignIds([]);
    setEditingId(null);
  };

  const openCreate = () => {
    const firstAvailable = subjectOptions.find(
      (option) =>
        !catalog.some(
          (subject) => subject.code.toLowerCase() === option.code.toLowerCase(),
        ),
    );
    resetForm();
    if (firstAvailable) {
      setName(firstAvailable.name);
      setCode(firstAvailable.code);
      setCategory(firstAvailable.category);
    }
    setFormMode("create");
    setFormOpen(true);
    if (apiMode && instituteCtx.activeInstituteId) {
      void loadAssignPickers(instituteCtx.activeInstituteId)
        .then((pickers) => {
          setCreateTeacherOptions(pickers.teachers);
        })
        .catch(() => {
          setCreateTeacherOptions([]);
          notify("Could not load teacher options");
        });
    }
  };

  const selectInstituteSubject = (subjectCode: string) => {
    const option = subjectOptions.find((item) => item.code === subjectCode);
    if (!option) return;
    setName(option.name);
    setCode(option.code);
    setCategory(option.category);
  };

  const openEdit = (subject: SubjectCatalogItem) => {
    setFormMode("edit");
    setEditingId(subject.id);
    setName(subject.name);
    setCode(subject.code);
    setCategory(subject.category);
    setPeriods(String(subject.periodsPerWeek));
    setStatus(subject.status);
    setSelectedGrades([...subject.grades]);
    setFormOpen(true);
  };

  const openDelete = (subject: SubjectCatalogItem) => {
    setActiveSubject(subject);
    setDeleteOpen(true);
  };

  const toggleGrade = (g: string) => {
    setSelectedGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const openAssign = (subject: SubjectCatalogItem) => {
    setActiveSubject(subject);
    setAssignIds([...subject.assignedTeacherIds]);
    setAssignOpen(true);
    if (apiMode && instituteCtx.activeInstituteId) {
      void loadAssignPickers(instituteCtx.activeInstituteId).then((pickers) => {
        setApiAssignYears(pickers.years);
        setApiAssignYearId(pickers.academicYearId);
        setApiAssignClasses(pickers.classes);
        setApiAssignSections(pickers.sections);
        setApiAssignTeachers(pickers.teachers);
        const firstClass = pickers.classes[0];
        const firstSection = pickers.sections.find((s) => s.classId === firstClass?.id);
        setApiAssignClassId(firstClass?.id ?? "");
        setApiAssignSectionId(firstSection?.id ?? "");
        setApiAssignTeacherId(pickers.teachers[0]?.id ?? "");
      });
      void loadSubjectTeacherAssignments({
        instituteId: instituteCtx.activeInstituteId,
        subjectId: subject.id,
      }).then(setApiAssignExisting);
    }
  };

  // Load assignment chips for API subject list
  useEffect(() => {
    if (!apiMode || !instituteCtx.activeInstituteId || !listView.rowsValid) return;
    let cancelled = false;
    void Promise.all(
      displayItems.map(async (subject) => {
        const rows = await loadSubjectTeacherAssignments({
          instituteId: instituteCtx.activeInstituteId!,
          subjectId: subject.id,
        });
        return [subject.id, rows] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, TeacherAssignmentListItem[]> = {};
      for (const [id, rows] of pairs) next[id] = rows;
      setApiSubjectAssignments(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteCtx.activeInstituteId, listView.rowsValid, displayItems, auxReload]);

  const saveAssignments = () => {
    if (!activeSubject) return;
    if (apiMode) {
      if (!instituteCtx.activeInstituteId) {
        notify("Select an institute first");
        return;
      }
      if (
        !apiAssignYearId ||
        !apiAssignClassId ||
        !apiAssignSectionId ||
        !apiAssignTeacherId
      ) {
        notify("Choose year, class, section, and teacher");
        return;
      }
      setApiAssignBusy(true);
      void assignTeacherSubjectSection({
        instituteId: instituteCtx.activeInstituteId,
        academicYearId: apiAssignYearId,
        classId: apiAssignClassId,
        sectionId: apiAssignSectionId,
        teacherId: apiAssignTeacherId,
        subjectId: activeSubject.id,
      })
        .then(() => {
          notify("Teacher assigned to subject section");
          setAssignOpen(false);
          setActiveSubject(null);
          bumpSubjectsReload();
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to assign teacher");
        })
        .finally(() => setApiAssignBusy(false));
      return;
    }
    assignTeachersToSubject(activeSubject.id, assignIds);
    refresh();
    setAssignOpen(false);
    setActiveSubject(null);
  };

  const saveForm = () => {
    if (!name.trim() || !code.trim()) return;
    if (!apiMode && selectedGrades.length === 0) return;

    const payload = {
      name: name.trim(),
      code: code.trim(),
      category: category || "Core",
      periodsPerWeek: Number(periods) || 5,
      grades: apiMode
        ? selectedGrades.length > 0
          ? selectedGrades
          : grades.slice(0, 1)
        : selectedGrades,
      status,
    };

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute first");
        return;
      }
      const request =
        formMode === "edit" && editingId
          ? updateSubjectApi(editingId, {
              name: payload.name,
              code: payload.code,
              category: payload.category,
              periodsPerWeek: payload.periodsPerWeek,
              applicableClassCodes: payload.grades,
              status: payload.status,
            })
          : createSubjectApi({
              instituteId,
              name: payload.name,
              code: payload.code,
              category: "Core",
              periodsPerWeek: payload.periodsPerWeek,
              applicableClassCodes: payload.grades.length > 0 ? payload.grades : [],
              status: payload.status,
            });
      void request
        .then(() => {
          setFormOpen(false);
          resetForm();
          bumpSubjectsReload();
          notify(formMode === "edit" ? "Subject updated" : "Subject created");
        })
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : "Failed to save subject";
          notify(
            /already exists/i.test(message) ? "subject is already exists" : message,
          );
        });
      return;
    }

    if (formMode === "edit" && editingId) {
      updateSubject(editingId, payload);
    } else {
      const nameKey = payload.name.toLowerCase();
      const codeKey = payload.code.toLowerCase();
      const duplicate = catalog.some(
        (s) =>
          s.name.toLowerCase() === nameKey || s.code.toLowerCase() === codeKey,
      );
      if (duplicate) {
        notify("subject is already exists");
        return;
      }
      const created = addSubject(payload);
      if (assignIds.length > 0) {
        assignTeachersToSubject(created.id, assignIds);
      }
    }

    refresh();
    setFormOpen(false);
    resetForm();
  };

  const confirmDelete = () => {
    if (!activeSubject) return;

    if (apiMode) {
      void deleteSubjectApi(activeSubject.id)
        .then(() => {
          setDeleteOpen(false);
          setActiveSubject(null);
          bumpSubjectsReload();
          notify("Subject deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete subject");
        });
      return;
    }

    softDeleteToRecycleBin({
      module: "Subjects",
      title: activeSubject.name,
      subtitle: activeSubject.code,
      deletedBy: user?.name ?? "Admin",
      snapshot: { ...activeSubject } as unknown as Record<string, unknown>,
    });
    deleteSubject(activeSubject.id);
    saveClassDirectory(
      loadClassDirectory().map((record) => {
        const assignments = { ...(record.subjectTeacherAssignments ?? {}) };
        delete assignments[activeSubject.id];
        return { ...record, subjectTeacherAssignments: assignments };
      }),
    );
    refresh();
    setDeleteOpen(false);
    setActiveSubject(null);
  };

  const toggleTeacher = (id: string) => {
    setAssignIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading subjects…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load subjects"
        : listView.status === "forbidden"
          ? "You do not have access to subjects for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load subjects"
            : listView.status === "empty"
              ? "No subjects yet"
              : null;

  const openSubjectDetail = (id: string) => {
    void navigate({ to: "/subjects/$id", params: { id } });
  };

  if (pathname.startsWith("/subjects/")) return <Outlet />;

  return (
    <AppShell
      title={profile.academic.subjectsPageTitle}
      subtitle={
        apiMode
          ? `${countLabel(displayItems.length)} subjects · institute catalog`
          : `${catalog.length} subjects · create, edit, and assign teachers`
      }
      actions={
        writesEnabled ? (
          <Button
            variant="primary"
            data-admin-write
            disabled={!writesAllowed}
            title={!writesAllowed ? reason ?? undefined : undefined}
            onClick={() => guardWriteAction(openCreate)}
          >
            <Plus className="size-3.5" /> New subject
          </Button>
        ) : null
      }
    >
      <Card>
        <PageToolbar className="!flex-row flex-nowrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subject name or code…"
              className="min-w-0 flex-1"
            />
            <Select
              fieldSize="compact"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40 shrink-0 sm:w-44"
            >
              <option value="all">All categories</option>
              {SUBJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </PageToolbar>

        {list.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title={listHint ?? "No subjects found"}
            hint={
              listHint
                ? undefined
                : "Try another search term or category filter."
            }
            action={
              writesEnabled ? (
                <Button
                  variant="primary"
                  data-admin-write
                  disabled={!writesAllowed}
                  title={!writesAllowed ? reason ?? undefined : undefined}
                  onClick={() => guardWriteAction(openCreate)}
                >
                  <Plus className="size-3.5" /> New subject
                </Button>
              ) : null
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Subject</Th>
                <Th>Category</Th>
                <Th>{college ? "Years" : "Grades"}</Th>
                <Th>Periods/wk</Th>
                {teacherAssignEnabled ? <Th>Teachers</Th> : null}
                <Th>Status</Th>
                {writesEnabled ? (
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => {
                const assigned = apiMode
                  ? []
                  : teachers.filter((t) => s.assignedTeacherIds.includes(t.id));
                const apiAssigned = apiMode ? apiSubjectAssignments[s.id] ?? [] : [];
                return (
                  <tr
                    key={s.id}
                    role={writesEnabled ? "link" : undefined}
                    tabIndex={writesEnabled ? 0 : undefined}
                    className={
                      writesEnabled
                        ? "cursor-pointer hover:bg-surface-hover"
                        : "hover:bg-surface-hover"
                    }
                    onClick={
                      writesEnabled ? () => openSubjectDetail(s.id) : undefined
                    }
                    onKeyDown={
                      writesEnabled
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openSubjectDetail(s.id);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.code}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{s.category}</td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground max-w-[180px]">
                      {gradesDisplayLabel(s.grades, college)}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono">{s.periodsPerWeek}</td>
                    {teacherAssignEnabled ? (
                      <td className="px-5 py-3">
                        {apiMode ? (
                          apiAssigned.length === 0 ? (
                            <span className="text-[11px] text-warning">None assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {apiAssigned.slice(0, 3).map((row) => (
                                <Pill key={row.id} tone="neutral">
                                  {row.label}
                                </Pill>
                              ))}
                              {apiAssigned.length > 3 ? (
                                <Pill tone="neutral">+{apiAssigned.length - 3}</Pill>
                              ) : null}
                            </div>
                          )
                        ) : assigned.length === 0 ? (
                          <span className="text-[11px] text-warning">None assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assigned.slice(0, 3).map((t) => (
                              <Pill key={t.id} tone="neutral">
                                {t.name.split(" ")[0]}
                              </Pill>
                            ))}
                            {assigned.length > 3 && (
                              <Pill tone="neutral">+{assigned.length - 3}</Pill>
                            )}
                          </div>
                        )}
                      </td>
                    ) : null}
                    <td className="px-5 py-3">
                      <Pill tone={s.status === "active" ? "success" : "warning"}>{s.status}</Pill>
                    </td>
                    {writesEnabled ? (
                      <td
                        className="px-5 py-3"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <SubjectRowMenu
                          onView={() => openSubjectDetail(s.id)}
                          onEdit={() => openEdit(s as SubjectCatalogItem)}
                          onAssignTeachers={
                            teacherAssignEnabled
                              ? () => openAssign(s as SubjectCatalogItem)
                              : undefined
                          }
                          onDelete={() => openDelete(s as SubjectCatalogItem)}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      {writesEnabled ? (
      <>
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title={formMode === "edit" ? "Edit subject" : "New subject"}
        subtitle={
          formMode === "edit"
            ? "Update subject details — changes apply to timetable generation"
            : `Courses appear in timetable auto-generation for selected ${college ? "years" : "grades"}`
        }
        size="lg"
        footer={
          <>
            <Button
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="mr-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              data-admin-write
              onClick={() => guardWriteAction(saveForm)}
              disabled={
                !name.trim() ||
                !code.trim() ||
                (!apiMode && selectedGrades.length === 0)
              }
            >
              {formMode === "edit" ? "Save changes" : "Create subject"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {apiMode ? (
            <Field label="Subject name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mathematics"
              />
            </Field>
          ) : (
            <Field label="Subject name" required hint="Choose from approved subjects">
              <Select value={code} onChange={(e) => selectInstituteSubject(e.target.value)}>
                <option value="" disabled>
                  Select subject
                </option>
                {availableSubjectOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name} · {option.code}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Subject code" required>
            <TextInput
              value={code}
              readOnly={!apiMode}
              className={apiMode ? undefined : "bg-muted/30"}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          {apiMode && formMode === "create" ? (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Only name and code are required. Assign teachers from Teachers or Timetable later.
            </p>
          ) : (
            <>
          {formMode === "create" ? (
            <div className="sm:col-span-2">
              <Field label="Assign teachers">
                {createTeacherChoices.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    No teachers in demo directory.
                  </div>
                ) : (
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {createTeacherChoices.map((t) => {
                      const checked = assignIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                            checked ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTeacher(t.id)}
                          />
                          <span className="font-medium">{t.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            </div>
          ) : null}
          <Field label="Periods per week">
            <TextInput
              type="number"
              min={1}
              max={12}
              value={periods}
              onChange={(e) => setPeriods(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {SUBJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Select classes" required>
              <div className="flex flex-wrap gap-2 mt-1">
                {grades.map((g) => (
                  <label
                    key={g}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${selectedGrades.includes(g) ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(g)}
                      onChange={() => toggleGrade(g)}
                    />
                    {gradeLabels[g] && gradeLabels[g] !== g
                      ? `${gradeLabels[g]} · ${g}`
                      : g}
                  </label>
                ))}
                {grades.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {apiMode
                      ? "Create classes first, then select them here."
                      : "No grades configured."}
                  </span>
                ) : null}
              </div>
            </Field>
          </div>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubjectCatalogItem["status"])}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setActiveSubject(null);
        }}
        title="Delete subject"
        footer={
          <>
            <Button
              onClick={() => {
                setDeleteOpen(false);
                setActiveSubject(null);
              }}
              className="mr-auto"
            >
              Cancel
            </Button>
            <Button variant="danger" data-admin-write onClick={() => guardWriteAction(confirmDelete)}>
              <Trash2 className="size-3.5" /> Delete subject
            </Button>
          </>
        }
      >
        {activeSubject && (
          <div className="space-y-3">
            <p className="text-sm">
              Delete <span className="font-semibold">{activeSubject.name}</span>{" "}
              <span className="font-mono text-muted-foreground">({activeSubject.code})</span>?
            </p>
            <p className="text-[11px] text-muted-foreground">
              This removes the subject from the catalog and timetable auto-generation. Teacher
              assignments for this subject will be cleared. This cannot be undone.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setActiveSubject(null);
        }}
        title={activeSubject ? `Assign teachers · ${activeSubject.name}` : "Assign teachers"}
        subtitle={
          activeSubject
            ? apiMode
              ? `${activeSubject.code} · assign a teacher to a class section`
              : `${activeSubject.code} · select all qualified teachers for this subject`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button
              onClick={() => {
                setAssignOpen(false);
                setActiveSubject(null);
              }}
              className="mr-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              data-admin-write
              disabled={apiMode && apiAssignBusy}
              onClick={() => guardWriteAction(saveAssignments)}
            >
              {apiMode ? (apiAssignBusy ? "Saving…" : "Assign teacher") : "Save assignments"}
            </Button>
          </>
        }
      >
        {activeSubject && apiMode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assignments are stored as timetable teacher assignments (section-scoped).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Academic year">
                <Select
                  value={apiAssignYearId}
                  onChange={(e) => {
                    const yearId = e.target.value;
                    setApiAssignYearId(yearId);
                    if (instituteCtx.activeInstituteId) {
                      void loadAssignPickers(instituteCtx.activeInstituteId, yearId).then(
                        (pickers) => {
                          setApiAssignClasses(pickers.classes);
                          setApiAssignSections(pickers.sections);
                          const firstClass = pickers.classes[0];
                          const firstSection = pickers.sections.find(
                            (s) => s.classId === firstClass?.id,
                          );
                          setApiAssignClassId(firstClass?.id ?? "");
                          setApiAssignSectionId(firstSection?.id ?? "");
                        },
                      );
                    }
                  }}
                >
                  {apiAssignYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Teacher">
                <Select
                  value={apiAssignTeacherId}
                  onChange={(e) => setApiAssignTeacherId(e.target.value)}
                >
                  {apiAssignTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Class">
                <Select
                  value={apiAssignClassId}
                  onChange={(e) => {
                    setApiAssignClassId(e.target.value);
                    const first = apiAssignSections.find((s) => s.classId === e.target.value);
                    setApiAssignSectionId(first?.id ?? "");
                  }}
                >
                  {apiAssignClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select
                  value={apiAssignSectionId}
                  onChange={(e) => setApiAssignSectionId(e.target.value)}
                >
                  {apiAssignSections
                    .filter((s) => s.classId === apiAssignClassId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code || s.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            {apiAssignExisting.length > 0 ? (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-xs font-medium">Current assignments</div>
                <div className="flex flex-wrap gap-1">
                  {apiAssignExisting.map((row) => (
                    <Pill key={row.id} tone="neutral">
                      {row.label}
                    </Pill>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : activeSubject ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assigned teachers are used by the timetable module for auto-generation and conflict
              checks.
            </p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {teachers.map((t) => {
                const checked = assignIds.includes(t.id);
                const related =
                  t.department.toLowerCase().includes(activeSubject.name.toLowerCase()) ||
                  t.subjects.some(
                    (sub) => sub === activeSubject.code || sub === activeSubject.name,
                  );
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-hover ${checked ? "bg-primary/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeacher(t.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {t.name}
                        {related && <Pill tone="info">Related dept</Pill>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.department} · {t.qualification} · {t.experienceYears} years
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <BookOpen className="size-3.5" />
              {assignIds.length} teacher{assignIds.length !== 1 ? "s" : ""} selected for{" "}
              {activeSubject.code}
            </div>
          </div>
        ) : null}
      </Modal>
      </>
      ) : null}
    </AppShell>
  );
}

function SubjectRowMenu({
  onView,
  onEdit,
  onAssignTeachers,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onAssignTeachers?: () => void;
  onDelete: () => void;
}) {
  const { open, coords, buttonRef, menuRef, run, toggle } = useAnchoredRowMenu({
    menuWidth: 176,
    menuHeight: 180,
  });

  const itemClass =
    "block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground";

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[80] min-w-44 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-pop"
            style={{ top: coords.top, left: coords.left }}
          >
            <button type="button" className={itemClass} onClick={() => run(onView)}>
              View details
            </button>
            <button type="button" className={itemClass} onClick={() => run(onEdit)}>
              Edit
            </button>
            {onAssignTeachers ? (
              <button type="button" className={itemClass} onClick={() => run(onAssignTeachers)}>
                Assign teachers
              </button>
            ) : null}
            <div className="border-t border-border" />
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Subject actions"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {menu}
    </div>
  );
}
