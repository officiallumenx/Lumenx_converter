import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentAttendanceMonthDelta } from "@/lib/student/mock-data";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@lumenx/ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { SectionCard } from "@/components/app/SectionCard";
import { PageSkeleton } from "@/student-portal/shared/ui";
import {
  AttendanceOverview,
  AttendanceLogSection,
} from "@/components/app/attendance/AttendanceOverview";

export function StudentAttendancePage() {
  const portal = useStudentPortal();

  const trend = useMemo(() => {
    if (!portal.isStudent || !portal.snapshot) return [];
    return portal.snapshot.attendanceTrend;
  }, [portal]);

  if (!portal.isStudent) return null;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={6} />;

  const profile = portal.snapshot.profile;
  const log = portal.snapshot.attendanceLog;

  return (
    <>
      <AttendanceOverview subtitle={`${profile.name} · ${profile.class} ${profile.section}`} />

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Weekly trend">
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
                <YAxis hide domain={[80, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
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
              studentAttendanceMonthDelta >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {studentAttendanceMonthDelta >= 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {studentAttendanceMonthDelta >= 0 ? "+" : ""}
            {studentAttendanceMonthDelta}% vs last month
          </div>
        </SectionCard>

        <AttendanceLogSection entries={log} />
      </div>
    </>
  );
}
