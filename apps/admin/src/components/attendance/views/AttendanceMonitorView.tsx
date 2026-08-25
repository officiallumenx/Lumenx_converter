import {
  AdminChartTooltip,
  CHART_HEIGHT,
  ChartCard,
  ChartLegendRow,
  axisTick,
  gridStroke,
} from "@/components/analytics/chart-utils";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  Modal,
  PageStack,
  Pill,
  Select,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { getAttendanceModuleAccess } from "@/lib/attendance-coordinator-access";
import { loadAttendancePendingFromRegisters } from "@/lib/attendance-pending";
import { listAttendanceReportSections } from "@/lib/attendance-report-demo";
import {
  academicYearMonthsToPresent,
  buildClassAttendanceBars,
  buildMonthlyBarsForSection,
  computeInstituteMonthRate,
  countStatusBuckets,
  presentAcademicYearStart,
  statusLabel,
  statusTone,
} from "@/lib/attendance-monitor";
import {
  pushPrincipalAttendanceAlert,
  summarizeAttendancePendingByTeacher,
} from "@lumenx/utils";
import {
  NOTIFICATION_TEMPLATE_IDS,
  renderNotificationTemplate,
} from "@lumenx/notifications";
import { prependAdminNotification } from "@/lib/notification-center-store";
import { AlertTriangle, BellRing, CheckCircle2, ClipboardCheck, Siren } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function AttendanceMonitorView() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const access = useMemo(() => getAttendanceModuleAccess(user), [user]);
  const academicYear = useMemo(() => presentAcademicYearStart(), []);
  const academicMonths = useMemo(() => academicYearMonthsToPresent(), []);
  const sections = useMemo(() => listAttendanceReportSections(), []);
  const [monthKey, setMonthKey] = useState(
    () => academicMonths[academicMonths.length - 1]?.key ?? "",
  );
  const [classFilter, setClassFilter] = useState("all");
  const [alertOpen, setAlertOpen] = useState(false);

  const pendingToday = useMemo(() => loadAttendancePendingFromRegisters(), []);
  const pendingByTeacher = useMemo(
    () => summarizeAttendancePendingByTeacher(pendingToday),
    [pendingToday],
  );

  const selectedMonth =
    academicMonths.find((m) => m.key === monthKey) ??
    academicMonths[academicMonths.length - 1]!;

  const classes = useMemo(
    () =>
      sections.map((s) => s.displayLabel ?? `${s.classLabel}-${s.section}`),
    [sections],
  );

  const classBars = useMemo(
    () => buildClassAttendanceBars(sections, selectedMonth.key, academicMonths),
    [sections, selectedMonth, academicMonths],
  );

  const visibleClassBars =
    classFilter === "all" ? classBars : classBars.filter((row) => row.key === classFilter);

  const focusClass = classFilter === "all" ? "" : classFilter;

  // When a class is selected: bars from AY start through selected month.
  const monthsThroughSelected = useMemo(() => {
    const endIdx = academicMonths.findIndex((m) => m.key === selectedMonth.key);
    if (endIdx < 0) return academicMonths;
    return academicMonths.slice(0, endIdx + 1);
  }, [academicMonths, selectedMonth.key]);

  const monthlyBars = useMemo(() => {
    if (!focusClass) return [];
    const section = sections.find(
      (s) => (s.displayLabel ?? `${s.classLabel}-${s.section}`) === focusClass,
    );
    if (!section) return [];
    return buildMonthlyBarsForSection(section, monthsThroughSelected);
  }, [focusClass, monthsThroughSelected, sections]);

  const statusCounts = useMemo(() => countStatusBuckets(classBars), [classBars]);

  const instituteRate = useMemo(
    () => computeInstituteMonthRate(sections, selectedMonth.key),
    [sections, selectedMonth.key],
  );

  const rangeLabel = monthsThroughSelected.length
    ? `${monthsThroughSelected[0]!.shortLabel} → ${selectedMonth.shortLabel}`
    : selectedMonth.shortLabel;

  const sendNotSubmittedAlerts = () => {
    if (!access.canMonitor) {
      notify("View Only — monitor actions are disabled for this role");
      return;
    }
    if (pendingByTeacher.length === 0) return;
    const totalPending = pendingByTeacher.reduce((a, t) => a + t.pendingCount, 0);
    const teacherTemplate = NOTIFICATION_TEMPLATE_IDS.attendance.teacher.pendingSubmit;
    const teacherRendered = renderNotificationTemplate({
      templateId: teacherTemplate,
      variables: {
        pendingCount: totalPending,
        pendingPlural: totalPending === 1 ? "" : "es",
      },
    });
    const alert = pushPrincipalAttendanceAlert({
      recipients: pendingByTeacher,
      title: teacherRendered.title,
      body: teacherRendered.body,
      href: "/attendance",
      templateId: teacherTemplate,
    });
    const adminTemplate = NOTIFICATION_TEMPLATE_IDS.attendance.admin.pendingSubmit;
    const adminRendered = renderNotificationTemplate({
      templateId: adminTemplate,
      variables: {
        teacherCount: pendingByTeacher.length,
        teacherPlural: pendingByTeacher.length === 1 ? "" : "s",
        pendingCount: totalPending,
        pendingPlural: totalPending === 1 ? "" : "es",
      },
    });
    prependAdminNotification({
      id: alert?.id ?? `paa-admin-${Date.now()}`,
      title: adminRendered.title,
      desc: adminRendered.body,
      time: "Just now",
      unread: true,
      createdAt: new Date().toISOString(),
      type: "warning",
      priority: "high",
      href: "/attendance",
      category: "attendance",
      templateId: adminTemplate,
      detail: pendingByTeacher
        .map((t) => `${t.teacherName}: ${t.pendingCount} class(es) — ${t.classLabels.join(", ")}`)
        .join("\n"),
    });
    setAlertOpen(false);
    if (!alert) return;
    notify(
      `“Attendance Not Submitted” sent to ${pendingByTeacher.length} teacher${pendingByTeacher.length === 1 ? "" : "s"}`,
    );
  };

  return (
    <>
      <PageStack>
        {pendingToday.length > 0 ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader
              title="Attendance Not Submitted"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!access.canMonitor}
                  onClick={() => setAlertOpen(true)}
                >
                  <BellRing className="size-3.5" /> Notify teachers
                </Button>
              }
            />
            <div className="space-y-2 px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                Teachers own attendance. Admin monitors only — cannot edit marks.
                {!access.canMonitor
                  ? " Principal is View Only (notify disabled)."
                  : " Notify classes still waiting today."}
                {pendingToday.length > 0
                  ? ` · ${pendingToday.length} class${pendingToday.length === 1 ? "" : "es"} pending`
                  : ""}
              </p>
              <ul className="divide-y divide-border rounded-lg border border-border bg-background/40">
                {pendingToday.map((row) => (
                  <li
                    key={`${row.classId}:${row.date}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{row.classLabel}</div>
                      <div className="text-[11px] text-muted-foreground">{row.teacherName}</div>
                    </div>
                    <Pill tone="warning">Not submitted</Pill>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ) : null}

        <div className="lx-kpi-grid">
          <Kpi
            label="Not submitted today"
            value={String(pendingToday.length)}
            delta="Teacher-owned"
            tone={pendingToday.length > 0 ? "down" : "up"}
            icon={<Siren className="size-4" />}
          />
          <Kpi
            label="Institute rate"
            value={`${instituteRate}%`}
            delta={selectedMonth.shortLabel}
            tone={instituteRate >= 90 ? "up" : "down"}
            icon={<ClipboardCheck className="size-4" />}
          />
          <Kpi
            label="On track"
            value={String(statusCounts.good)}
            delta="≥ 90%"
            tone="up"
            icon={<CheckCircle2 className="size-4" />}
          />
          <Kpi
            label="Critical classes"
            value={String(statusCounts.critical)}
            delta="< 80%"
            tone="down"
            icon={<AlertTriangle className="size-4" />}
          />
        </div>

        <div className="flex flex-nowrap items-end gap-3">
          <div className="min-w-0 w-[11rem] shrink-0 sm:w-[13rem]">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Month
            </label>
            <Select
              value={selectedMonth.key}
              onChange={(e) => setMonthKey(e.target.value)}
              className="h-9 w-full text-xs"
            >
              {academicMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 w-[11rem] shrink-0 sm:w-[13rem]">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Class
            </label>
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 w-full text-xs"
            >
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="hidden min-w-0 flex-1 items-center gap-2 pb-1.5 sm:flex">
            <Pill tone="success">On track ≥ 90%</Pill>
            <Pill tone="warning">Watch 80–89%</Pill>
            <Pill tone="danger">Critical &lt; 80%</Pill>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <ChartCard
            className="xl:col-span-3"
            title={focusClass ? `${focusClass} · monthly attendance` : "Class attendance"}
            hint={
              focusClass
                ? `${academicYear.label} · ${rangeLabel} · one bar per month`
                : `${selectedMonth.label} · average rate by class · select a class for year-to-date`
            }
          >
            <div style={{ width: "100%", height: CHART_HEIGHT + 48 }}>
              <ResponsiveContainer>
                <BarChart
                  data={focusClass ? monthlyBars : visibleClassBars}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey={focusClass ? "label" : "name"}
                    tick={axisTick}
                    interval={0}
                    angle={focusClass && monthlyBars.length > 8 ? -30 : 0}
                    textAnchor={focusClass && monthlyBars.length > 8 ? "end" : "middle"}
                    height={focusClass && monthlyBars.length > 8 ? 48 : 28}
                  />
                  <YAxis
                    domain={[60, 100]}
                    tick={axisTick}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip
                    content={
                      <AdminChartTooltip formatter={(_name, value) => `${value}%`} />
                    }
                  />
                  <ReferenceLine y={90} stroke="var(--success)" strokeDasharray="4 4" />
                  <ReferenceLine y={80} stroke="var(--warning)" strokeDasharray="4 4" />
                  <Bar
                    dataKey="rate"
                    name="Attendance"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  >
                    {focusClass
                      ? monthlyBars.map((row) => (
                          <Cell key={row.key} fill={row.fill} />
                        ))
                      : visibleClassBars.map((row) => (
                          <Cell key={row.key} fill={row.fill} />
                        ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegendRow
              items={[
                { label: "On track", color: "var(--success)" },
                { label: "Needs attention", color: "var(--warning)" },
                { label: "Critical", color: "var(--destructive)" },
              ]}
            />
          </ChartCard>

          <Card className="xl:col-span-2">
            <CardHeader
              title="Class status"
              hint={`${selectedMonth.shortLabel} · tap a class`}
            />
            <div className="space-y-1.5 px-3 pb-4 sm:px-4">
              {classBars.map((row) => {
                const active = focusClass === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setClassFilter(row.key)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-surface hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{row.fullName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.students} · {row.trend}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold">{row.rate}%</span>
                        <Pill tone={statusTone(row.status)}>{statusLabel(row.status)}</Pill>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${row.rate}%`, background: row.fill }}
                      />
                    </div>
                  </button>
                );
              })}
              {classFilter !== "all" && (
                <button
                  type="button"
                  className="w-full pt-0.5 text-center text-[10px] font-medium text-primary hover:underline"
                  onClick={() => setClassFilter("all")}
                >
                  Show all classes
                </button>
              )}
            </div>
          </Card>
        </div>

        {focusClass && (
          <Card>
            <CardHeader
              title={`${focusClass} · year to date`}
              hint={`${monthsThroughSelected[0]?.shortLabel ?? ""} → ${selectedMonth.shortLabel} · ${academicYear.label}`}
            />
            <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4 lg:grid-cols-6">
              {monthlyBars.map((row) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-border bg-surface px-3 py-3 text-center"
                >
                  <div className="text-[11px] text-muted-foreground">{row.label}</div>
                  <div className="mt-1 font-mono text-lg font-semibold" style={{ color: row.fill }}>
                    {row.rate}%
                  </div>
                  <div className="mt-2">
                    <Pill tone={statusTone(row.status)}>{statusLabel(row.status)}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </PageStack>

      <Modal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Attendance Not Submitted"
        subtitle="Notify teachers who have not submitted today’s attendance"
        size="md"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={sendNotSubmittedAlerts}
              disabled={pendingByTeacher.length === 0}
            >
              <BellRing className="size-3.5" /> Send notifications ({pendingByTeacher.length})
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {pendingByTeacher.length === 0 ? (
            <p className="text-sm text-muted-foreground">All classes submitted for today.</p>
          ) : (
            <ul className="max-h-64 space-y-1 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {pendingByTeacher.map((t) => (
                <li
                  key={t.teacherId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.teacherName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.classLabels.join(", ")}
                    </div>
                  </div>
                  <Pill tone="warning">
                    {t.pendingCount} class{t.pendingCount === 1 ? "" : "es"}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

export { AttendanceMonitorView };
