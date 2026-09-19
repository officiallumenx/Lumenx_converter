import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Field,
  FormGrid,
  Kpi,
  KpiGrid,
  PageStack,
  PageToolbar,
  Pill,
  SearchInput,
  Select,
  Td,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  STATUS_DIRECTORY_STUDENTS,
  STUDENT_STATUS_FILTER_OPTIONS,
  studentStatusBadgeTone,
  type StudentLifecycleStatus,
} from "@/lib/academic-management-data";
import { listClassesCatalog, type ClassDto, type SectionDto } from "@/lib/classes";
import { classSortRank, sectionSortRank } from "@/lib/classes/name-format";
import {
  enrollmentStatusLabel,
  loadEnrollmentsList,
  updateEnrollmentRecord,
  type EnrollmentListItem,
  type EnrollmentListStatus,
  type EnrollmentStatus,
} from "@/lib/enrollments";
import { useInstituteContext } from "@/lib/institutes";

type StatusFilter = "All" | StudentLifecycleStatus;
type ScopeMode = "all" | "multi" | "single";

const SCOPE_OPTIONS: { id: ScopeMode; label: string }[] = [
  { id: "all", label: "All (institute)" },
  { id: "multi", label: "Multi class" },
  { id: "single", label: "Class & section" },
];

const ENROLLMENT_STATUS_OPTIONS: EnrollmentStatus[] = [
  "active",
  "completed",
  "transferred",
  "dropped_out",
  "graduated",
];

function enrollmentStatusTone(
  status: EnrollmentStatus,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "completed" || status === "graduated") return "info";
  if (status === "transferred" || status === "dropped_out") return "danger";
  return "neutral";
}

export function StudentStatusView() {
  if (isApiAuthMode()) {
    return <StudentStatusApiView />;
  }
  return <StudentStatusDemoView />;
}

