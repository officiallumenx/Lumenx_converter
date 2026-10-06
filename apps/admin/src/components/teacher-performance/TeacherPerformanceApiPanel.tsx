import { Fragment, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, Kpi, Pill, Button } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  computeSubjectRankings,
  computeInstituteAverage,
  findTopRatedTeacher,
  formatRating,
  formatSubjects,
  instituteTrendDelta,
  resolveTeacherPerformanceListView,
  trendTone,
  type TeacherPerformanceLoadStatus,
} from "@/lib/teacher-performance";
import { Award, ChevronDown, ChevronRight, FileDown, RefreshCw, TrendingUp } from "lucide-react";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  useTeacherPerformanceQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

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
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const perfQuery = useTeacherPerformanceQuery(
    instituteCtx.activeInstituteId,
    enabled,
  );

  const rows = perfQuery.data?.rows ?? [];
  const summary = perfQuery.data?.summary ?? null;
  const loadStatus: TeacherPerformanceLoadStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : perfQuery.isLoading && !perfQuery.data
              ? "loading"
              : (perfQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (perfQuery.data?.errorMessage ?? null);

  const view = resolveTeacherPerformanceListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId:
      perfQuery.data && enabled ? instituteCtx.activeInstituteId : null,
    storedRows: rows,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const subjectRankings = useMemo(
    () => computeSubjectRankings(view.rows),
    [view.rows],
  );
  const instituteAvg = computeInstituteAverage(view.rows, summary);
  const topRated = findTopRatedTeacher(view.rows);
  const trendDelta = instituteTrendDelta(summary);
  const monthlyTrend = summary?.monthlyTrend ?? [];
  const maxTrend = Math.max(5, ...monthlyTrend.map((p) => p.value), 0.01);

  const refresh = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.teacherPerformance),
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground max-w-xl leading-relaxed">
          Operational Performance Index (OPI) from staff attendance, published marks,
          homework, diary, and class registers — not student feedback. Asia/Kolkata
          day windows · last 90 days for rating.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={perfQuery.isFetching}
          >
            <RefreshCw
              className={`size-3.5 ${perfQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link to="/reports">
            <Button size="sm" variant="outline">
              <FileDown className="size-3.5" /> {M.reports}
            </Button>
          </Link>
        </div>
      </div>

      <div className="lx-kpi-grid">
        <Kpi
          label="Institute avg OPI"
          value={instituteAvg}
          delta={trendDelta ?? undefined}
          tone={
            trendDelta?.startsWith("+")
              ? "up"
              : trendDelta?.startsWith("-")
                ? "down"
                : undefined
          }
          icon={<TrendingUp className="size-3.5" />}
        />
        <Kpi
          label="Top rated"
          value={topRated?.name ?? "—"}
          delta={topRated ? formatRating(topRated.rating) : undefined}
          tone="up"
          icon={<Award className="size-3.5" />}
        />
        <Kpi label="Subjects" value={String(subjectRankings.length)} />
        <Kpi
          label="Faculty count"
          value={String(summary?.facultyCount ?? view.rows.length)}
          delta={
            summary?.ratedCount != null ? `${summary.ratedCount} rated` : undefined
          }
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8 transition-shadow duration-200">
          <CardHeader
            title="Faculty rankings"
            hint="Tap a row for component metrics · fair OPI (active signals only)"
            action={<Pill tone="neutral">Live data</Pill>}
          />
          {hint ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                      <th className="px-5 py-3 font-semibold w-8" />
                      <th className="px-5 py-3 font-semibold">Rank</th>
                      <th className="px-5 py-3 font-semibold">Teacher</th>
                      <th className="px-5 py-3 font-semibold">Subject</th>
                      <th className="px-5 py-3 font-semibold">OPI</th>
                      <th className="px-5 py-3 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {view.rows.map((teacher) => {
                      const open = expandedId === teacher.teacherId;
                      const m = teacher.metrics;
                      return (
                        <Fragment key={teacher.teacherId}>
                          <tr
                            className="hover:bg-surface-hover transition-colors cursor-pointer"
                            onClick={() =>
                              setExpandedId(open ? null : teacher.teacherId)
                            }
                          >
                            <td className="px-3 py-3 text-muted-foreground">
                              {open ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs font-mono">
                              {teacher.rank != null ? `#${teacher.rank}` : "—"}
                            </td>
                            <td className="px-5 py-3 text-xs font-medium">
                              {teacher.name}
                            </td>
                            <td className="px-5 py-3 text-xs">
                              {formatSubjects(teacher.subjects)}
                            </td>
                            <td className="px-5 py-3 text-xs font-mono">
                              {formatRating(teacher.rating)}
                            </td>
                            <td className="px-5 py-3">
                              <Pill tone={trendTone(teacher.trend)}>
                                {teacher.trend}
                              </Pill>
                            </td>
                          </tr>
                          {open ? (
                            <tr className="bg-muted/20">
                              <td colSpan={6} className="px-5 py-3">
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                                  <div>
                                    <div className="text-muted-foreground">
                                      Staff attendance
                                    </div>
                                    <div className="font-mono font-medium">
                                      {m.staffAttendanceRate == null
                                        ? "—"
                                        : `${Math.round(m.staffAttendanceRate * 100)}%`}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">
                                      Marks published
                                    </div>
                                    <div className="font-mono font-medium">
                                      {m.publishedMarks}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">
                                      Homework
                                    </div>
                                    <div className="font-mono font-medium">
                                      {m.publishedHomework}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Diary</div>
                                    <div className="font-mono font-medium">
                                      {m.submittedDiaryDays}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">
                                      Registers
                                    </div>
                                    <div className="font-mono font-medium">
                                      {m.submittedAttendanceRegisters}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                Showing {view.rows.length} teachers
                {summary?.ratedCount != null
                  ? ` · ${summary.ratedCount} with enough data for OPI`
                  : ""}
              </div>
            </>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-4 transition-shadow duration-200">
          <CardHeader title="Subject rankings" hint="Average OPI by subject" />
          <div className="px-5 pb-5 space-y-3">
            {subjectRankings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No subject data yet.</p>
            ) : (
              subjectRankings.map((item) => (
                <div key={item.subject}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>
                      {item.subject}{" "}
                      <span className="text-muted-foreground">
                        ({item.teacherCount})
                      </span>
                    </span>
                    <span className="font-mono">
                      {item.average > 0 ? item.average.toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${(item.average / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="transition-shadow duration-200">
        <CardHeader
          title="Performance trends"
          hint="Continuous last 7 months · institute average OPI"
        />
        {monthlyTrend.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Trend chart builds as teachers accumulate operational activity.
          </p>
        ) : (
          <>
            <div className="px-5 pb-2 h-44 flex items-end gap-2">
              {monthlyTrend.map((point) => (
                <div
                  key={point.label}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                >
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {point.value > 0 ? point.value.toFixed(1) : "—"}
                  </span>
                  <div
                    className="w-full bg-primary/35 hover:bg-primary/55 rounded-t-md transition-all duration-500 ease-out"
                    style={{
                      height: `${Math.max(4, (point.value / maxTrend) * 100)}%`,
                    }}
                    title={`${point.label}: ${point.value.toFixed(2)}`}
                  />
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex justify-between text-[10px] font-mono text-muted-foreground">
              {monthlyTrend.map((point) => (
                <span key={point.label} className="flex-1 text-center truncate">
                  {point.label}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
