import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { loadTeacherExamPapers, type TeacherExamPaperItem } from "@/lib/exams";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from "@lumenx/ui";
import { FileText, BarChart3, Calendar, MapPin, Clock, Shield } from "lucide-react";

function marksActionLabel() {
  return "Enter marks";
}

export function TeacherExamsApiPanel() {
  const { activeInstituteId } = useApp();
  const [papers, setPapers] = useState<TeacherExamPaperItem[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherExamPaperItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherExamPaperItem["status"]>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadTeacherExamPapers({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      setPapers(result.papers);
      setStatus(result.status);
      setError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  const displayed = useMemo(
    () => (statusFilter === "all" ? papers : papers.filter((p) => p.status === statusFilter)),
    [papers, statusFilter],
  );

  if (status === "loading") return <PageSkeleton rows={4} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exams"
        subtitle="Published papers, invigilation duties, and marks entry"
        action={
          status === "error" ? (
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          ) : undefined
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {(["all", "upcoming", "ongoing", "completed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {displayed.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayed.map((ex) => (
            <article
              key={ex.id}
              className="rounded-2xl border bg-card p-4 shadow-soft hover:shadow-elevated transition-shadow"
            >
              <div className="flex justify-between gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="capitalize">
                    {ex.status}
                  </Badge>
                  {ex.isInvigilator ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Shield className="size-3" /> Invigilator
                    </Badge>
                  ) : null}
                </div>
              </div>
              <h3 className="mt-3 font-semibold">{ex.name}</h3>
              <p className="text-xs text-muted-foreground">
                {ex.subject} · {ex.classLabel}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" /> {ex.date}
              </p>
              {ex.duration && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" /> {ex.duration}
                </p>
              )}
              {ex.room && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {ex.room}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setSelected(ex)}
                >
                  View details
                </Button>
                <Link to="/marks" search={{ examId: ex.examId, classId: ex.classId }}>
                  <Button size="sm" className="rounded-lg gap-1">
                    <BarChart3 className="size-3" />
                    {marksActionLabel()}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No exams found"
          description="Published exam schedules appear here when administration publishes timetables."
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-2 font-semibold">Paper</h4>
                <p>{selected.subject}</p>
                <p className="text-muted-foreground">{selected.classLabel}</p>
                {selected.isInvigilator ? (
                  <Badge variant="secondary" className="mt-2 gap-1">
                    <Shield className="size-3" /> You are assigned as invigilator
                  </Badge>
                ) : null}
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-2 font-semibold">Schedule</h4>
                <p className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" /> {selected.date}
                </p>
                {selected.duration && (
                  <p className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" /> {selected.duration}
                  </p>
                )}
                {selected.room && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" /> {selected.room}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