function StudentStatusDemoView() {
  const [rows] = useState(STATUS_DIRECTORY_STUDENTS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [scope, setScope] = useState<ScopeMode>("all");
  const [q, setQ] = useState("");

  const classOptions = useMemo(() => {
    return [...new Set(rows.map((r) => r.class))].sort();
  }, [rows]);

  const [currentClass, setCurrentClass] = useState<string>(() => classOptions[0] ?? "4th");
  const [section, setSection] = useState<string>("A");
  const [multiClasses, setMultiClasses] = useState<string[]>(() =>
    classOptions.slice(0, 2),
  );

  const sectionOptions = useMemo(() => {
    const scoped =
      scope === "single"
        ? rows.filter((r) => r.class === currentClass)
        : rows;
    return [...new Set(scoped.map((r) => r.section))].sort();
  }, [rows, scope, currentClass]);

  const activeCount = rows.filter((r) => r.status === "Active").length;
  const graduatedCount = rows.filter((r) => r.status === "Graduated").length;
  const transferredCount = rows.filter((r) => r.status === "Transferred").length;

  const scopeLabel = useMemo(() => {
    if (scope === "all") return "All classes";
    if (scope === "multi") {
      if (multiClasses.length === 0) return "No classes selected";
      return multiClasses.join(", ");
    }
    return `${currentClass}-${section}`;
  }, [scope, multiClasses, currentClass, section]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;

      if (scope === "single") {
        if (r.class !== currentClass || r.section !== section) return false;
      } else if (scope === "multi") {
        if (multiClasses.length === 0 || !multiClasses.includes(r.class)) return false;
      }

      if (!q.trim()) return true;
      const hay = `${r.name} ${r.rollNo} ${r.admissionNo} ${r.class} ${r.section} ${r.status}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [rows, statusFilter, scope, currentClass, section, multiClasses, q]);

  const toggleMultiClass = (cls: string) => {
    setMultiClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls].sort(),
    );
  };

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Directory" value={String(rows.length)} />
        <Kpi label="Active" value={String(activeCount)} tone="up" />
        <Kpi label="Graduated" value={String(graduatedCount)} />
        <Kpi label="Transferred" value={String(transferredCount)} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Student status"
          hint="Filter by class scope and status"
        />
        <CardBody className="border-b border-border space-y-4">
          <FormGrid cols={2}>
            <Field label="Class filter" required>
              <Select
                value={scope}
                onChange={(e) => setScope(e.target.value as ScopeMode)}
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STUDENT_STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>

            {scope === "single" ? (
              <>
                <Field label="Class" required>
                  <Select
                    value={currentClass}
                    onChange={(e) => {
                      setCurrentClass(e.target.value);
                      setSection("A");
                    }}
                  >
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Section" required>
                  <Select value={section} onChange={(e) => setSection(e.target.value)}>
                    {sectionOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {scope === "multi" ? (
              <Field label="Classes" required className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {classOptions.map((cls) => {
                    const on = multiClasses.includes(cls);
                    return (
                      <label
                        key={cls}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          on
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-muted/15 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={on}
                          onChange={() => toggleMultiClass(cls)}
                        />
                        {cls}
                      </label>
                    );
                  })}
                </div>
              </Field>
            ) : null}

            {scope === "all" ? (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Showing students across the whole institute.
              </p>
            ) : null}
          </FormGrid>
        </CardBody>
        <PageToolbar>
          <ToolbarGroup>
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, roll, admission…"
              className="w-48 sm:w-64"
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {filtered.length} shown · {scopeLabel}
            {statusFilter !== "All" ? ` · ${statusFilter}` : ""}
          </ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>Student</Th>
                <Th>Roll No</Th>
                <Th>Admission</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Status</Th>
              </Tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.name}</Td>
                  <Td className="tabular-nums">{row.rollNo}</Td>
                  <Td className="text-muted-foreground tabular-nums">{row.admissionNo}</Td>
                  <Td>{row.class}</Td>
                  <Td>{row.section}</Td>
                  <Td>
                    <Pill tone={studentStatusBadgeTone(row.status)}>{row.status}</Pill>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    No students for the selected filters.
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                </Tr>
              ) : null}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </PageStack>
  );
}

function StudentStatusApiView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [rows, setRows] = useState<EnrollmentListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<EnrollmentListStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>("active");
  const [scope, setScope] = useState<ScopeMode>("all");
  const [q, setQ] = useState("");
  const [currentClassId, setCurrentClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [multiClassIds, setMultiClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setLoadStatus("loading");
      setLoadError(null);
      setRows([]);
      setClasses([]);
      setSections([]);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setRows([]);
      setClasses([]);
      setSections([]);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setLoadStatus("needs_institute");
      setLoadError(null);
      setRows([]);
      setClasses([]);
      setSections([]);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);

    void Promise.all([
      listClassesCatalog({ instituteId: requestInstituteId }),
      loadEnrollmentsList(requestInstituteId),
    ]).then(([catalog, enrollments]) => {
      if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;

      setClasses(catalog.classes);
      setSections(catalog.sections);

      const classesById = new Map(catalog.classes.map((row) => [row.id, row]));
      const sectionsById = new Map(catalog.sections.map((row) => [row.id, row]));
      const labeled = enrollments.items.map((item) => {
        const section = sectionsById.get(item.sectionId);
        const cls =
          classesById.get(item.classId) ??
          (section ? classesById.get(section.classId) : undefined);
        return {
          ...item,
          classLabel: cls?.name?.trim() || cls?.code?.trim() || item.classLabel,
          sectionLabel: section?.code?.trim() || section?.name?.trim() || item.sectionLabel,
        };
      });

      setRows(labeled);
      setLoadStatus(
        enrollments.status === "ready" || enrollments.status === "empty"
          ? labeled.length === 0
            ? "empty"
            : "ready"
          : enrollments.status,
      );
      setLoadError(enrollments.errorMessage);

      setCurrentClassId((prev) => prev || catalog.classes[0]?.id || "");
      setMultiClassIds((prev) =>
        prev.length > 0 ? prev : catalog.classes.slice(0, 2).map((row) => row.id),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const classOptions = useMemo(() => {
    return [...classes].sort(
      (a, b) =>
        classSortRank(a.name || a.code) - classSortRank(b.name || b.code) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name),
    );
  }, [classes]);

  const sectionOptions = useMemo(() => {
    if (!currentClassId) return [];
    return sections
      .filter((row) => row.classId === currentClassId)
      .sort(
        (a, b) =>
          sectionSortRank(a.code || a.name) - sectionSortRank(b.code || b.name) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.name.localeCompare(b.name),
      );
  }, [sections, currentClassId]);

  useEffect(() => {
    if (scope !== "single") return;
    if (!sectionId && sectionOptions[0]) {
      setSectionId(sectionOptions[0].id);
    } else if (sectionId && !sectionOptions.some((row) => row.id === sectionId)) {
      setSectionId(sectionOptions[0]?.id ?? "");
    }
  }, [scope, sectionId, sectionOptions]);

  const activeCount = rows.filter((r) => r.status === "active").length;
  const graduatedCount = rows.filter((r) => r.status === "graduated").length;
  const transferredCount = rows.filter((r) => r.status === "transferred").length;

  const scopeLabel = useMemo(() => {
    if (scope === "all") return "All classes";
    if (scope === "multi") {
      if (multiClassIds.length === 0) return "No classes selected";
      return multiClassIds
        .map((id) => classOptions.find((row) => row.id === id)?.name ?? id)
        .join(", ");
    }
    const cls = classOptions.find((row) => row.id === currentClassId);
    const sec = sectionOptions.find((row) => row.id === sectionId);
    return `${cls?.name ?? "—"}-${sec?.code ?? sec?.name ?? "—"}`;
  }, [scope, multiClassIds, classOptions, currentClassId, sectionOptions, sectionId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      if (scope === "single") {
        if (r.classId !== currentClassId || r.sectionId !== sectionId) return false;
      } else if (scope === "multi") {
        if (multiClassIds.length === 0 || !multiClassIds.includes(r.classId)) return false;
      }

      if (!q.trim()) return true;
      const hay =
        `${r.studentName} ${r.rollNo} ${r.classLabel} ${r.sectionLabel} ${enrollmentStatusLabel(r.status)}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [rows, statusFilter, scope, currentClassId, sectionId, multiClassIds, q]);

  const toggleMultiClass = (classId: string) => {
    setMultiClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  };

  const changeStatus = (row: EnrollmentListItem, status: EnrollmentStatus) => {
    if (row.status === status || updatingId) return;
    setUpdatingId(row.id);
    void updateEnrollmentRecord(row.id, { status })
      .then(() => {
        setRows((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, status } : item)),
        );
        notify(`Status updated · ${enrollmentStatusLabel(status)}`);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update status");
      })
      .finally(() => {
        setUpdatingId(null);
      });
  };

  const loadHint =
    loadStatus === "loading"
      ? "Loading enrollments…"
      : loadStatus === "needs_institute"
        ? "Select an institute to view student status."
        : loadStatus === "forbidden"
          ? (loadError ?? "Access denied.")
          : loadStatus === "error"
            ? (loadError ?? "Failed to load enrollments.")
            : null;

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Directory" value={String(rows.length)} />
        <Kpi label="Active" value={String(activeCount)} tone="up" />
        <Kpi label="Graduated" value={String(graduatedCount)} />
        <Kpi label="Transferred" value={String(transferredCount)} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Student status"
          hint="Live enrollments · update student status"
        />
        <CardBody className="border-b border-border space-y-4">
          {loadHint ? (
            <p className="text-xs text-muted-foreground">{loadHint}</p>
          ) : (
            <FormGrid cols={2}>
              <Field label="Class filter" required>
                <Select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ScopeMode)}
                >
                  {SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | EnrollmentStatus)
                  }
                >
                  <option value="all">All</option>
                  {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {enrollmentStatusLabel(opt)}
                    </option>
                  ))}
                </Select>
              </Field>

              {scope === "single" ? (
                <>
                  <Field label="Class" required>
                    <Select
                      value={currentClassId}
                      onChange={(e) => {
                        setCurrentClassId(e.target.value);
                        setSectionId("");
                      }}
                    >
                      {classOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Section" required>
                    <Select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                    >
                      {sectionOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code || s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              ) : null}

              {scope === "multi" ? (
                <Field label="Classes" required className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {classOptions.map((cls) => {
                      const on = multiClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            on
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-muted/15 text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={on}
                            onChange={() => toggleMultiClass(cls.id)}
                          />
                          {cls.name}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              ) : null}

              {scope === "all" ? (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Showing enrollments across the whole institute.
                </p>
              ) : null}
            </FormGrid>
          )}
        </CardBody>
        <PageToolbar>
          <ToolbarGroup>
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, roll, class…"
              className="w-48 sm:w-64"
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {filtered.length} shown · {scopeLabel}
            {statusFilter !== "all" ? ` · ${enrollmentStatusLabel(statusFilter)}` : ""}
          </ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>Student</Th>
                <Th>Roll No</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                <Th>Change</Th>
              </Tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.studentName}</Td>
                  <Td className="tabular-nums">{row.rollNo}</Td>
                  <Td>{row.classLabel}</Td>
                  <Td>{row.sectionLabel}</Td>
                  <Td>
                    <Pill tone={enrollmentStatusTone(row.status)}>
                      {enrollmentStatusLabel(row.status)}
                    </Pill>
                  </Td>
                  <Td>
                    <Select
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(e) =>
                        changeStatus(row, e.target.value as EnrollmentStatus)
                      }
                    >
                      {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {enrollmentStatusLabel(opt)}
                        </option>
                      ))}
                    </Select>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    {loadHint ?? "No enrollments for the selected filters."}
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                </Tr>
              ) : null}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </PageStack>
  );
}
