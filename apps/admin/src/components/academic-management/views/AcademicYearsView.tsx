import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadAcademicYearsList,
  resolveAcademicYearsListView,
  shouldCommitAcademicYearsLoad,
  type AcademicYearListItem,
  type AcademicYearsListStatus,
} from "@/lib/academic-years";
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
  Modal,
  PageStack,
  PageToolbar,
  Pill,
  Select,
  TextInput,
  Td,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { Archive, Download, Eye, FileSpreadsheet, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { syncAcademicYearLocked } from "@lumenx/utils";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  ACADEMIC_YEAR_RECORD_STATUS_OPTIONS,
  ACADEMIC_YEAR_VIEW_OPTIONS,
  ACTIVATION_GRACE_DAYS,
  canActivateAcademicYear,
  getRecordsForAcademicYear,
  loadAcademicYears,
  newAcademicYearId,
  saveAcademicYears,
  todayIsoDate,
  yearRecordStatusTone,
  type AcademicYear,
  type AcademicYearActivationMeta,
  type AcademicYearRecordStatus,
  type AcademicYearStatus,
} from "@/lib/academic-management-data";
import {
  downloadAcademicYearRecordsExcel,
  downloadAcademicYearRecordsPdf,
} from "@/lib/academic-year-exports";

function statusPill(status: AcademicYearStatus) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "completed") return <Pill tone="neutral">Completed</Pill>;
  if (status === "upcoming") return <Pill tone="info">Upcoming</Pill>;
  return <Pill tone="warning">Archived</Pill>;
}

