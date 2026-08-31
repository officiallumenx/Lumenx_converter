import { useEffect, useMemo, useRef, useState } from "react";
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
import { listAcademicYears } from "@/lib/academic-years/api";
import type { AcademicYearDto } from "@/lib/academic-years/types";
import { classLabelForSection, listClassesCatalog } from "@/lib/classes";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import {
  createEnrollmentRecord,
  enrollmentDtosToListItems,
  enrollmentStatusLabel,
  listEnrollments,
  resolveEnrollmentsListView,
  shouldCommitEnrollmentsLoad,
  updateEnrollmentRecord,
  type EnrollmentListItem,
  type EnrollmentListStatus,
  type EnrollmentStatus,
} from "@/lib/enrollments";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listStudents, studentDtosToListItems, type StudentListItem } from "@/lib/students";

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

type Props = {
  initialSectionId?: string;
  initialAcademicYearId?: string;
};

export function EnrollmentsApiPage({
  initialSectionId,
  initialAcademicYearId,
}: Props) {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ?? "");
  const [classId, setClassId] = useState("all");
  const [sectionId, setSectionId] = useState(initialSectionId ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<EnrollmentListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<EnrollmentListStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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

  const filterKey = `${academicYearId}|${classId}|${sectionId}|${statusFilter}`;

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

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setYears([]);
      setClasses([]);
      setSections([]);
      setStudents([]);
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    void Promise.all([
      listAcademicYears({ instituteId }),
      listClassesCatalog({ instituteId }),
      listStudents({ instituteId }).then(studentDtosToListItems),
    ]).then(([yearRows, catalog, studentRows]) => {
      if (activeInstituteIdRef.current !== instituteId) return;
      setYears(yearRows);
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setStudents(studentRows);
      if (!academicYearId && yearRows.length > 0) {
        const activeYear = yearRows.find((year) => year.status === "active") ?? yearRows[0];
        if (activeYear) setAcademicYearId(activeYear.id);
      }
    });
  }, [instituteCtx.status, instituteCtx.activeInstituteId, academicYearId]);

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setItems([]);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestKey = filterKey;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);

    void listEnrollments({
      instituteId: requestInstituteId,
      academicYearId: academicYearId || undefined,
      classId: classId !== "all" ? classId : undefined,
      sectionId: sectionId !== "all" ? sectionId : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
      .then((rows) => {
        if (
          !shouldCommitEnrollmentsLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
            requestKey,
            activeKey: filterKey,
          })
        ) {
          return;
        }
        const classesById = new Map(classes.map((row) => [row.id, row]));
        const sectionsById = new Map(sections.map((row) => [row.id, row]));
        const mapped = enrollmentDtosToListItems(rows, { classesById, sectionsById });
        setItems(mapped);
        setLoadStatus(mapped.length === 0 ? "empty" : "ready");
        setLoadError(null);
        setResolvedForInstituteId(requestInstituteId);
      })
      .catch((err) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        const message = err instanceof Error ? err.message : "Failed to load enrollments";
        const status =
          err &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status: number }).status === 403
            ? "forbidden"
            : "error";
        setItems([]);
        setLoadStatus(status);
        setLoadError(message);
        setResolvedForInstituteId(requestInstituteId);
      });

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    filterKey,
    reloadKey,
    classes,
    sections,
  ]);

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
        setReloadKey((value) => value + 1);
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
        setReloadKey((value) => value + 1);
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
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        <Pill tone="neutral">
          {writesEnabled ? "API mode · create / update" : "Read-only · API mode"}
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
        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
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
