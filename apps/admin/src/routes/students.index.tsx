import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  Field,
  TextInput,
  SearchInput,
  PageToolbar,
  ToolbarGroup,
  DataTable,
  EmptyState,
  Th as TableTh,
  Modal,
  CascadingFiltersMenu,
  type CascadingFilterGroup,
} from "@lumenx/ui-admin";
import {
  filterAdminStudents,
  sortAdminStudents,
  type AdminStudentSortKey,
  type StudentStatus,
} from "@lumenx/module-students";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { formatIdCardIssueDate, publishStudentIdCardSync } from "@/lib/student-id-card-sync";
import {
  Filter,
  Plus,
  MoreHorizontal,
  Download,
  ArrowUpDown,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  resolveStudentsListView,
  createStudent as createStudentApi,
  deleteStudent as deleteStudentApi,
  invalidateStudentsListCache,
  type StudentListItem,
} from "@/lib/students";
import {
  useStudentsListQuery,
  useCatalogClassesQuery,
  useCatalogYearsQuery,
  adminQueryRoots,
} from "@/lib/admin-queries";
import { useAdminToast } from "@/components/AdminActionToast";
import { syncSubscriptionHeadcountAfterStudentChange } from "@/lib/subscription-headcount";
import { useAuth } from "@/auth/AuthContext";
import { softDeleteToRecycleBin } from "@lumenx/utils";
import { useAnchoredRowMenu } from "@/hooks/useAnchoredRowMenu";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import {
  getClassFilterOptions,
  getDepartmentFilterOptions,
  getSectionFilterOptions,
  matchesClassSection,
  classSectionLabel,
  formatCollegeBatch,
  formatStudentGradeDisplay,
  type ClassFilter,
  type DepartmentFilter,
  type SectionFilter,
} from "@/lib/class-section-filter";
import {
  StudentCreateDialog,
  type StudentClassOption,
} from "@/components/students/StudentCreateDialog";
import { StudentBulkImportDialog } from "@/components/students/StudentBulkImportDialog";
import { listClassesCatalog } from "@/lib/classes";
import { createEnrollment } from "@/lib/enrollments";
import {
  mapImportGender,
  resolveStudentImportPlacement,
} from "@/lib/students/bulk-import";
import {
  buildStudentClassOptions,
  buildStudentSectionOptions,
  resolveStudentCreatePlacement,
} from "@/lib/students/class-options";
import type { StudentSectionOption } from "@/components/students/StudentCreateDialog";
import { PeopleDirectoryCard } from "@/components/people/PeopleDirectoryCard";
import {
  downloadStudentDirectoryCsv,
  loadStudentDirectory,
  nextStudentId,
  normalizePhone,
  provisionStudentConnectAccount,
  saveStudentDirectory,
  splitImportRowsByDuplicate,
  studentFromDraft,
  STUDENTS_CHANGED_EVENT,
  type StudentAccessStatus,
  type StudentDirectoryRecord,
  type StudentDraft,
  type StudentGender,
  type StudentImportRow,
} from "@/lib/student-directory-store";
import {
  ADMIN_TENANT_CHANGED_EVENT,
  subscribeAdminTenant,
} from "@/lib/admin-tenant";

export const Route = createFileRoute("/students/")({
  head: () => ({ meta: [{ title: "Students — LumenX Admin" }] }),
  component: StudentsPage,
});

type StudentRow = StudentDirectoryRecord | StudentListItem;

