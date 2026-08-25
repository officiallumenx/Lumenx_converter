/**
 * Attendance Configuration History — read-only Effective From timeline.
 * Append-only versions; historical marks / reports never rewritten.
 */

import { Card, CardBody, CardHeader, Pill } from "@lumenx/ui-admin";
import { CalendarClock, ClipboardList, ShieldCheck } from "lucide-react";
import {
  attendanceMethodLabel,
  attendanceOwnerLabel,
  attendanceScopeLabel,
  buildConfigHistoryTimeline,
  type AttendanceConfigVersion,
} from "@/lib/attendance-config-store";
import {
  applicabilityLabel,
  scopeTargetsLabel,
  statusForVersion,
  todayIso,
} from "@/lib/attendance-config-labels";

export type AttendanceConfigurationHistoryProps = {
  versions: AttendanceConfigVersion[];
  /** @deprecated Scoped Active is resolved per version; ignored. */
  activeId?: string | null;
};

/**
 * Configuration History panel.
 * Example chain: June Morning + Afternoon → September Period Wise.
 */
export function AttendanceConfigurationHistory({
  versions,
}: AttendanceConfigurationHistoryProps) {
  const today = todayIso();
  const timeline = buildConfigHistoryTimeline(versions);

  return (
    <Card>
      <CardHeader
        title="Configuration History"
        hint="Every version has Effective From · past marks never change"
      />
      <CardBody className="space-y-4 p-0">
        <div className="border-b border-border px-5 py-3 space-y-2">
          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            Changing Attendance Method appends a new version only. Submitted registers freeze
            method, owner, and config version — Attendance % and Working Days stay correct for
            historical ranges.
          </p>
          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
            Example: June → Morning + Afternoon · September → Period Wise. Reports spanning both
            months keep each day under its own frozen method. Scoped (class/section) versions show
            Active when they still resolve for their targets.
          </p>
        </div>

        {timeline.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No configurations yet. Save a configuration with an Effective From date.
          </p>
        ) : (
          <ol className="relative divide-y divide-border">
            {timeline.map((entry, index) => {
              const { version: row, appliesFrom, appliesTo } = entry;
              const status = statusForVersion(row, today);
              const isLast = index === timeline.length - 1;
              return (
                <li key={row.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                    {!isLast ? (
                      <span
                        className="mt-1 w-px flex-1 min-h-[1.25rem] bg-border"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Effective {row.effectiveFrom}
                      </span>
                      {status === "active" ? (
                        <Pill tone="success">Active</Pill>
                      ) : status === "upcoming" ? (
                        <Pill tone="info">Upcoming</Pill>
                      ) : (
                        <Pill tone="neutral">Historical</Pill>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-foreground">
                      {attendanceMethodLabel(row.method)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {applicabilityLabel(appliesFrom, appliesTo)}
                      {" · "}
                      {attendanceOwnerLabel(row.owner)}
                      {" · "}
                      {attendanceScopeLabel(row.scope)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {scopeTargetsLabel(row)}
                      {" · Saved "}
                      {new Date(row.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" by "}
                      {row.createdBy}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
