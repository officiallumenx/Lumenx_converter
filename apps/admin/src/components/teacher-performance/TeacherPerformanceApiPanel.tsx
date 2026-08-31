import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, Kpi, Pill, Button } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  computeDepartmentRankings,
  computeInstituteAverage,
  findTopRatedTeacher,
  formatRating,
  instituteTrendDelta,
  loadTeacherPerformanceList,
  resolveTeacherPerformanceListView,
  shouldCommitTeacherPerformanceLoad,
  trendTone,
  type TeacherPerformanceDto,
  type TeacherPerformanceLoadStatus,
  type TeacherPerformanceSummary,
} from "@/lib/teacher-performance";
import { Award, FileDown, TrendingUp } from "lucide-react";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

function statusHint(status: TeacherPerformanceLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading teacher performance…";
  if (status === "needs_institute") return "Select an institute to load rankings.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load teacher performance.";
  if (status === "empty") return "No teachers found for this institute.";
  return "";
}

export function TeacherPerformanceApiPanel() {
  const instituteCtx = useInstituteContext();
  const [rows, setRows] = useState<TeacherPerformanceDto[]>([]);
  const [summary, setSummary] = useState<TeacherPerformanceSummary | null>(null);
  const [loadStatus, setLoadStatus] = useState<TeacherPerformanceLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setRows([]);
      setSummary(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setRows([]);
      setSummary(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setRows([]);
      setSummary(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadTeacherPerformanceList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTeacherPerformanceLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setRows(next.rows);
      setSummary(next.summary);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage]);

  const view = resolveTeacherPerformanceListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedRows: rows,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const deptRankings = useMemo(
    () => computeDepartmentRankings(view.rows),
    [view.rows],
  );
  const instituteAvg = computeInstituteAverage(view.rows, summary);
  const topRated = findTopRatedTeacher(view.rows);
  const trendDelta = instituteTrendDelta(summary);
  const monthlyTrend = summary?.monthlyTrend ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to="/reports">
          <Button variant="outline">
            <FileDown className="size-3.5" /> {M.reports}
          </Button>
        </Link>
      </div>

      <div className="lx-kpi-grid">
        <Kpi
          label="Institute avg"
          value={instituteAvg}
          delta={trendDelta ?? undefined}
          tone={trendDelta?.startsWith("+") ? "up" : trendDelta?.startsWith("-") ? "down" : undefined}
          icon={<TrendingUp className="size-3.5" />}
        />
        <Kpi
          label="Top rated"
          value={topRated?.name.split(" ")[0] ?? "—"}
          delta={topRated ? formatRating(topRated.rating) : undefined}
          tone="up"
          icon={<Award className="size-3.5" />}
        />
        <Kpi label="Departments" value={String(deptRankings.length)} />
        <Kpi
          label="Faculty count"
          value={String(summary?.facultyCount ?? view.rows.length)}
          delta={
            summary?.ratedCount != null
              ? `${summary.ratedCount} rated`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader
            title="Monthly rankings"
            hint="Operational Performance Index (OPI) from attendance, marks, homework, diary & class attendance"
            action={<Pill tone="neutral">API mode</Pill>}
          />
          {hint ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                      <th className="px-5 py-3 font-semibold">Rank</th>
                      <th className="px-5 py-3 font-semibold">Teacher</th>
                      <th className="px-5 py-3 font-semibold">Department</th>
                      <th className="px-5 py-3 font-semibold">OPI</th>
                      <th className="px-5 py-3 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {view.rows.map((teacher) => (
                      <tr key={teacher.teacherId} className="hover:bg-surface-hover">
                        <td className="px-5 py-3 text-xs font-mono">
                          {teacher.rank != null ? `#${teacher.rank}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-xs font-medium">{teacher.name}</td>
                        <td className="px-5 py-3 text-xs">{teacher.department}</td>
                        <td className="px-5 py-3 text-xs font-mono">
                          {formatRating(teacher.rating)}
                        </td>
                        <td className="px-5 py-3">
                          <Pill tone={trendTone(teacher.trend)}>{teacher.trend}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing 1–{view.rows.length} of {view.rows.length}
                </span>
              </div>
            </>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Department rankings" />
          <div className="px-5 pb-5 space-y-3">
            {deptRankings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No department data yet.</p>
            ) : (
              deptRankings.map((dept) => (
                <div key={dept.department}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{dept.department}</span>
                    <span className="font-mono">
                      {dept.average > 0 ? dept.average.toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(dept.average / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Performance trends"
          hint="Institute OPI average by month (operational signals)"
        />
        {monthlyTrend.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Trend chart builds as teachers accumulate operational activity.
          </p>
        ) : (
          <>
            <div className="px-5 pb-5 h-40 flex items-end gap-2">
              {monthlyTrend.map((point) => (
                <div
                  key={point.label}
                  className="flex-1 bg-primary/30 rounded-t-md hover:bg-primary/50 transition-colors"
                  style={{ height: `${(point.value / 5) * 100}%` }}
                  title={`${point.label}: ${point.value.toFixed(2)}`}
                />
              ))}
            </div>
            <div className="px-5 pb-5 flex justify-between text-[10px] font-mono text-muted-foreground">
              {monthlyTrend.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
