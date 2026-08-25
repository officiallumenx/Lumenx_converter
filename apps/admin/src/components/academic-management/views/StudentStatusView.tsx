import { useMemo, useState } from "react";
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
import {
  STATUS_DIRECTORY_STUDENTS,
  STUDENT_STATUS_FILTER_OPTIONS,
  studentStatusBadgeTone,
  type StudentLifecycleStatus,
} from "@/lib/academic-management-data";

type StatusFilter = "All" | StudentLifecycleStatus;
type ScopeMode = "all" | "multi" | "single";

const SCOPE_OPTIONS: { id: ScopeMode; label: string }[] = [
  { id: "all", label: "All (institute)" },
  { id: "multi", label: "Multi class" },
  { id: "single", label: "Class & section" },
];

export function StudentStatusView() {
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
