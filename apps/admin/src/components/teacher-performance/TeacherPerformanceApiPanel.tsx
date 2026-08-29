import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, Kpi, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadTeacherPerformanceList,
  resolveTeacherPerformanceListView,
  shouldCommitTeacherPerformanceLoad,
  type TeacherPerformanceDto,
  type TeacherPerformanceLoadStatus,
} from "@/lib/teacher-performance";
import { Award, TrendingUp } from "lucide-react";

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
  const [loadStatus, setLoadStatus] = useState<TeacherPerformanceLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setRows([]);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setRows([]);
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
  const depts = useMemo(
    () => [...new Set(view.rows.map((t) => t.department))],
    [view.rows],
  );
  const avg =
    view.rows.length === 0
      ? "—"
      : (view.rows.reduce((a, t) => a + t.rating, 0) / view.rows.length).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="lx-kpi-grid">
        <Kpi label="Institute avg" value={avg} icon={<TrendingUp className="size-3.5" />} />
        <Kpi label="Faculty count" value={String(view.rows.length)} icon={<Award className="size-3.5" />} />
        <Kpi label="Departments" value={String(depts.length)} />
      </div>

      <Card>
        <CardHeader
          title="Teacher rankings"
          hint="Ratings are placeholders until feedback tables exist"
          action={<Pill tone="neutral">API mode</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {view.rows.map((t) => (
                  <tr key={t.teacherId} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-medium">{t.name}</td>
                    <td className="px-5 py-3 text-xs">{t.department}</td>
                    <td className="px-5 py-3 text-xs font-mono">{t.rating}</td>
                    <td className="px-5 py-3">
                      <Pill tone="neutral">{t.trend}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
