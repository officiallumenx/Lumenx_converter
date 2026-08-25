/**
 * Attendance Reports — tabular report builders only (no charts).
 * Exports live in Reporting Center.
 */

import { Link } from "@tanstack/react-router";
import { Card, CardHeader, PageStack, Pill, CascadingFiltersMenu } from "@lumenx/ui-admin";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  ATTENDANCE_REPORT_KIND_OPTIONS,
  attendanceWeekBounds,
  buildAttendanceReportByKind,
  type AttendanceReportKind,
  type AttendanceReportBundle,
} from "@lumenx/module-attendance";
import {
  attendanceReportRangeDefaults,
  listAttendanceReportSections,
} from "@/lib/attendance-report-demo";
import { useMemo, useState } from "react";

function emptyHint(kind: AttendanceReportKind) {
  if (kind === "teacher") {
    return "No submitted registers in this range yet.";
  }
  return "No rows for this report in the selected range.";
}

function ReportTable({ bundle }: { bundle: AttendanceReportBundle }) {
  if (bundle.rows.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">{emptyHint(bundle.kind)}</p>;
  }

  switch (bundle.kind) {
    case "daily":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 pr-3 font-medium">Leave</th>
                <th className="py-2 pr-3 font-medium">Rate</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.sectionKey}>
                  <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{r.date}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.leave}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.rate}%</td>
                  <td className="py-2.5">
                    <Pill tone={r.incomplete ? "warning" : r.workingDay ? "success" : "neutral"}>
                      {r.incomplete ? "Incomplete" : r.workingDay ? "Ready" : "Non-working"}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "monthly":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 pr-3 font-medium">Month</th>
                <th className="py-2 pr-3 font-medium">Working days</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 pr-3 font-medium">Rate</th>
                <th className="py-2 font-medium">Incomplete days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.sectionKey}>
                  <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{r.month}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.workingDays}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.rate}%</td>
                  <td className="py-2.5 tabular-nums">{r.incompleteDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "weekly":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 pr-3 font-medium">Week</th>
                <th className="py-2 pr-3 font-medium">Working days</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 pr-3 font-medium">Rate</th>
                <th className="py-2 font-medium">Incomplete days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.sectionKey}>
                  <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{r.week}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.workingDays}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.rate}%</td>
                  <td className="py-2.5 tabular-nums">{r.incompleteDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "student":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 pr-3 font-medium">Leave</th>
                <th className="py-2 pr-3 font-medium">Expected</th>
                <th className="py-2 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={`${r.sectionKey}:${r.studentId}`}>
                  <td className="py-2.5 pr-3 font-medium">{r.studentName}</td>
                  <td className="py-2.5 pr-3">{r.label}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.leave}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.expected}</td>
                  <td className="py-2.5 tabular-nums">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "teacher":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Teacher</th>
                <th className="py-2 pr-3 font-medium">Submissions</th>
                <th className="py-2 pr-3 font-medium">Sections</th>
                <th className="py-2 pr-3 font-medium">Absent marks</th>
                <th className="py-2 pr-3 font-medium">Leave marks</th>
                <th className="py-2 font-medium">Last submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.teacherId}>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium">{r.teacherName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{r.teacherId}</div>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.submissions}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.sections}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absentMarks}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.leaveMarks}</td>
                  <td className="py-2.5 font-mono text-xs">
                    {r.lastSubmittedAt.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "class":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Class</th>
                <th className="py-2 pr-3 font-medium">Sections</th>
                <th className="py-2 pr-3 font-medium">Working days</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.classLabel}>
                  <td className="py-2.5 pr-3 font-medium">Grade {r.classLabel}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.sections}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.workingDays}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 tabular-nums">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "section":
      return (
        <div className="overflow-x-auto px-3 pb-4 sm:px-5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 pr-3 font-medium">Working days</th>
                <th className="py-2 pr-3 font-medium">Present</th>
                <th className="py-2 pr-3 font-medium">Absent</th>
                <th className="py-2 pr-3 font-medium">Rate</th>
                <th className="py-2 pr-3 font-medium">Incomplete</th>
                <th className="py-2 font-medium">Method segments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundle.rows.map((r) => (
                <tr key={r.sectionKey}>
                  <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.workingDays}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.present}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.absent}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.rate}%</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.incompleteDays}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {r.methodSegments || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function AttendanceReportsView() {
  const defaults = useMemo(() => attendanceReportRangeDefaults(), []);
  const sections = useMemo(() => listAttendanceReportSections(), []);
  const [kind, setKind] = useState<AttendanceReportKind>("daily");
  const [from, setFrom] = useState(defaults.monthStart);
  const [to, setTo] = useState(defaults.to);

  const selectKind = (next: AttendanceReportKind) => {
    setKind(next);
    if (next === "daily") {
      setFrom(defaults.to);
      setTo(defaults.to);
      return;
    }
    if (next === "weekly") {
      const week = attendanceWeekBounds(defaults.to);
      setFrom(week.from);
      setTo(week.to);
      return;
    }
    if (next === "monthly") {
      setFrom(defaults.monthStart);
      setTo(defaults.to);
      return;
    }
    setFrom(defaults.monthStart);
    setTo(defaults.to);
  };

  const kindMeta = ATTENDANCE_REPORT_KIND_OPTIONS.find((o) => o.value === kind);

  const bundle = useMemo(
    () =>
      buildAttendanceReportByKind(kind, {
        sections,
        from,
        to,
        date: to,
      }),
    [kind, sections, from, to],
  );

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Attendance Reports"
          hint="Tabular only · Daily · Weekly · Monthly · Student · Teacher · Class · Section"
          action={
            <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
              Open {M.reports}
            </Link>
          }
        />
        <div className="space-y-4 px-4 pb-5 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Reports are tables and exports. Charts and insight lists live under{" "}
            <Link
              to="/attendance"
              search={{ view: "analytics" }}
              className="font-medium text-primary hover:underline"
            >
              Analytics
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ATTENDANCE_REPORT_KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectKind(opt.value)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  kind === opt.value
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{kindMeta?.description}</p>
          <CascadingFiltersMenu
            groups={[
              {
                id: "from",
                label: "From",
                kind: "date",
                value: from,
                clearValues: [from],
                onChange: setFrom,
              },
              {
                id: "to",
                label: kind === "daily" ? "Date" : "To",
                kind: "date",
                value: to,
                clearValues: [to],
                onChange: setTo,
              },
              {
                id: "scope",
                label: "Scope",
                value: "directory",
                clearValues: ["directory"],
                onChange: () => undefined,
                options: [
                  {
                    value: "directory",
                    label: `All directory sections (${sections.length})`,
                  },
                ],
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`${kindMeta?.label ?? "Report"} results`}
          hint={`${bundle.rows.length} row${bundle.rows.length === 1 ? "" : "s"} · ${from} → ${to}`}
          action={<Pill tone="info">{kind}</Pill>}
        />
        <ReportTable bundle={bundle} />
      </Card>
    </PageStack>
  );
}
