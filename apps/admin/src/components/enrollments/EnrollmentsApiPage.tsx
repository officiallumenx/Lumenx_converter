import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageToolbar,
  Pill,
  SearchInput,
  Select,
  Td,
  TextInput,
  Th,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { Plus, Users } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { classLabelForSection } from "@/lib/classes";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import {
  createEnrollmentRecord,
  enrollmentStatusLabel,
  resolveEnrollmentsListView,
  updateEnrollmentRecord,
  type EnrollmentListItem,
  type EnrollmentListStatus,
  type EnrollmentStatus,
} from "@/lib/enrollments";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  useCatalogClassesQuery,
  useCatalogYearsQuery,
  useEnrollmentsListQuery,
  useStudentsListQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

const STATUS_FILTERS: Array<{ value: "all" | EnrollmentStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "transferred", label: "Transferred" },
  { value: "dropped_out", label: "Dropped out" },
  { value: "graduated", label: "Graduated" },
];

function statusTone(
  status: EnrollmentStatus,
): "success" | "warning" | "neutral" | "danger" {
  if (status === "active") return "success";
  if (status === "graduated") return "neutral";
  if (status === "transferred" || status === "completed") return "warning";
  return "danger";
}

function loadHint(status: EnrollmentListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading enrollments…";
  if (status === "needs_institute") return "Select an institute to manage enrollments.";
  if (status === "forbidden") return errorMessage ?? "You do not have access to enrollments.";
  if (status === "error") return errorMessage ?? "Failed to load enrollments.";
  if (status === "empty") return "No enrollments match these filters.";
  return null;
}

function nextRollNo(items: EnrollmentListItem[]): string {
  const numbers = items
    .map((item) => Number.parseInt(item.rollNo, 10))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(max + 1);
}

function enrichEnrollmentLabels(
  items: EnrollmentListItem[],
  classes: ClassDto[],
  sections: SectionDto[],
): EnrollmentListItem[] {
  if (classes.length === 0 && sections.length === 0) return items;
  const classesById = new Map(classes.map((row) => [row.id, row]));
  const sectionsById = new Map(sections.map((row) => [row.id, row]));
  return items.map((item) => {
    const section = sectionsById.get(item.sectionId);
    const cls =
      classesById.get(item.classId) ??
      (section ? classesById.get(section.classId) : undefined);
    return {
      ...item,
      classLabel: cls?.name?.trim() || cls?.code?.trim() || item.classLabel || "—",
      sectionLabel:
        section?.code?.trim() || section?.name?.trim() || item.sectionLabel || "—",
    };
  });
}

type Props = {
  initialSectionId?: string;
  initialAcademicYearId?: string;
};

