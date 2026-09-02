import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  Kpi,
  PageStack,
  Pill,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { AttendanceHubView } from "@/routes/attendance";
import { useInstituteContext } from "@/lib/institutes";
import { listClassesCatalog } from "@/lib/classes/api";
import { classLabelForSection } from "@/lib/classes/map";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import {
  loadAttendanceRegistersList,
  resolveAttendanceRegistersListView,
  shouldCommitAttendanceRegistersLoad,
  type AttendanceListStatus,
  type AttendanceRegisterListItem,
} from "@/lib/attendance";
import { loadAnalyticsSeries, type AnalyticsSeriesDto } from "@/lib/analytics";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

function attendanceHint(
  status: AttendanceListStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading attendance registers…";
  if (status === "needs_institute") return "Select an institute to load attendance.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to attendance for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load attendance.";
  if (status === "empty") return "No attendance registers found.";
  return null;
}

function sectionLabel(
  item: AttendanceRegisterListItem,
  sectionsById: Map<string, SectionDto>,
  classesById: Map<string, ClassDto>,
): string {
  const section = sectionsById.get(item.sectionId);
  if (!section) return `Section · ${item.sectionId.slice(0, 8)}`;
  return classLabelForSection(section, classesById);
}

function presentRate(item: AttendanceRegisterListItem): number {
  if (item.totalMarks === 0) return 0;
  return Math.round((item.presentCount / item.totalMarks) * 100);
}

function useAttendanceHubRegisters(dateFilter: string | undefined) {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const requestKey = dateFilter ?? "all";
  const [items, setItems] = useState<AttendanceRegisterListItem[]>([]);
  const [status, setStatus] = useState<AttendanceListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const [sectionsById, setSectionsById] = useState<Map<string, SectionDto>>(new Map());
  const [classesById, setClassesById] = useState<Map<string, ClassDto>>(new Map());

  const listView = resolveAttendanceRegistersListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: resolvedKey?.split("|")[0] ?? null,
    storedItems: items,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setSectionsById(new Map());
      setClassesById(new Map());
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void listClassesCatalog({ instituteId }).then((catalog) => {
      if (cancelled) return;
      setClassesById(new Map(catalog.classes.map((cls) => [cls.id, cls])));
      setSectionsById(new Map(catalog.sections.map((section) => [section.id, section])));
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setItems([]);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedKey(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestKey = `${requestInstituteId}|${dateFilter ?? "all"}`;
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    void loadAttendanceRegistersList(requestInstituteId, {
      attendanceDate: dateFilter,
    }).then((next) => {
      if (
        !shouldCommitAttendanceRegistersLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
          requestKey,
          activeKey: activeInstituteIdRef.current
            ? `${activeInstituteIdRef.current}|${dateFilter ?? "all"}`
            : null,
        })
      ) {
        return;
      }
      setItems(next.items);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedKey(requestKey);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, dateFilter]);

  return { listView, sectionsById, classesById };
}

function RegistersTable({
  items,
  sectionsById,
  classesById,
}: {
  items: AttendanceRegisterListItem[];
  sectionsById: Map<string, SectionDto>;
  classesById: Map<string, ClassDto>;
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Section</Th>
          <Th>Date</Th>
          <Th>Slot</Th>
          <Th>Present</Th>
          <Th>Absent</Th>
          <Th>Leave</Th>
          <Th>Rate</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((row) => (
          <Tr key={row.id}>
            <Td className="font-medium">{sectionLabel(row, sectionsById, classesById)}</Td>
            <Td className="font-mono text-xs">{row.attendanceDate}</Td>
            <Td className="text-xs text-muted-foreground">{row.slotLabel}</Td>
            <Td className="tabular-nums">{row.presentCount}</Td>
            <Td className="tabular-nums">{row.absentCount}</Td>
            <Td className="tabular-nums">{row.leaveCount}</Td>
            <Td className="tabular-nums">{presentRate(row)}%</Td>
            <Td>
              <Pill tone={row.status === "submitted" ? "success" : "warning"}>{row.status}</Pill>
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function MonitorView() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { listView, sectionsById, classesById } = useAttendanceHubRegisters(today);
  const hint = attendanceHint(listView.status, listView.errorMessage);

  const draftCount = listView.items.filter((item) => item.status === "draft").length;
  const submittedCount = listView.items.filter((item) => item.status === "submitted").length;

  return (
    <PageStack>
      <Pill tone="neutral">Read-only · API mode</Pill>
      <div className="lx-kpi-grid">
        <Kpi
          label="Submitted today"
          value={String(submittedCount)}
          tone="up"
          icon={<CheckCircle2 className="size-3.5" />}
        />
        <Kpi
          label="Not submitted"
          value={String(draftCount)}
          tone={draftCount > 0 ? "down" : undefined}
          icon={<AlertTriangle className="size-3.5" />}
        />
        <Kpi label="Total registers" value={String(listView.items.length)} />
      </div>
      <Card>
        <CardHeader
          title="Today's registers"
          hint={hint ?? `${listView.items.length} section registers for ${today}`}
          action={
            <Link to="/student-attendance" className="text-xs font-medium text-primary hover:underline">
              Open student {M.attendance.toLowerCase()}
            </Link>
          }
        />
        {!listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</div>
        ) : listView.items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{hint}</div>
        ) : (
          <RegistersTable items={listView.items} sectionsById={sectionsById} classesById={classesById} />
        )}
      </Card>
    </PageStack>
  );
}

function ReportsView() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { listView, sectionsById, classesById } = useAttendanceHubRegisters(date);
  const hint = attendanceHint(listView.status, listView.errorMessage);

  return (
    <PageStack>
      <Pill tone="neutral">Read-only · API mode · tabular reports</Pill>
      <Card>
        <CardHeader title="Attendance reports" hint={hint ?? "Registers for selected date"} />
        <div className="border-b border-border px-4 pb-3 sm:px-5">
          <CascadingFiltersMenu
            groups={[
              {
                id: "date",
                label: "Date",
                kind: "date",
                value: date,
                clearValues: [date],
                onChange: setDate,
              },
            ]}
          />
        </div>
        {!listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</div>
        ) : listView.items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{hint}</div>
        ) : (
          <RegistersTable items={listView.items} sectionsById={sectionsById} classesById={classesById} />
        )}
      </Card>
    </PageStack>
  );
}

