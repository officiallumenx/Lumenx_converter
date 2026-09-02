import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@lumenx/ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { SectionCard } from "@/components/app/SectionCard";
import { PageSkeleton } from "@/student-portal/shared/ui";
import {
  AttendanceOverview,
  AttendanceLogSection,
} from "@/components/app/attendance/AttendanceOverview";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import {
  buildLearnerAttendanceLog,
  buildLearnerAttendanceTrend,
  computeLearnerMonthAttendanceDelta,
} from "@/lib/attendance/calendar";

export function StudentAttendancePage() {
  const portal = useStudentPortal();
  const snap = portal.isStudent ? portal.snapshot : null;
  const profile = snap?.profile;
  const att = snap?.attendanceSummary;

  const studentId = useMemo(() => {
    if (!profile) return "";
    return toAttendanceStudentId({
      id: profile.id,
      classLabel: profile.class,
      section: profile.section,
      rollNo: profile.rollNo,
    });
  }, [profile]);

  const sectionKey = useMemo(() => {
    if (!profile) return "";
    return attendanceSectionKey(profile.class, profile.section);
  }, [profile]);

  const year = att?.year ?? new Date().getFullYear();
  const month = att?.month ?? new Date().getMonth();

  const trend = useMemo(() => {
    if (!studentId || !sectionKey) return [];
    return buildLearnerAttendanceTrend({ year, month, studentId, sectionKey });
  }, [year, month, studentId, sectionKey]);

  const log = useMemo(() => {
    if (!studentId || !sectionKey) return [];
    return buildLearnerAttendanceLog({ year, month, studentId, sectionKey });
  }, [year, month, studentId, sectionKey]);

  const monthDelta = useMemo(() => {
    if (att?.monthDelta != null) return att.monthDelta;
    if (!studentId || !sectionKey) return 0;
    return computeLearnerMonthAttendanceDelta({ year, month, studentId, sectionKey });
  }, [att?.monthDelta, year, month, studentId, sectionKey]);

  const trendDomain = useMemo(() => {
    if (trend.length === 0) return [0, 100] as [number, number];
    const values = trend.map((t) => t.pct);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    return [Math.max(0, min - 5), Math.min(100, max + 5)] as [number, number];
  }, [trend]);

  if (!portal.isStudent) return null;
  if (portal.isLoading || !snap || !profile || !att) return <PageSkeleton rows={6} />;

  return (
    <>
      <AttendanceOverview
        subtitle={`${profile.name} · ${profile.class} ${profile.section}`}
        studentId={studentId}
        sectionKey={sectionKey}
        portalStudentId={profile.id}
        initialYear={att.year}
        initialMonth={att.month}
      />

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Weekly trend">
          {trend.length ? (
            <>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="att-g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis hide domain={trendDomain} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pct"
                      stroke="oklch(0.55 0.22 260)"
                      strokeWidth={2}
                      fill="url(#att-g)"
                      isAnimationActive={!prefersReducedMotion()}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-xs font-medium",
                  monthDelta >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {monthDelta >= 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {monthDelta >= 0 ? "+" : ""}
                {monthDelta}% vs last month
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No marked attendance yet this month.
            </p>
          )}
        </SectionCard>

        {log.length ? (
          <AttendanceLogSection entries={log} />
        ) : (
          <SectionCard title="Recent log">
            <p className="text-sm text-muted-foreground">
              No register marks yet this month.
            </p>
          </SectionCard>
        )}
      </div>
    </>
  );
}