type YearForm = {
  label: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: YearForm = { label: "", startDate: "", endDate: "" };

type YearRow = AcademicYear | AcademicYearListItem;

export function AcademicYearsView() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = !apiMode;
  const [years, setYears] = useState<AcademicYear[]>(() =>
    apiMode ? [] : loadAcademicYears(),
  );
  const [apiItems, setApiItems] = useState<AcademicYearListItem[]>([]);
  const [listStatus, setListStatus] = useState<AcademicYearsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveAcademicYearsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: YearRow[] = apiMode ? listView.items : years;
  const [activationMeta, setActivationMeta] = useState<AcademicYearActivationMeta | null>(null);
  const [viewYearId, setViewYearId] = useState<string>("ay-2026-27");
  const [viewClass, setViewClass] = useState<string>("all");
  const [viewSection, setViewSection] = useState<string>("all");
  const [viewStatus, setViewStatus] = useState<"all" | AcademicYearRecordStatus>("all");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [form, setForm] = useState<YearForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);
  const [activateTarget, setActivateTarget] = useState<AcademicYear | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const viewRecordsRef = useRef<HTMLDivElement>(null);
  const today = todayIsoDate();

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
    void loadAcademicYearsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAcademicYearsLoad({
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
  ]);

  useEffect(() => {
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
    setDeleteTarget(null);
    setActivateTarget(null);
    setConfirmText("");
  }, [instituteCtx.activeInstituteId]);

  const listHint =
    listView.status === "loading"
      ? "Loading academic years…"
      : listView.status === "needs_institute"
        ? "Select an institute to load academic years."
        : listView.status === "forbidden"
          ? listView.errorMessage ??
            "You do not have access to academic years for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load academic years."
            : listView.status === "empty"
              ? "No academic years found for this institute."
              : null;

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const updateYears = (fn: (prev: AcademicYear[]) => AcademicYear[]) => {
    setYears((prev) => {
      const next = fn(prev);
      saveAcademicYears(next);
      const active = next.find((y) => y.status === "active");
      syncAcademicYearLocked({ locked: !active, yearLabel: active?.label });
      return next;
    });
  };

  const openYearRecords = (year: AcademicYear) => {
    setViewYearId(year.id);
    setViewClass("all");
    setViewSection("all");
    setViewStatus("all");
    notify(`Viewing records for ${year.label}`);
    requestAnimationFrame(() => {
      viewRecordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const counts = useMemo(() => {
    const rows = listView.rowsValid ? displayItems : [];
    return {
      total: rows.length,
      active: rows.filter((y) => y.status === "active").length,
      upcoming: rows.filter((y) => y.status === "upcoming").length,
      completed: rows.filter((y) => y.status === "completed" || y.status === "archived").length,
    };
  }, [displayItems, listView.rowsValid]);

  const yearRecords = useMemo(
    () => getRecordsForAcademicYear(viewYearId),
    [viewYearId],
  );

  const classOptions = useMemo(() => {
    const set = new Set(yearRecords.map((r) => r.classLabel));
    return ["all", ...Array.from(set).sort()];
  }, [yearRecords]);

  const sectionOptions = useMemo(() => {
    const scoped =
      viewClass === "all"
        ? yearRecords
        : yearRecords.filter((r) => r.classLabel === viewClass);
    const set = new Set(scoped.map((r) => r.section));
    return ["all", ...Array.from(set).sort()];
  }, [yearRecords, viewClass]);

  const filteredRecords = useMemo(() => {
    return yearRecords.filter((r) => {
      if (viewClass !== "all" && r.classLabel !== viewClass) return false;
      if (viewSection !== "all" && r.section !== viewSection) return false;
      if (viewStatus !== "all" && r.status !== viewStatus) return false;
      return true;
    });
  }, [yearRecords, viewClass, viewSection, viewStatus]);

  const viewYearLabel =
    ACADEMIC_YEAR_VIEW_OPTIONS.find((y) => y.id === viewYearId)?.label ?? viewYearId;

  const filtersSummary = useMemo(() => {
    const parts = [
      `Year ${viewYearLabel}`,
      viewClass === "all" ? "All classes" : `Class ${viewClass}`,
      viewSection === "all" ? "All sections" : `Section ${viewSection}`,
      viewStatus === "all" ? "All statuses" : viewStatus,
    ];
    return parts.join(" · ");
  }, [viewYearLabel, viewClass, viewSection, viewStatus]);

  const downloadExcel = () => {
    if (filteredRecords.length === 0) {
      notify("No records to download");
      return;
    }
    const { filename, rowCount } = downloadAcademicYearRecordsExcel(
      viewYearLabel,
      filteredRecords,
    );
    notify(`Saved to Downloads · ${filename} · ${rowCount} rows (Excel)`);
  };

  const downloadPdf = () => {
    if (filteredRecords.length === 0) {
      notify("No records to download");
      return;
    }
    const { filename, rowCount } = downloadAcademicYearRecordsPdf(
      viewYearLabel,
      filteredRecords,
      filtersSummary,
    );
    notify(`Saved to Downloads · ${filename} · ${rowCount} rows · Print → Save as PDF`);
  };

  const graceDaysLeft = useMemo(() => {
    if (!activationMeta) return null;
    const elapsed = Math.floor(
      (new Date(`${today}T00:00:00`).getTime() -
        new Date(`${activationMeta.activatedOn}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const left = ACTIVATION_GRACE_DAYS - elapsed;
    return left >= 0 ? left : null;
  }, [activationMeta, today]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal("create");
  };

  const openEdit = (year: AcademicYear) => {
    setEditing(year);
    setForm({
      label: year.label,
      startDate: year.startDate,
      endDate: year.endDate,
    });
    setModal("edit");
  };

  const saveForm = () => {
    const label = form.label.trim();
    if (!label || !form.startDate || !form.endDate) {
      notify("Fill label, start, and end dates");
      return;
    }
    if (form.endDate < form.startDate) {
      notify("End date must be on or after start date");
      return;
    }
    if (modal === "create") {
      updateYears((prev) => [
        ...prev,
        {
          id: newAcademicYearId(),
          label,
          startDate: form.startDate,
          endDate: form.endDate,
          status: "upcoming",
        },
      ]);
      notify("Academic year created as Upcoming");
    } else if (editing) {
      updateYears((prev) =>
        prev.map((y) =>
          y.id === editing.id
            ? { ...y, label, startDate: form.startDate, endDate: form.endDate }
            : y,
        ),
      );
      notify("Academic year updated");
    }
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const openActivate = (year: AcademicYear) => {
    const check = canActivateAcademicYear(year, activationMeta, today);
    if (!check.allowed) {
      notify(check.reason ?? "Cannot activate this year");
      return;
    }
    setActivateTarget(year);
    setConfirmText("");
  };

  const confirmActivate = () => {
    if (!activateTarget) return;
    if (confirmText.trim().toLowerCase() !== "confirm") {
      notify('Type "confirm" to continue');
      return;
    }
    const check = canActivateAcademicYear(activateTarget, activationMeta, today);
    if (!check.allowed) {
      notify(check.reason ?? "Cannot activate this year");
      setActivateTarget(null);
      setConfirmText("");
      return;
    }

    const previous = years.find((y) => y.status === "active") ?? null;
    updateYears((prev) =>
      prev.map((y) => {
        if (y.id === activateTarget.id) return { ...y, status: "active" as const };
        if (y.status === "active") return { ...y, status: "completed" as const };
        return y;
      }),
    );
    setActivationMeta({
      activatedYearId: activateTarget.id,
      previousYearId: previous?.id ?? null,
      activatedOn: today,
    });
    notify(`${activateTarget.label} activated`);
    setActivateTarget(null);
    setConfirmText("");
  };

  const archive = (year: AcademicYear) => {
    updateYears((prev) =>
      prev.map((y) => (y.id === year.id ? { ...y, status: "archived" as const } : y)),
    );
    notify(`${year.label} archived`);
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteTarget.status !== "upcoming") return;
    updateYears((prev) => prev.filter((y) => y.id !== deleteTarget.id));
    notify(`${deleteTarget.label} deleted`);
    setDeleteTarget(null);
  };

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Total years" value={countLabel(counts.total)} />
        <Kpi label="Active" value={countLabel(counts.active)} tone="up" />
        <Kpi label="Upcoming" value={countLabel(counts.upcoming)} />
        <Kpi label="Completed / archived" value={countLabel(counts.completed)} />
      </KpiGrid>

      {writesEnabled ? (
      <Card>
        <CardHeader
          title="Activation rules"
          hint="Frontend mock rules for academic year activation"
        />
        <CardBody className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="font-medium text-foreground">Past years</span> cannot be activated.
          </p>
          <p>
            <span className="font-medium text-foreground">Present / upcoming</span> can be
            activated only on or after the start date. Until then, Activate is hidden.
          </p>
          <p>
            <span className="font-medium text-foreground">Future years</span> can be created as
            Upcoming.
          </p>
          <p>
            After activating a new year, the{" "}
            <span className="font-medium text-foreground">previous year</span> can be activated
            again for <span className="font-medium text-foreground">{ACTIVATION_GRACE_DAYS} days</span>{" "}
            only.
            {graceDaysLeft !== null && activationMeta ? (
              <>
                {" "}
                Rollback window:{" "}
                <span className="font-medium text-foreground">
                  {graceDaysLeft} day{graceDaysLeft === 1 ? "" : "s"} left
                </span>
                .
              </>
            ) : null}
          </p>
        </CardBody>
      </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Academic years"
          hint={
            apiMode
              ? "API mode · read-only · institute academic sessions"
              : "Create future years · Activate only after start date · type confirm · View opens records below"
          }
          action={
            writesEnabled ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-3.5" /> Create Academic Year
              </Button>
            ) : undefined
          }
        />
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>
              {countLabel(displayItems.length)} year{displayItems.length === 1 ? "" : "s"}
              {writesEnabled ? ` · today ${today}` : " · API read-only"}
            </ToolbarMeta>
          </ToolbarGroup>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          {!listView.rowsValid ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {listHint ?? "Loading academic years…"}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {listHint ?? "No academic years found."}
            </div>
          ) : (
          <DataTable>
            <thead>
              <Tr>
                <Th>Academic year</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Status</Th>
                {writesEnabled ? <Th className="text-right">Actions</Th> : null}
              </Tr>
            </thead>
            <tbody>
              {displayItems.map((year) => {
                const activateCheck = writesEnabled
                  ? canActivateAcademicYear(year as AcademicYear, activationMeta, today)
                  : { allowed: false as const };
                return (
                  <Tr key={year.id}>
                    <Td className="font-medium">{year.label}</Td>
                    <Td className="text-muted-foreground tabular-nums">{year.startDate}</Td>
                    <Td className="text-muted-foreground tabular-nums">{year.endDate}</Td>
                    <Td>
                      <div className="flex flex-col gap-1 items-start">
                        {statusPill(year.status)}
                        {writesEnabled &&
                        !activateCheck.allowed &&
                        year.status !== "active" &&
                        year.status !== "archived" &&
                        activateCheck.reason ? (
                          <span className="text-[10px] text-muted-foreground max-w-[14rem]">
                            {activateCheck.reason}
                          </span>
                        ) : null}
                        {writesEnabled &&
                        activateCheck.allowed &&
                        year.status === "completed" ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 max-w-[14rem]">
                            {activateCheck.reason}
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    {writesEnabled ? (
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {ACADEMIC_YEAR_VIEW_OPTIONS.some((y) => y.id === year.id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openYearRecords(year as AcademicYear)}
                          >
                            <Eye className="size-3.5" /> View
                          </Button>
                        ) : null}
                        {year.status === "upcoming" || year.status === "active" ? (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(year as AcademicYear)}>
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                        ) : null}
                        {activateCheck.allowed ? (
                          <Button size="sm" variant="outline" onClick={() => openActivate(year as AcademicYear)}>
                            <Power className="size-3.5" /> Activate
                          </Button>
                        ) : null}
                        {year.status === "completed" || year.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => archive(year as AcademicYear)}>
                            <Archive className="size-3.5" /> Archive
                          </Button>
                        ) : null}
                        {year.status === "upcoming" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(year as AcademicYear)}
                          >
                            <Trash2 className="size-3.5 text-destructive" /> Delete
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                    ) : null}
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
          )}
        </CardBody>
      </Card>

      {writesEnabled ? (
      <div ref={viewRecordsRef} id="academic-year-records">
        <Card>
          <CardHeader
            title="Select academic year to view"
            hint="Filter by year, class, section, and status · download Excel or PDF"
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadExcel}
                  disabled={filteredRecords.length === 0}
                >
                  <FileSpreadsheet className="size-3.5" /> Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadPdf}
                  disabled={filteredRecords.length === 0}
                >
                  <Download className="size-3.5" /> PDF
                </Button>
              </div>
            }
          />
          <CardBody>
            <FormGrid cols={2}>
              <Field label="Academic year" required>
                <Select
                  value={viewYearId}
                  onChange={(e) => {
                    setViewYearId(e.target.value);
                    setViewClass("all");
                    setViewSection("all");
                  }}
                >
                  {ACADEMIC_YEAR_VIEW_OPTIONS.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Class">
                <Select
                  value={viewClass}
                  onChange={(e) => {
                    setViewClass(e.target.value);
                    setViewSection("all");
                  }}
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All classes" : c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select value={viewSection} onChange={(e) => setViewSection(e.target.value)}>
                  {sectionOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All sections" : s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={viewStatus}
                  onChange={(e) =>
                    setViewStatus(e.target.value as "all" | AcademicYearRecordStatus)
                  }
                >
                  {ACADEMIC_YEAR_RECORD_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All statuses" : s}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormGrid>
            <p className="mt-3 text-xs text-muted-foreground">
              {filtersSummary}
              {" · "}
              {filteredRecords.length} student record
              {filteredRecords.length === 1 ? "" : "s"}. Excel includes classes studied trail.
              PDF opens as HTML — use Print → Save as PDF.
            </p>
          </CardBody>
          <PageToolbar>
            <ToolbarGroup>
              <ToolbarMeta>
                <Eye className="size-3.5 inline mr-1" />
                Year records
              </ToolbarMeta>
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarMeta>{filteredRecords.length} shown</ToolbarMeta>
          </PageToolbar>
          <CardBody className="p-0 overflow-x-auto border-t border-border">
            <DataTable>
              <thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Roll No</Th>
                  <Th>Class</Th>
                  <Th>Section</Th>
                  <Th>Status</Th>
                </Tr>
              </thead>
              <tbody>
                {filteredRecords.map((row) => (
                  <Tr key={row.id}>
                    <Td className="font-medium">{row.name}</Td>
                    <Td className="tabular-nums">{row.rollNo}</Td>
                    <Td>{row.classLabel}</Td>
                    <Td>{row.section}</Td>
                    <Td>
                      <Pill tone={yearRecordStatusTone(row.status)}>{row.status}</Pill>
                    </Td>
                  </Tr>
                ))}
                {filteredRecords.length === 0 ? (
                  <Tr>
                    <Td className="text-muted-foreground py-8">
                      No records for this academic year / filters.
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
      </div>
      ) : null}

      {writesEnabled ? (
      <>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Create Academic Year" : "Edit Academic Year"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={saveForm}>Save</Button>
          </>
        }
      >
        <FormGrid cols={2}>
          <Field label="Label" className="sm:col-span-2" required>
            <TextInput
              value={form.label}
              placeholder="e.g. 2028-2029"
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <Field label="Start date" required>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </Field>
          <Field label="End date" required>
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </Field>
        </FormGrid>
        {modal === "create" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Created as <span className="font-medium text-foreground">Upcoming</span>. Activate
            appears only on or after the start date. Type <span className="font-medium">confirm</span>{" "}
            when activating.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={activateTarget !== null}
        onClose={() => {
          setActivateTarget(null);
          setConfirmText("");
        }}
        title="Activate academic year?"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setActivateTarget(null);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmActivate}
              disabled={confirmText.trim().toLowerCase() !== "confirm"}
            >
              OK
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Activate{" "}
            <span className="font-medium text-foreground">{activateTarget?.label}</span>? The
            current active year will become Completed. For {ACTIVATION_GRACE_DAYS} days you can
            activate the previous year again.
          </p>
          <Field label='Type "confirm" to continue' required>
            <TextInput
              value={confirmText}
              placeholder="confirm"
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete academic year?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Only upcoming years can be deleted. Remove{" "}
          <span className="font-medium text-foreground">{deleteTarget?.label}</span>?
        </p>
      </Modal>
      </>
      ) : null}
    </PageStack>
  );
}