function AnalyticsView() {
  const { activeInstituteId } = useInstituteContext();
  const { listView, sectionsById, classesById } = useAttendanceHubRegisters(undefined);
  const hint = attendanceHint(listView.status, listView.errorMessage);
  const [series, setSeries] = useState<AnalyticsSeriesDto | null>(null);

  useEffect(() => {
    if (!activeInstituteId) {
      setSeries(null);
      return;
    }
    let cancelled = false;
    void loadAnalyticsSeries(activeInstituteId, "year").then((result) => {
      if (cancelled) return;
      setSeries(result.series);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let marks = 0;
    for (const item of listView.items) {
      present += item.presentCount;
      absent += item.absentCount;
      leave += item.leaveCount;
      marks += item.totalMarks;
    }
    const rate = marks === 0 ? 0 : Math.round((present / marks) * 100);
    return { present, absent, leave, marks, rate, registers: listView.items.length };
  }, [listView.items]);

  const lowSections = useMemo(() => {
    const bySection = new Map<
      string,
      { label: string; present: number; total: number }
    >();
    for (const item of listView.items) {
      const label = sectionLabel(item, sectionsById, classesById);
      const bucket = bySection.get(item.sectionId) ?? { label, present: 0, total: 0 };
      bucket.present += item.presentCount;
      bucket.total += item.totalMarks;
      bySection.set(item.sectionId, bucket);
    }
    return [...bySection.values()]
      .map((row) => ({
        ...row,
        rate: row.total === 0 ? 0 : Math.round((row.present / row.total) * 100),
      }))
      .filter((row) => row.total > 0 && row.rate < 90)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 12);
  }, [listView.items, sectionsById, classesById]);

  const monthly = series?.attendanceMonthly ?? [];
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.markCount));

  return (
    <PageStack>
      <Pill tone="neutral">Read-only · API mode · institute-wide aggregates</Pill>
      <div className="lx-kpi-grid">
        <Kpi label="Overall rate" value={`${totals.rate}%`} tone="up" icon={<ClipboardCheck className="size-3.5" />} />
        <Kpi label="Present marks" value={String(totals.present)} />
        <Kpi label="Absent marks" value={String(totals.absent)} tone="down" />
        <Kpi label="Registers loaded" value={String(totals.registers)} />
      </div>

      <Card>
        <CardHeader
          title="Monthly attendance marks"
          hint={
            monthly.length === 0
              ? "No monthly series yet from GET /api/v1/analytics/series"
              : "From institute analytics series"
          }
        />
        {monthly.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No attendance marks in the selected analytics range.
          </div>
        ) : (
          <div className="flex items-end gap-1.5 px-5 pb-5 h-40">
            {monthly.map((row) => (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, (row.markCount / maxMonthly) * 100)}%` }}
                  title={`${row.month}: ${row.markCount} marks · ${row.presentPct ?? "—"}% present`}
                />
                <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                  {row.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Low attendance sections"
          hint={
            hint ??
            (lowSections.length === 0
              ? "No sections below 90% in loaded registers"
              : `${lowSections.length} sections below 90%`)
          }
        />
        {!listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</div>
        ) : lowSections.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listView.items.length === 0 ? hint : "No sections below 90% in loaded registers."}
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Section</Th>
                <Th>Present</Th>
                <Th>Total marks</Th>
                <Th>Rate</Th>
              </tr>
            </thead>
            <tbody>
              {lowSections.map((row) => (
                <Tr key={row.label}>
                  <Td className="font-medium">{row.label}</Td>
                  <Td className="tabular-nums">{row.present}</Td>
                  <Td className="tabular-nums">{row.total}</Td>
                  <Td>
                    <Pill tone={row.rate < 80 ? "danger" : "warning"}>{row.rate}%</Pill>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </PageStack>
  );
}

export function AttendanceHubApiView({ view }: { view: AttendanceHubView }) {
  if (view === "monitor") return <MonitorView />;
  if (view === "reports") return <ReportsView />;
  return <AnalyticsView />;
}
