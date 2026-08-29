import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
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
  ToolbarMeta,
  DataTable,
  EmptyState,
  Th,
} from "@lumenx/ui-admin";
import { BookOpen, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  gradesDisplayLabel,
  loadSubjectsList,
  resolveSubjectsListView,
  shouldCommitSubjectsLoad,
  createSubject as createSubjectApi,
  updateSubject as updateSubjectApi,
  deleteSubject as deleteSubjectApi,
  type SubjectListItem,
  type SubjectsListStatus,
} from "@/lib/subjects";
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
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const teacherAssignEnabled = !apiMode;
  const { profileId, profile } = useDemoProfile();
  const { guardWriteAction, writesAllowed, reason } = useAdminWriteAccess();
  const college = isCollegeMode();
  const grades = useMemo(() => [...adminDataFacade.subjects.listGradeLabels()], [profileId]);
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
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveSubjectsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: SubjectRow[] = apiMode ? listView.items : catalog;
  const teachers = useMemo(
    () => (apiMode ? [] : adminDataFacade.subjects.listTeachers()),
    [apiMode, catalog],
  );

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
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadSubjectsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitSubjectsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
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
  };

  const saveForm = () => {
    if (!name.trim() || !code.trim() || selectedGrades.length === 0) return;

    const payload = {
      name: name.trim(),
      code: code.trim(),
      category,
      periodsPerWeek: Number(periods) || 5,
      grades: selectedGrades,
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
              category: payload.category,
              periodsPerWeek: payload.periodsPerWeek,
              applicableClassCodes: payload.grades,
              status: payload.status,
            });
      void request
        .then(() => {
          setFormOpen(false);
          resetForm();
          setReloadKey((k) => k + 1);
          notify(formMode === "edit" ? "Subject updated" : "Subject created");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save subject");
        });
      return;
    }

    if (formMode === "edit" && editingId) {
      updateSubject(editingId, payload);
    } else {
      addSubject(payload);
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
          setReloadKey((k) => k + 1);
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

  const saveAssignments = () => {
    if (!teacherAssignEnabled) {
      notify("Teacher assignment is not available via API yet");
      return;
    }
    if (!activeSubject) return;
    assignTeachersToSubject(activeSubject.id, assignIds);
    refresh();
    setAssignOpen(false);
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
          <ToolbarMeta>{list.length} results</ToolbarMeta>
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
                const assigned = teacherAssignEnabled
                  ? teachers.filter((t) => s.assignedTeacherIds.includes(t.id))
                  : [];
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
                        {assigned.length === 0 ? (
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
              disabled={!name.trim() || !code.trim() || selectedGrades.length === 0}
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
            <Field label="Institute subject" required hint="Choose from approved subjects">
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
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {SUBJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Periods per week">
            <TextInput
              type="number"
              min={1}
              max={12}
              value={periods}
              onChange={(e) => setPeriods(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubjectCatalogItem["status"])}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Offered in grades" required>
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
                    {g}
                  </label>
                ))}
              </div>
            </Field>
          </div>
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
            ? `${activeSubject.code} · select all qualified teachers for this subject`
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
            <Button variant="primary" data-admin-write onClick={() => guardWriteAction(saveAssignments)}>
              Save assignments
            </Button>
          </>
        }
      >
        {activeSubject && (
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
        )}
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
