import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
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
  Select,
  Td,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { GraduationCap, Save } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  GRADUATION_RESULT_OPTIONS,
  GRADUATION_STATUS_FILTER_OPTIONS,
  GRADUATION_YEAR_OPTIONS,
  graduationResultLabel,
  graduationResultTone,
  HIGHEST_CONFIGURED_CLASS,
  PRESENT_GRADUATION_YEAR_ID,
  type GraduationResult,
} from "@/lib/academic-management-data";
import {
  GRADUATION_HISTORY_CHANGED_EVENT,
  loadGraduationRows,
  persistGraduateStudents,
  saveGraduationStatuses,
  validateGraduationSelection,
} from "@/lib/academic-progression";
import { STUDENTS_CHANGED_EVENT } from "@/lib/student-directory-store";

function yearLabel(id: string) {
  return GRADUATION_YEAR_OPTIONS.find((y) => y.id === id)?.label ?? id;
}

function formatGraduationDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GraduationView() {
  const notify = useAdminToast();
  const [rows, setRows] = useState(() => loadGraduationRows());

  const reloadRows = useCallback(() => {
    setRows(loadGraduationRows());
  }, []);

  useEffect(() => {
    const onChange = () => reloadRows();
    window.addEventListener(STUDENTS_CHANGED_EVENT, onChange);
    window.addEventListener(GRADUATION_HISTORY_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(STUDENTS_CHANGED_EVENT, onChange);
      window.removeEventListener(GRADUATION_HISTORY_CHANGED_EVENT, onChange);
    };
  }, [reloadRows]);

  const presentYearLabel = yearLabel(PRESENT_GRADUATION_YEAR_ID);

  const [statusDrafts, setStatusDrafts] = useState<Record<string, GraduationResult>>({});

  const [yearFilter, setYearFilter] = useState<string>(PRESENT_GRADUATION_YEAR_ID);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | GraduationResult>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const presentRows = useMemo(
    () => rows.filter((r) => r.academicYearId === PRESENT_GRADUATION_YEAR_ID),
    [rows],
  );

  const sectionOptions = useMemo(() => {
    const scoped = rows.filter((r) => r.academicYearId === yearFilter);
    const set = new Set(scoped.map((r) => r.section));
    return ["all", ...Array.from(set).sort()];
  }, [rows, yearFilter]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.academicYearId !== yearFilter) return false;
      if (sectionFilter !== "all" && r.section !== sectionFilter) return false;
      if (statusFilter !== "all" && r.result !== statusFilter) return false;
      return true;
    });
  }, [rows, yearFilter, sectionFilter, statusFilter]);

  const selectedIds = useMemo(
    () => filtered.filter((r) => selected[r.id]).map((r) => r.id),
    [filtered, selected],
  );

  const plannedGraduationDate = useMemo(
    () => formatGraduationDate(new Date().toISOString()),
    [],
  );

  const confirmValidationErrors = useMemo(
    () => validateGraduationSelection(selectedIds, yearFilter, presentRows),
    [presentRows, selectedIds, yearFilter],
  );

  const reviewRows = useMemo(
    () =>
      presentRows
        .filter((row) => selectedIds.includes(row.id))
        .map((row) => ({
          id: row.id,
          name: row.name,
          academicYear: yearLabel(yearFilter),
          currentStatus: statusDrafts[row.id] ?? row.result,
          graduationDate: plannedGraduationDate,
        })),
    [plannedGraduationDate, presentRows, selectedIds, statusDrafts, yearFilter],
  );

  const passedCount = presentRows.filter((r) => r.result === "passed").length;
  const failedCount = presentRows.filter((r) => r.result === "failed").length;
  const droppedCount = presentRows.filter((r) => r.result === "dropped_out").length;

  const dirtyPresentCount = useMemo(() => {
    return presentRows.filter((r) => {
      const draft = statusDrafts[r.id];
      return draft !== undefined && draft !== r.result;
    }).length;
  }, [presentRows, statusDrafts]);

  const setDraftStatus = (id: string, result: GraduationResult) => {
    setStatusDrafts((prev) => ({ ...prev, [id]: result }));
  };

  const savePresentStatuses = () => {
    const updates = presentRows.filter((r) => {
      const draft = statusDrafts[r.id];
      return draft !== undefined && draft !== r.result;
    });
    if (updates.length === 0) {
      notify("No status changes to save");
      return;
    }
    saveGraduationStatuses(
      updates.map((row) => ({
        id: row.id,
        result: statusDrafts[row.id] ?? row.result,
      })),
    );
    setRows((prev) =>
      prev.map((r) => {
        if (r.academicYearId !== PRESENT_GRADUATION_YEAR_ID) return r;
        const draft = statusDrafts[r.id];
        if (draft === undefined || draft === r.result) return r;
        return { ...r, result: draft };
      }),
    );
    setStatusDrafts({});
    notify(`Updated status for ${updates.length} student(s) in ${presentYearLabel}`);
  };

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllFiltered = () => {
    const allOn = filtered.length > 0 && filtered.every((r) => selected[r.id]);
    if (allOn) {
      setSelected((prev) => {
        const next = { ...prev };
        for (const r of filtered) delete next[r.id];
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of filtered) next[r.id] = true;
      return next;
    });
  };

  const clearGraduationSelection = (ids: string[]) => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setStatusDrafts((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  };

  const resultMapFor = (ids: string[]) => {
    const results: Record<string, GraduationResult> = {};
    for (const id of ids) {
      const row = presentRows.find((entry) => entry.id === id);
      if (!row) continue;
      results[id] = statusDrafts[id] ?? row.result;
    }
    return results;
  };

  const runGraduate = (ids: string[], label: string) => {
    const errors = validateGraduationSelection(ids, yearFilter, presentRows);
    if (errors.length > 0) {
      notify(errors[0]!);
      return;
    }
    const count = persistGraduateStudents(ids, yearFilter, {
      yearLabel: yearLabel(yearFilter),
      results: resultMapFor(ids),
    });
    if (count === 0) {
      notify("No students were graduated — they may already be recorded.");
      return;
    }
    reloadRows();
    clearGraduationSelection(ids);
    notify(`${label}: ${count} student(s) graduated · ${yearLabel(yearFilter)}`);
  };

  const confirmGraduation = () => {
    runGraduate(selectedIds, "Graduated");
  };

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi
          label="Highest class"
          value={HIGHEST_CONFIGURED_CLASS}
          delta={`Present year ${presentYearLabel}`}
        />
        <Kpi label="Passed" value={String(passedCount)} tone="up" delta="Present year" />
        <Kpi label="Failed" value={String(failedCount)} tone="down" delta="Present year" />
        <Kpi label="Dropped out" value={String(droppedCount)} delta="Present year" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Present academic year · status update"
          hint={`Update Passed / Failed / Dropped Out for ${HIGHEST_CONFIGURED_CLASS} in ${presentYearLabel}`}
          action={
            <Button
              size="sm"
              onClick={savePresentStatuses}
              disabled={dirtyPresentCount === 0}
            >
              <Save className="size-3.5" /> Save statuses
              {dirtyPresentCount > 0 ? ` (${dirtyPresentCount})` : ""}
            </Button>
          }
        />
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>
              Academic year {presentYearLabel} · Class {HIGHEST_CONFIGURED_CLASS}
            </ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {presentRows.length} student{presentRows.length === 1 ? "" : "s"}
            {dirtyPresentCount > 0 ? ` · ${dirtyPresentCount} unsaved` : ""}
          </ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>Student</Th>
                <Th>Roll Number</Th>
                <Th>Section</Th>
                <Th>Current status</Th>
                <Th>Update status</Th>
              </Tr>
            </thead>
            <tbody>
              {presentRows.map((row) => {
                const draft = statusDrafts[row.id] ?? row.result;
                const dirty = draft !== row.result;
                return (
                  <Tr key={row.id}>
                    <Td className="font-medium">{row.name}</Td>
                    <Td className="tabular-nums">{row.rollNo}</Td>
                    <Td>{row.section}</Td>
                    <Td>
                      <Pill tone={graduationResultTone(row.result)}>
                        {graduationResultLabel(row.result)}
                      </Pill>
                    </Td>
                    <Td>
                      <Select
                        fieldSize="compact"
                        className={`min-w-[10rem] ${dirty ? "ring-1 ring-primary/40" : ""}`}
                        value={draft}
                        onChange={(e) =>
                          setDraftStatus(row.id, e.target.value as GraduationResult)
                        }
                      >
                        {GRADUATION_RESULT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {graduationResultLabel(opt)}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </Tr>
                );
              })}
              {presentRows.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    No {HIGHEST_CONFIGURED_CLASS} students in the present academic year.
                  </Td>
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

      <Card>
        <CardHeader
          title="Graduation"
          hint={`Only ${HIGHEST_CONFIGURED_CLASS} · filter by academic year and status`}
        />
        <CardBody className="border-b border-border">
          <FormGrid cols={2}>
            <Field label="Academic year" required>
              <Select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setSectionFilter("all");
                  setSelected({});
                }}
              >
                {GRADUATION_YEAR_OPTIONS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                    {y.id === PRESENT_GRADUATION_YEAR_ID ? " (present)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | GraduationResult)
                }
              >
                {GRADUATION_STATUS_FILTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : graduationResultLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section" className="sm:col-span-2">
              <Select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All sections" : `Section ${s}`}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </CardBody>
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>
              {yearLabel(yearFilter)}
              {" · "}
              Class {HIGHEST_CONFIGURED_CLASS}
              {" · "}
              {sectionFilter === "all" ? "All sections" : `Section ${sectionFilter}`}
              {" · "}
              {statusFilter === "all"
                ? "All statuses"
                : graduationResultLabel(statusFilter)}
            </ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {filtered.length} shown · {selectedIds.length} selected
          </ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={
                      filtered.length > 0 && filtered.every((r) => selected[r.id])
                    }
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    aria-label="Select all filtered"
                  />
                </Th>
                <Th>Student</Th>
                <Th>Roll Number</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                {yearFilter !== PRESENT_GRADUATION_YEAR_ID ? <Th>Graduated on</Th> : null}
              </Tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={Boolean(selected[row.id])}
                      onChange={() => toggle(row.id)}
                      disabled={row.academicYearId !== PRESENT_GRADUATION_YEAR_ID}
                      aria-label={`Select ${row.name}`}
                    />
                  </Td>
                  <Td className="font-medium">{row.name}</Td>
                  <Td className="tabular-nums">{row.rollNo}</Td>
                  <Td>{row.class}</Td>
                  <Td>{row.section}</Td>
                  <Td>
                    <Pill tone={graduationResultTone(row.result)}>
                      {graduationResultLabel(row.result)}
                    </Pill>
                  </Td>
                  {yearFilter !== PRESENT_GRADUATION_YEAR_ID ? (
                    <Td className="tabular-nums text-muted-foreground">
                      {formatGraduationDate(row.graduatedAt)}
                    </Td>
                  ) : null}
                </Tr>
              ))}
              {filtered.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    No {HIGHEST_CONFIGURED_CLASS} students for this year / status.
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  {yearFilter !== PRESENT_GRADUATION_YEAR_ID ? <Td>{""}</Td> : null}
                </Tr>
              ) : null}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Review before confirmation"
          hint="Confirm academic year, graduation status, and student selection"
          action={
            yearFilter === PRESENT_GRADUATION_YEAR_ID ? (
              <Button
                size="sm"
                onClick={confirmGraduation}
                disabled={selectedIds.length === 0 || confirmValidationErrors.length > 0}
              >
                <GraduationCap className="size-3.5" /> Confirm graduation
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {yearFilter !== PRESENT_GRADUATION_YEAR_ID ? (
            <p className="text-sm text-muted-foreground">
              Past academic years show graduation history. Switch to the present year to graduate
              pending students.
            </p>
          ) : null}

          {yearFilter === PRESENT_GRADUATION_YEAR_ID && confirmValidationErrors.length > 0 ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
              <div className="font-medium text-foreground">Confirmation is blocked</div>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {confirmValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {yearFilter === PRESENT_GRADUATION_YEAR_ID && reviewRows.length > 0 ? (
            <div className="overflow-x-auto">
              <DataTable>
                <thead>
                  <Tr>
                    <Th>Student</Th>
                    <Th>Academic Year</Th>
                    <Th>Current Status</Th>
                    <Th>Graduation Date</Th>
                  </Tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="font-medium">{row.name}</Td>
                      <Td>{row.academicYear}</Td>
                      <Td>
                        <Pill tone={graduationResultTone(row.currentStatus)}>
                          {graduationResultLabel(row.currentStatus)}
                        </Pill>
                      </Td>
                      <Td className="tabular-nums">{row.graduationDate}</Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ) : yearFilter === PRESENT_GRADUATION_YEAR_ID ? (
            <p className="text-sm text-muted-foreground">
              Select eligible students to review their graduation details before confirmation.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </PageStack>
  );
}