export function EnrollmentsApiPage({
  initialSectionId,
  initialAcademicYearId,
}: Props) {
  const notify = useAdminToast();
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ?? "");
  const [classId, setClassId] = useState("all");
  const [sectionId, setSectionId] = useState(initialSectionId ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<EnrollmentListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [newStudentId, setNewStudentId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [newRollNo, setNewRollNo] = useState("");
  const [newEnrolledOn, setNewEnrolledOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [editRollNo, setEditRollNo] = useState("");
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>("active");
  const [editSectionId, setEditSectionId] = useState("");

  const catalogEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const yearsQuery = useCatalogYearsQuery(
    instituteCtx.activeInstituteId,
    catalogEnabled,
  );
  const classesQuery = useCatalogClassesQuery(
    instituteCtx.activeInstituteId,
    catalogEnabled,
  );
  const studentsQuery = useStudentsListQuery(
    instituteCtx.activeInstituteId,
    {},
    catalogEnabled,
  );
  const enrollmentsQuery = useEnrollmentsListQuery(
    instituteCtx.activeInstituteId,
    {
      academicYearId: academicYearId || undefined,
      classId: classId !== "all" ? classId : undefined,
      sectionId: sectionId !== "all" ? sectionId : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    catalogEnabled,
  );

  const years = yearsQuery.data ?? [];
  const classes = classesQuery.data?.classes ?? [];
  const sections = classesQuery.data?.sections ?? [];
  const students = studentsQuery.data?.items ?? [];

  useEffect(() => {
    if (!academicYearId && years.length > 0) {
      const activeYear = years.find((year) => year.status === "active") ?? years[0];
      if (activeYear) setAcademicYearId(activeYear.id);
    }
  }, [years, academicYearId]);

  const rawItems = enrollmentsQuery.data?.items ?? [];
  const items = useMemo(
    () => enrichEnrollmentLabels(rawItems, classes, sections),
    [rawItems, classes, sections],
  );

  const loadStatus: EnrollmentListStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : enrollmentsQuery.isLoading && !enrollmentsQuery.data
              ? "loading"
              : (enrollmentsQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (enrollmentsQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    enrollmentsQuery.data && catalogEnabled ? instituteCtx.activeInstituteId : null;

  const listView = resolveEnrollmentsListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: items,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = loadHint(listView.status, listView.errorMessage);

  const invalidateEnrollments = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.enrollments),
    });
  };

  const yearSections = useMemo(() => {
    return sections.filter((section) =>
      academicYearId ? section.academicYearId === academicYearId : true,
    );
  }, [sections, academicYearId]);

  const classOptions = useMemo(() => {
    const ids = new Set(yearSections.map((section) => section.classId));
    return classes.filter((row) => ids.has(row.id));
  }, [classes, yearSections]);

  const filteredSections = useMemo(() => {
    if (classId === "all") return yearSections;
    return yearSections.filter((section) => section.classId === classId);
  }, [yearSections, classId]);

  const displayRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return listView.items;
    return listView.items.filter(
      (row) =>
        row.studentName.toLowerCase().includes(needle) ||
        row.rollNo.toLowerCase().includes(needle) ||
        row.classLabel.toLowerCase().includes(needle) ||
        row.sectionLabel.toLowerCase().includes(needle),
    );
  }, [listView.items, search]);

  const openCreate = () => {
    const defaultSection =
      sectionId !== "all" ? sectionId : filteredSections[0]?.id ?? "";
    setNewSectionId(defaultSection);
    setNewStudentId("");
    setNewRollNo(nextRollNo(items.filter((row) => row.sectionId === defaultSection)));
    setNewEnrolledOn(new Date().toISOString().slice(0, 10));
    setCreateOpen(true);
  };

  const submitCreate = () => {
    if (!writesEnabled || !instituteCtx.activeInstituteId || !academicYearId) return;
    const section = sections.find((row) => row.id === newSectionId);
    if (!section || !newStudentId || !newRollNo.trim()) {
      notify("Student, section, and roll number are required");
      return;
    }
    setSaving(true);
    void createEnrollmentRecord({
      instituteId: instituteCtx.activeInstituteId,
      academicYearId,
      studentId: newStudentId,
      classId: section.classId,
      sectionId: section.id,
      rollNo: newRollNo.trim(),
      enrolledOn: newEnrolledOn,
      status: "active",
    })
      .then(() => {
        setCreateOpen(false);
        invalidateEnrollments();
        notify("Student enrolled");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to enroll student");
      })
      .finally(() => setSaving(false));
  };

  const openEdit = (row: EnrollmentListItem) => {
    setEditRow(row);
    setEditRollNo(row.rollNo);
    setEditStatus(row.status);
    setEditSectionId(row.sectionId);
  };

  const submitEdit = () => {
    if (!writesEnabled || !editRow) return;
    setSaving(true);
    const section = sections.find((row) => row.id === editSectionId);
    void updateEnrollmentRecord(editRow.id, {
      rollNo: editRollNo.trim(),
      status: editStatus,
      sectionId: editSectionId,
      classId: section?.classId,
    })
      .then(() => {
        setEditRow(null);
        invalidateEnrollments();
        notify("Enrollment updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update enrollment");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search student, roll, class…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <ToolbarSpacer />
        <Pill tone="neutral">
          {writesEnabled ? "Create / update" : "Read-only"}
        </Pill>
        {writesEnabled ? (
          <Button variant="primary" onClick={openCreate} disabled={!academicYearId}>
            <Plus className="size-3.5" /> Enroll student
          </Button>
        ) : null}
        <ToolbarMeta>{displayRows.length} rows</ToolbarMeta>
      </PageToolbar>

      <Card>
        <CardHeader
          title="Section rosters"
          hint={
            listView.rowsValid
              ? `${displayRows.length} enrollments`
              : hint ?? "Academic enrollments"
          }
        />
        <div className="lx-filter-bar flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-5 sm:py-2.5">
          <CascadingFiltersMenu
            groups={[
              {
                id: "year",
                label: "Academic year",
                value: academicYearId || "all",
                onChange: (value) => {
                  setAcademicYearId(value === "all" ? "" : value);
                  setClassId("all");
                  setSectionId("all");
                },
                options: [
                  { value: "all", label: "All years" },
                  ...years.map((year) => ({ value: year.id, label: year.name })),
                ],
              },
              {
                id: "class",
                label: "Class",
                value: classId,
                onChange: (value) => {
                  setClassId(value);
                  setSectionId("all");
                },
                options: [
                  { value: "all", label: "All classes" },
                  ...classOptions.map((row) => ({
                    value: row.id,
                    label: row.name || row.code,
                  })),
                ],
              },
              {
                id: "section",
                label: "Section",
                value: sectionId,
                onChange: setSectionId,
                options: [
                  { value: "all", label: "All sections" },
                  ...filteredSections.map((section) => {
                    const classesById = new Map(classes.map((row) => [row.id, row]));
                    return {
                      value: section.id,
                      label: `${classLabelForSection(section, classesById)} · ${section.code || section.name}`,
                    };
                  }),
                ],
              },
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: (value) => setStatusFilter(value as "all" | EnrollmentStatus),
                options: STATUS_FILTERS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              },
            ]}
          />
        </div>

        {!listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {hint ?? "Loading…"}
          </div>
        ) : displayRows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Users className="size-5" />}
              title="No enrollments found"
              hint={hint ?? "Enroll students into a class section to build rosters."}
            />
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Roll</Th>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                <Th>Enrolled</Th>
                {writesEnabled ? <Th>Actions</Th> : null}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-mono text-sm">{row.rollNo}</Td>
                  <Td className="font-medium">{row.studentName}</Td>
                  <Td>{row.classLabel}</Td>
                  <Td>{row.sectionLabel}</Td>
                  <Td>
                    <Pill tone={statusTone(row.status)}>
                      {enrollmentStatusLabel(row.status)}
                    </Pill>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{row.enrolledOn}</Td>
                  {writesEnabled ? (
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Enroll student"
        subtitle="Assign a student to a class section for the selected academic year"
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitCreate} disabled={saving}>
              {saving ? "Saving…" : "Enroll"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Student">
            <Select value={newStudentId} onChange={(event) => setNewStudentId(event.target.value)}>
              <option value="">Select student…</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section">
            <Select
              value={newSectionId}
              onChange={(event) => {
                const nextSectionId = event.target.value;
                setNewSectionId(nextSectionId);
                setNewRollNo(nextRollNo(items.filter((row) => row.sectionId === nextSectionId)));
              }}
            >
              <option value="">Select section…</option>
              {filteredSections.map((section) => {
                const classesById = new Map(classes.map((row) => [row.id, row]));
                return (
                  <option key={section.id} value={section.id}>
                    {classLabelForSection(section, classesById)} · {section.code || section.name}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Roll number">
            <TextInput value={newRollNo} onChange={(event) => setNewRollNo(event.target.value)} />
          </Field>
          <Field label="Enrolled on">
            <TextInput
              type="date"
              value={newEnrolledOn}
              onChange={(event) => setNewEnrolledOn(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={editRow?.studentName ?? "Enrollment"}
        subtitle="Update roll number, section transfer, or lifecycle status"
        footer={
          <>
            <Button onClick={() => setEditRow(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitEdit} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Roll number">
            <TextInput value={editRollNo} onChange={(event) => setEditRollNo(event.target.value)} />
          </Field>
          <Field label="Section">
            <Select value={editSectionId} onChange={(event) => setEditSectionId(event.target.value)}>
              {filteredSections.map((section) => {
                const classesById = new Map(classes.map((row) => [row.id, row]));
                return (
                  <option key={section.id} value={section.id}>
                    {classLabelForSection(section, classesById)} · {section.code || section.name}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value as EnrollmentStatus)}
            >
              {STATUS_FILTERS.filter((option) => option.value !== "all").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