function StudentsPage() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const { profileId, profile } = useDemoProfile();
  const college = isCollegeMode();
  const classOptions = getClassFilterOptions();
  const sectionOptions = getSectionFilterOptions();
  const departmentOptions = getDepartmentFilterOptions();
  const defaultDept = profile.academic.departments[0]?.code ?? "MPC";

  const [rows, setRows] = useState<StudentDirectoryRecord[]>(() =>
    apiMode ? [] : loadStudentDirectory(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StudentStatus>("all");
  const [sort, setSort] = useState<{ key: AdminStudentSortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [minAttendancePct, setMinAttendancePct] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<StudentRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const listFilters = {
    q: searchQuery.trim() || undefined,
    status: filter !== "all" ? (filter as StudentStatus) : undefined,
    classLabel: classFilter !== "all" ? classFilter : undefined,
    sectionLabel: sectionFilter !== "all" ? sectionFilter : undefined,
  };
  const studentsQuery = useStudentsListQuery(
    instituteCtx.activeInstituteId,
    listFilters,
    listEnabled,
  );
  const catalogEnabled = listEnabled;
  const classesCatalogQuery = useCatalogClassesQuery(
    instituteCtx.activeInstituteId,
    catalogEnabled,
  );
  const yearsCatalogQuery = useCatalogYearsQuery(
    instituteCtx.activeInstituteId,
    catalogEnabled,
  );

  const apiItems = studentsQuery.data?.items ?? [];
  const listStatus = studentsQuery.data?.status ?? (listEnabled ? "loading" : "needs_institute");
  const listError = studentsQuery.data?.errorMessage ?? null;
  const resolvedForInstituteId =
    studentsQuery.data && instituteCtx.activeInstituteId
      ? instituteCtx.activeInstituteId
      : null;

  const bumpStudentsReload = () => {
    invalidateStudentsListCache(instituteCtx.activeInstituteId ?? undefined);
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: [adminQueryRoots.students, instituteCtx.activeInstituteId],
      });
    }
  };

  const apiStudentClassOptions = useMemo((): StudentClassOption[] => {
    const classes = classesCatalogQuery.data?.classes;
    const sections = classesCatalogQuery.data?.sections;
    const years = yearsCatalogQuery.data;
    if (!classes || !sections || !years) return [];
    const activeYearId =
      years.find((item) => item.status === "active")?.id ?? null;
    return buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: activeYearId,
    });
  }, [classesCatalogQuery.data, yearsCatalogQuery.data]);

  const apiStudentSectionOptions = useMemo((): StudentSectionOption[] => {
    const classes = classesCatalogQuery.data?.classes;
    const sections = classesCatalogQuery.data?.sections;
    const years = yearsCatalogQuery.data;
    if (!classes || !sections || !years) return [];
    const activeYearId =
      years.find((item) => item.status === "active")?.id ?? null;
    return buildStudentSectionOptions({
      classes,
      sections,
      activeAcademicYearId: activeYearId,
    });
  }, [classesCatalogQuery.data, yearsCatalogQuery.data]);

  const listView = resolveStudentsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus:
      studentsQuery.isLoading && !studentsQuery.data ? "loading" : listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: StudentRow[] = apiMode ? listView.items : rows;

  const persist = (next: StudentDirectoryRecord[]) => {
    setRows(next);
    saveStudentDirectory(next);
  };

  const setAccessStatus = (id: string, accessStatus: StudentAccessStatus) => {
    if (apiMode) {
      if (!writesEnabled) {
        notify("Select an institute before updating students");
        return;
      }
      void import("@/lib/students").then(({ updateStudent }) =>
        updateStudent(id, { accessStatus })
          .then(() => {
            bumpStudentsReload();
            const label =
              accessStatus === "hold"
                ? "held"
                : accessStatus === "suspended"
                  ? "suspended"
                  : "reactivated";
            notify(`Student ${label}`);
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to update student");
          }),
      );
      return;
    }
    const next = rows.map((row) => (row.id === id ? { ...row, accessStatus } : row));
    persist(next);
    const label =
      accessStatus === "hold" ? "held" : accessStatus === "suspended" ? "suspended" : "reactivated";
    notify(`Student ${label}`);
  };

  useEffect(() => {
    if (apiMode) return;
    const reload = () => {
      const next = loadStudentDirectory();
      setRows(next);
      publishStudentIdCardSync(next);
      // Keep Nexus operator headcount in sync with this institute's roster.
      try {
        syncSubscriptionHeadcountAfterStudentChange();
      } catch {
        // Headcount mirror must not block the directory UI.
      }
    };
    reload();
    setClassFilter("all");
    setSectionFilter("all");
    setDepartmentFilter("all");
    const onStudents = () => reload();
    window.addEventListener(STUDENTS_CHANGED_EVENT, onStudents);
    window.addEventListener(ADMIN_TENANT_CHANGED_EVENT, onStudents);
    window.addEventListener("lumenx-demo-profile-change", onStudents);
    const unsubTenant = subscribeAdminTenant(onStudents);
    return () => {
      window.removeEventListener(STUDENTS_CHANGED_EVENT, onStudents);
      window.removeEventListener(ADMIN_TENANT_CHANGED_EVENT, onStudents);
      window.removeEventListener("lumenx-demo-profile-change", onStudents);
      unsubTenant();
    };
  }, [apiMode, profileId, profile.academic]);

  useEffect(() => {
    if (
      (createOpen || bulkImportOpen) &&
      (classesCatalogQuery.isError || yearsCatalogQuery.isError)
    ) {
      notify("Could not load class and section options");
    }
  }, [
    createOpen,
    bulkImportOpen,
    classesCatalogQuery.isError,
    yearsCatalogQuery.isError,
    notify,
  ]);

  useEffect(() => {
    setSearchQuery("");
    setFilter("all");
    setSort({ key: "name", dir: "asc" });
    setClassFilter("all");
    setSectionFilter("all");
    setDepartmentFilter("all");
    setMinAttendancePct(0);
    setPendingDelete(null);
    setPage(0);
    setFiltersOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const list = useMemo(() => {
    let filtered: StudentRow[];
    if (apiMode) {
      filtered = displayItems as StudentRow[];
    } else {
      filtered = filterAdminStudents(
        displayItems as StudentDirectoryRecord[],
        searchQuery,
        filter,
      ) as StudentRow[];
      filtered = filtered.filter((s) =>
        matchesClassSection(s.grade, classFilter, sectionFilter, departmentFilter),
      );
      if (minAttendancePct > 0) {
        filtered = filtered.filter((s) => s.attendance >= minAttendancePct);
      }
    }
    return sortAdminStudents(
      filtered as StudentDirectoryRecord[],
      sort.key,
      sort.dir,
    ) as StudentRow[];
  }, [
    apiMode,
    searchQuery,
    filter,
    sort,
    classFilter,
    sectionFilter,
    departmentFilter,
    minAttendancePct,
    displayItems,
  ]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filter, sort, classFilter, sectionFilter, departmentFilter, minAttendancePct]);

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const pageIndex = Math.min(page, pageCount - 1);
  const paged = list.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  const scopeLabel = classSectionLabel(classFilter, sectionFilter, departmentFilter);

  const gradeKeyFor = (className: string, section: string) => {
    const levelMeta = profile.academic.levels.find((level) => level.label === className);
    return college
      ? formatCollegeBatch(defaultDept, levelMeta?.shortLabel ?? "FY", section || "NA")
      : `${className.replace("Grade ", "")}${section ? `-${section}` : ""}`;
  };

  const mapDraftGender = (
    gender: StudentDraft["gender"],
  ): "female" | "male" | "other" | "prefer_not_to_say" => {
    const g = gender.trim().toLowerCase();
    if (g === "female") return "female";
    if (g === "male") return "male";
    if (g === "other") return "other";
    return "prefer_not_to_say";
  };

  const removeStudent = (id: string) => {
    if (apiMode) {
      if (!writesEnabled) {
        notify("Select an institute before deleting students");
        return;
      }
      void deleteStudentApi(id)
        .then(() => {
          setPendingDelete(null);
          bumpStudentsReload();
          notify("Student deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete student");
        });
      return;
    }
    const target = rows.find((row) => row.id === id);
    if (target) {
      softDeleteToRecycleBin({
        module: "Students",
        title: target.name,
        subtitle: target.id,
        deletedBy: user?.name ?? "Admin",
        snapshot: { ...target } as unknown as Record<string, unknown>,
      });
    }
    persist(rows.filter((row) => row.id !== id));
    setPendingDelete(null);
    notify(target ? `${target.name} moved to Recycle Bin` : "Student moved to Recycle Bin");
  };

  const createStudent = (draft: StudentDraft, addSibling: boolean) => {
    if (apiMode) {
      if (!writesEnabled) {
        notify("Select an institute before creating a student");
        return;
      }
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before creating a student");
        return;
      }
      const placement = resolveStudentCreatePlacement({
        classOptions: apiStudentClassOptions,
        sectionOptions: apiStudentSectionOptions,
        classValue: draft.className,
        sectionValue: draft.section,
      });
      if (!placement) {
        notify(
          "Create an active academic year, then a class with a section, before adding students",
        );
        return;
      }
      const {
        classId,
        sectionId,
        academicYearId,
        classLabel,
        sectionLabel,
      } = placement;
      const rollNo = draft.rollNo.trim();

      void createStudentApi({
        instituteId,
        firstName: draft.firstName.trim(),
        surname: draft.surname.trim(),
        gender: mapDraftGender(draft.gender),
        address: draft.address.trim() || "—",
        dateOfBirth: draft.dateOfBirth.trim() || null,
        classLabel: classLabel || null,
        sectionLabel: sectionLabel || null,
        rollNo: rollNo || null,
        admissionNumber: draft.admissionNumber.trim() || null,
        status: "active",
        accessStatus: "active",
        parentName: draft.parentName.trim(),
        parentPhone: draft.parentPhone,
        parentRelationship: "guardian",
      })
        .then(async (created) => {
          try {
            await createEnrollment({
              instituteId,
              academicYearId,
              studentId: created.id,
              classId,
              sectionId,
              rollNo: rollNo || created.rollNo?.trim() || "1",
              enrolledOn: new Date().toISOString().slice(0, 10),
              status: "active",
            });
            bumpStudentsReload();
            notify(
              created.parentId
                ? `${created.displayName || created.firstName} created · assigned to ${classLabel} ${sectionLabel} · parent linked`
                : `${created.displayName || created.firstName} created · assigned to ${classLabel} ${sectionLabel}`,
            );
          } catch (enrollErr) {
            try {
              await deleteStudentApi(created.id);
            } catch (rollbackErr) {
              bumpStudentsReload();
              notify(
                enrollErr instanceof Error
                  ? `Class assignment failed and cleanup failed: ${enrollErr.message}. Remove the student manually if needed.`
                  : "Class assignment failed and cleanup failed. Remove the student manually if needed.",
              );
              if (!addSibling) setCreateOpen(false);
              return;
            }
            notify(
              enrollErr instanceof Error
                ? `Could not assign class/section: ${enrollErr.message}. Student was not saved.`
                : "Could not assign class/section. Student was not saved.",
            );
          }
          if (!addSibling) setCreateOpen(false);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to create student");
        });
      return;
    }
    const id = nextStudentId(rows);
    const record = studentFromDraft(draft, id, gradeKeyFor(draft.className, draft.section));
    const next = [...rows, record];
    setRows(next);
    saveStudentDirectory(next);
    provisionStudentConnectAccount(record);
    syncSubscriptionHeadcountAfterStudentChange();
    notify(
      `${record.name} created${record.connectAccount ? " · Connect account ready" : ""}`,
    );
    if (!addSibling) setCreateOpen(false);
  };

  const importStudents = (importRows: StudentImportRow[]) => {
    if (apiMode) {
      if (!writesEnabled || !instituteCtx.activeInstituteId) {
        notify("Select an institute before importing students");
        return;
      }
      const instituteId = instituteCtx.activeInstituteId;
      setBulkImporting(true);
      void (async () => {
        let created = 0;
        let enrolled = 0;
        let failed = 0;
        const failures: string[] = [];
        try {
          const { classes, sections } = await listClassesCatalog({ instituteId });
          const existingKeys = new Set(
            (apiItems as StudentListItem[]).flatMap((item) => {
              const keys: string[] = [];
              if (item.admissionNumber?.trim()) {
                keys.push(`admission:${item.admissionNumber.trim().toLowerCase()}`);
              }
              keys.push(
                `identity:${item.name.trim().toLowerCase().replace(/\s+/g, " ")}`,
              );
              return keys;
            }),
          );

          for (const imported of importRows) {
            const admission = imported.admissionNumber?.trim().toLowerCase();
            const identityKey = [
              "identity",
              imported.firstName.trim().toLowerCase(),
              imported.surname.trim().toLowerCase(),
              normalizePhone(imported.parentPhone),
            ].join(":");
            const dupKey = admission ? `admission:${admission}` : identityKey;
            if (existingKeys.has(dupKey) || (admission && existingKeys.has(`admission:${admission}`))) {
              failed += 1;
              failures.push(
                `${imported.firstName} ${imported.surname}: duplicate skipped`,
              );
              continue;
            }

            const placement = resolveStudentImportPlacement(
              classes,
              sections,
              imported.className,
              imported.section ?? "",
            );
            if (!placement) {
              failed += 1;
              failures.push(
                `${imported.firstName} ${imported.surname}: class/section not found (${imported.className}${imported.section ? ` / ${imported.section}` : ""})`,
              );
              continue;
            }

            try {
              const student = await createStudentApi({
                instituteId,
                firstName: imported.firstName.trim(),
                surname: imported.surname.trim(),
                gender: mapImportGender(imported.gender),
                address: imported.address.trim() || "—",
                dateOfBirth: imported.dateOfBirth?.trim() || null,
                classLabel: placement.classLabel,
                sectionLabel: placement.sectionLabel,
                rollNo: imported.rollNo?.trim() || null,
                admissionNumber: imported.admissionNumber?.trim() || null,
                status: "active",
                accessStatus: "active",
                parentName: imported.parentName.trim(),
                parentPhone: normalizePhone(imported.parentPhone),
                parentRelationship: "guardian",
              });
              try {
                await createEnrollment({
                  instituteId,
                  academicYearId: placement.academicYearId,
                  studentId: student.id,
                  classId: placement.classId,
                  sectionId: placement.sectionId,
                  rollNo:
                    imported.rollNo?.trim() ||
                    student.rollNo?.trim() ||
                    String(created + 1),
                  enrolledOn: new Date().toISOString().slice(0, 10),
                  status: "active",
                });
                created += 1;
                enrolled += 1;
                existingKeys.add(dupKey);
              } catch (enrollErr) {
                try {
                  await deleteStudentApi(student.id);
                } catch {
                  // Student may remain; still count as failed import row.
                }
                failed += 1;
                failures.push(
                  `${imported.firstName} ${imported.surname}: enrollment failed — student not kept (${enrollErr instanceof Error ? enrollErr.message : "error"})`,
                );
              }
            } catch (err) {
              failed += 1;
              failures.push(
                `${imported.firstName} ${imported.surname}: ${err instanceof Error ? err.message : "create failed"}`,
              );
            }
          }
        } catch (err) {
          notify(err instanceof Error ? err.message : "Bulk import failed");
          setBulkImporting(false);
          return;
        }

        setBulkImporting(false);
        setBulkImportOpen(false);
        bumpStudentsReload();
        void syncSubscriptionHeadcountAfterStudentChange();
        const summary = `${created} created · ${enrolled} enrolled${failed ? ` · ${failed} failed` : ""}`;
        notify(
          failures.length > 0
            ? `${summary}. ${failures.slice(0, 3).join(" · ")}${failures.length > 3 ? "…" : ""}`
            : summary,
        );
      })();
      return;
    }

    const { unique, duplicates } = splitImportRowsByDuplicate(importRows, rows);
    const next = [...rows];
    for (const imported of unique) {
      const id = nextStudentId(next);
      const gender =
        imported.gender.trim().toLowerCase() === "prefer not to say"
          ? "Prefer not to say"
          : (`${imported.gender.charAt(0).toUpperCase()}${imported.gender.slice(1).toLowerCase()}` as StudentGender);
      const studentPhone = normalizePhone(imported.studentPhone ?? "");
      const studentEmail = imported.studentEmail?.trim().toLowerCase() ?? "";
      const createsAccount = Boolean(
        studentPhone || studentEmail || imported.accountPassword,
      );
      const record: StudentDirectoryRecord = {
        id,
        firstName: imported.firstName.trim(),
        surname: imported.surname.trim(),
        name: `${imported.firstName.trim()} ${imported.surname.trim()}`,
        grade: gradeKeyFor(imported.className.trim(), imported.section?.trim() ?? ""),
        attendance: 100,
        gpa: 0,
        status: "active",
        accessStatus: "active",
        parent: imported.parentName.trim(),
        parentName: imported.parentName.trim(),
        parentPhone: normalizePhone(imported.parentPhone),
        address: imported.address.trim(),
        gender,
        dateOfBirth: imported.dateOfBirth?.trim() || undefined,
        admissionNumber: imported.admissionNumber?.trim() || undefined,
        rollNo: imported.rollNo?.trim() || undefined,
        idCardIssuedOn: formatIdCardIssueDate(),
        connectAccount: createsAccount
          ? {
              phone: studentPhone || undefined,
              email: studentEmail || undefined,
              temporaryPassword: imported.accountPassword!,
              status: "first-login-pending",
            }
          : undefined,
      };
      next.push(record);
      provisionStudentConnectAccount(record);
    }
    setRows(next);
    saveStudentDirectory(next);
    if (unique.length > 0) {
      syncSubscriptionHeadcountAfterStudentChange();
    }
    setBulkImportOpen(false);
    if (duplicates.length > 0 && unique.length > 0) {
      notify(
        `${unique.length} students imported · ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} skipped`,
      );
    } else if (duplicates.length > 0) {
      notify(
        `No new students imported · ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} found`,
      );
    } else {
      notify(`${unique.length} students imported successfully`);
    }
  };

  const toggleSort = (k: AdminStudentSortKey) =>
    setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }));
  const SortTh = ({ k, label }: { k: AdminStudentSortKey; label: string }) => (
    <TableTh>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-0.5"
      >
        {label}
        <ArrowUpDown className="size-3 opacity-60" />
      </button>
    </TableTh>
  );

  const statusOptions = [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Active" },
    { value: "watch" as const, label: "Needs attention" },
    { value: "at-risk" as const, label: "At risk" },
    { value: "graduated" as const, label: "Graduated" },
    { value: "inactive" as const, label: "Inactive" },
  ];

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading students…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load students"
        : listView.status === "forbidden"
          ? "You do not have access to students for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load students"
            : listView.status === "empty"
              ? "No students yet"
              : null;

  const openStudentDetail = (id: string) => {
    void navigate({ to: "/students/$id", params: { id } });
  };

  return (
    <AppShell
      title={M.students}
      subtitle={
        apiMode
          ? `${countLabel(list.length)} students · ${scopeLabel}`
          : `${list.length} students · ${scopeLabel}`
      }
      actions={
        writesEnabled ? (
          <>
            <Button onClick={() => setBulkImportOpen(true)} disabled={bulkImporting}>
              <Upload className="size-3.5" /> Bulk Import
            </Button>
            {!apiMode ? (
            <Button
              onClick={() => {
                downloadStudentDirectoryCsv(list as StudentDirectoryRecord[]);
                notify(`Saved to Downloads · ${list.length} students`);
              }}
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            ) : null}
            <Button onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="size-3.5" /> Filters
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (
                  apiMode &&
                  !apiStudentClassOptions.some((item) => item.sections.length > 0)
                ) {
                  notify(
                    "Create an academic year and a class with a section before adding students",
                  );
                }
                setCreateOpen(true);
              }}
            >
              <Plus className="size-3.5" /> Add Student
            </Button>
          </>
        ) : undefined
      }
      mobileActions={
        writesEnabled ? (
          <>
            <Button
              type="button"
              aria-label="Bulk import"
              onClick={() => setBulkImportOpen(true)}
              disabled={bulkImporting}
            >
              <Upload />
              Import
            </Button>
            <Button
              type="button"
              aria-label="Export CSV"
              onClick={() => {
                downloadStudentDirectoryCsv(list as StudentDirectoryRecord[]);
                notify(`Saved to Downloads · ${list.length} students`);
              }}
            >
              <Download />
              Export
            </Button>
            <Button
              type="button"
              aria-label="Filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter />
              Filters
            </Button>
            <Button
              type="button"
              variant="primary"
              aria-label="Add student"
              onClick={() => {
                if (
                  apiMode &&
                  !apiStudentClassOptions.some((item) => item.sections.length > 0)
                ) {
                  notify(
                    "Create an academic year and a class with a section before adding students",
                  );
                }
                setCreateOpen(true);
              }}
            >
              <Plus />
              Add
            </Button>
          </>
        ) : undefined
      }
    >
      {!listView.rowsValid ? (
        <Card className="p-5">
          <div className="py-12 text-sm text-muted-foreground text-center">
            {listHint ?? "Loading students…"}
          </div>
        </Card>
      ) : (
      <Card>
        <PageToolbar className="lx-people-toolbar">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="min-w-0 flex-1 sm:w-full"
          />
          <ToolbarGroup className="lx-people-filters">
            <CascadingFiltersMenu
              groups={
                [
                  {
                    id: "status",
                    label: "Status",
                    value: filter,
                    onChange: (v) => setFilter(v as typeof filter),
                    options: statusOptions,
                  },
                  ...(college
                    ? [
                        {
                          id: "dept",
                          label: "Dept",
                          value: departmentFilter,
                          onChange: (v: string) => setDepartmentFilter(v as DepartmentFilter),
                          options: [
                            { value: "all", label: "All" },
                            ...departmentOptions.map((d) => ({ value: d, label: d })),
                          ],
                        },
                      ]
                    : []),
                  {
                    id: "class",
                    label: college ? "Year" : "Class",
                    value: classFilter,
                    onChange: (v) => setClassFilter(v as ClassFilter),
                    options: [
                      { value: "all", label: college ? "All years" : "All classes" },
                      ...classOptions.map((g) => {
                        const level = profile.academic.levels.find((l) => l.shortLabel === g);
                        return { value: g, label: level?.label ?? g };
                      }),
                    ],
                  },
                  {
                    id: "section",
                    label: "Section",
                    value: sectionFilter,
                    onChange: (v) => setSectionFilter(v as SectionFilter),
                    options: [
                      { value: "all", label: "All" },
                      ...sectionOptions.map((s) => ({ value: s, label: s })),
                    ],
                  },
                ] as CascadingFilterGroup[]
              }
            />
          </ToolbarGroup>
        </PageToolbar>
        {writesEnabled && filtersOpen && (
          <div className="px-4 sm:px-5 py-4 border-b border-border flex flex-wrap gap-4 bg-background/40">
            <Field label="Min attendance %">
              <TextInput
                fieldSize="compact"
                type="number"
                value={minAttendancePct || ""}
                onChange={(e) => setMinAttendancePct(Number(e.target.value) || 0)}
                className="w-24"
                placeholder="0"
              />
            </Field>
            {(classFilter !== "all" || sectionFilter !== "all" || departmentFilter !== "all") && (
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setClassFilter("all");
                    setSectionFilter("all");
                    setDepartmentFilter("all");
                  }}
                >
                  Clear class filter
                </Button>
              </div>
            )}
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No students found"
            hint={
              apiMode && !apiStudentClassOptions.some((item) => item.sections.length > 0)
                ? "Setup first: academic year → class + section, then add students from here or the checklist."
                : (listHint ??
                  `No students in ${scopeLabel}. Try another class, section, or search term.`)
            }
          />
        ) : (
          <>
            <div className="lx-people-list sm:hidden">
              {paged.map((s) => (
                <PeopleDirectoryCard
                  key={s.id}
                  name={s.name}
                  id={s.id}
                  status={<StudentStatusPill student={s} />}
                  meta={
                    <>
                      <span>{formatStudentGradeDisplay(s.grade)}</span>
                      {!apiMode ? (
                        <>
                          <span>{s.attendance}% att.</span>
                          <span>GPA {s.gpa.toFixed(1)}</span>
                          {s.parent ? <span>{s.parent}</span> : null}
                        </>
                      ) : null}
                    </>
                  }
                  menu={
                    writesEnabled ? (
                      <StudentRowMenu
                        student={s as StudentDirectoryRecord}
                        onView={() => openStudentDetail(s.id)}
                        onHold={() => setAccessStatus(s.id, "hold")}
                        onSuspend={() => setAccessStatus(s.id, "suspended")}
                        onReactivate={() => setAccessStatus(s.id, "active")}
                        onDelete={() => setPendingDelete(s as StudentDirectoryRecord)}
                      />
                    ) : null
                  }
                  onOpen={() => openStudentDetail(s.id)}
                />
              ))}
            </div>
            <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr>
                <SortTh k="name" label="Student" />
                <SortTh k="grade" label={college ? "Dept / Year / Sec" : "Class"} />
                {!apiMode ? <SortTh k="attendance" label="Attendance" /> : null}
                {!apiMode ? <SortTh k="gpa" label="GPA" /> : null}
                {!apiMode ? <TableTh>Guardian</TableTh> : null}
                <TableTh>Status</TableTh>
                {writesEnabled ? (
                  <TableTh className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableTh>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((s) => (
                <tr
                  key={s.id}
                  role={writesEnabled ? "link" : undefined}
                  tabIndex={writesEnabled ? 0 : undefined}
                  className={
                    writesEnabled
                      ? "cursor-pointer hover:bg-surface-hover transition-colors"
                      : "hover:bg-surface-hover transition-colors"
                  }
                  onClick={
                    writesEnabled ? () => openStudentDetail(s.id) : undefined
                  }
                  onKeyDown={
                    writesEnabled
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openStudentDetail(s.id);
                          }
                        }
                      : undefined
                  }
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 group">
                      <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono">
                        {s.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="text-xs font-medium group-hover:text-primary">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">{formatStudentGradeDisplay(s.grade)}</td>
                  {!apiMode ? (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded bg-muted overflow-hidden">
                          <div
                            className={`h-full ${s.attendance < 75 ? "bg-destructive" : s.attendance < 90 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${s.attendance}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{s.attendance}%</span>
                      </div>
                    </td>
                  ) : null}
                  {!apiMode ? (
                    <td className="px-5 py-3 text-xs font-mono">{s.gpa.toFixed(1)}</td>
                  ) : null}
                  {!apiMode ? (
                    <td className="px-5 py-3 text-xs text-muted-foreground">{s.parent}</td>
                  ) : null}
                  <td className="px-5 py-3">
                    <StudentStatusPill student={s} />
                  </td>
                  {writesEnabled ? (
                    <td
                      className="px-5 py-3"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <StudentRowMenu
                        student={s as StudentDirectoryRecord}
                        onView={() => openStudentDetail(s.id)}
                        onHold={() => setAccessStatus(s.id, "hold")}
                        onSuspend={() => setAccessStatus(s.id, "suspended")}
                        onReactivate={() => setAccessStatus(s.id, "active")}
                        onDelete={() => setPendingDelete(s as StudentDirectoryRecord)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </DataTable>
            </div>
          </>
        )}
        <div className="px-4 sm:px-5 py-3 border-t border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-muted-foreground">
          <span>
            {list.length === 0
              ? "No matches"
              : `Showing ${pageIndex * PAGE_SIZE + 1}–${pageIndex * PAGE_SIZE + paged.length} of ${countLabel(list.length)}`}
            {classFilter !== "all" || sectionFilter !== "all" ? ` · ${scopeLabel}` : ""}
          </span>
          <div className="flex gap-1 w-full sm:w-auto">
            <Button className="flex-1 sm:flex-none" disabled={pageIndex <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
      )}

      {writesEnabled ? (
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete student?"
        subtitle={
          pendingDelete
            ? `This will move ${pendingDelete.name} (${pendingDelete.id}) to the Recycle Bin for 90 days.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) removeStudent(pendingDelete.id);
              }}
            >
              Delete student
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Parent link and Connect account data for this student will leave the directory until
          restored from Recycle Bin.
        </p>
      </Modal>
      ) : null}

      {writesEnabled ? (
      <StudentCreateDialog
        open={createOpen}
        academic={apiMode ? null : profile.academic}
        apiMode={apiMode}
        instituteId={instituteCtx.activeInstituteId}
        classOptions={apiStudentClassOptions}
        sectionOptions={apiStudentSectionOptions}
        onClose={() => setCreateOpen(false)}
        onCreate={createStudent}
      />
      ) : null}

      {writesEnabled ? (
      <StudentBulkImportDialog
        open={bulkImportOpen}
        onClose={() => {
          if (!bulkImporting) setBulkImportOpen(false);
        }}
        onImport={importStudents}
        importing={bulkImporting}
        instituteName={
          instituteCtx.displayLabel ||
          instituteCtx.activeInstitute?.name ||
          undefined
        }
        classOptions={apiStudentClassOptions.map((item) => ({
          classLabel: item.label,
          sectionLabels: item.sections.map((section) => section.label),
        }))}
      />
      ) : null}
    </AppShell>
  );
}

function StudentStatusPill({
  student,
}: {
  student: Pick<StudentRow, "status" | "accessStatus">;
}) {
  if (student.accessStatus === "hold") return <Pill tone="warning">Hold</Pill>;
  if (student.accessStatus === "suspended") return <Pill tone="danger">Suspended</Pill>;
  if (student.status === "graduated") return <Pill tone="info">Graduated</Pill>;
  if (student.status === "watch") return <Pill tone="warning">Needs attention</Pill>;
  if (student.status === "at-risk") return <Pill tone="danger">At risk</Pill>;
  if (student.status === "inactive") return <Pill tone="neutral">Inactive</Pill>;
  return <Pill tone="success">Active</Pill>;
}

function StudentRowMenu({
  student,
  onView,
  onHold,
  onSuspend,
  onReactivate,
  onDelete,
}: {
  student: StudentDirectoryRecord;
  onView: () => void;
  onHold: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const isRestrictedAccess =
    student.accessStatus === "hold" || student.accessStatus === "suspended";
  const { open, coords, buttonRef, menuRef, run, toggle } = useAnchoredRowMenu({
    menuWidth: 168,
    menuHeight: 180,
  });

  const menu = open && coords
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[80] min-w-[10.5rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-pop"
          style={{ top: coords.top, left: coords.left }}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => run(onView)}
          >
            View details
          </button>
          {isRestrictedAccess && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onReactivate)}
            >
              Reactivate
            </button>
          )}
          {!isRestrictedAccess && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onHold)}
            >
              Hold
            </button>
          )}
          {student.accessStatus !== "suspended" && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onSuspend)}
            >
              Suspend
            </button>
          )}
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
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Student actions"
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
