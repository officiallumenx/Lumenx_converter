import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import type { TeacherExamPaperItem } from "@/lib/exams";
import { useTeacherExamsQuery } from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";
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

type TeacherExamGroup = {
  examId: string;
  name: string;
  classLabel: string;
  classId: string;
  startDate: string;
  endDate: string;
  description?: string;
  status: TeacherExamPaperItem["status"];
  papers: TeacherExamPaperItem[];
};

function groupPapersByExam(papers: TeacherExamPaperItem[]): TeacherExamGroup[] {
  const byExam = new Map<string, TeacherExamGroup>();
  for (const paper of papers) {
    const existing = byExam.get(paper.examId);
    if (!existing) {
      byExam.set(paper.examId, {
        examId: paper.examId,
        name: paper.name,
        classLabel: paper.classLabel,
        classId: paper.classId,
        startDate: paper.startDate,
        endDate: paper.endDate,
        description: paper.description,
        status: paper.status,
        papers: [paper],
      });
      continue;
    }
    existing.papers.push(paper);
    // Prefer the "soonest" paper status for the exam card badge.
    if (paper.status === "ongoing") existing.status = "ongoing";
    else if (paper.status === "upcoming" && existing.status === "completed") {
      existing.status = "upcoming";
    }
  }
  return [...byExam.values()]
    .map((group) => ({
      ...group,
      papers: [...group.papers].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function TeacherExamsApiPanel() {
  const { activeInstituteId } = useApp();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<TeacherExamGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherExamPaperItem["status"]>("all");

  const examsQuery = useTeacherExamsQuery(activeInstituteId, Boolean(activeInstituteId));
  const papers = examsQuery.data?.papers ?? [];
  const status =
    examsQuery.data?.status ??
    (examsQuery.isLoading && !examsQuery.data
      ? "loading"
      : examsQuery.isError
        ? "error"
        : "loading");
  const error =
    examsQuery.data?.errorMessage ??
    (examsQuery.isError ? "Failed to load exams." : null);

  const groups = useMemo(() => groupPapersByExam(papers), [papers]);

  const displayed = useMemo(
    () => (statusFilter === "all" ? groups : groups.filter((g) => g.status === statusFilter)),
    [groups, statusFilter],
  );

  const retry = () => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: connectQueryKeys.examsTeacher(activeInstituteId),
    });
  };

  if (status === "loading" || (examsQuery.isLoading && !examsQuery.data)) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exams"
        subtitle="Published exams, subjects, invigilation, and marks entry"
        action={
          status === "error" ? (
            <button type="button" className="text-sm text-primary underline" onClick={retry}>
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
          {displayed.map((exam) => (
            <article
              key={exam.examId}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(exam)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(exam);
                }
              }}
              className="cursor-pointer rounded-2xl border bg-card p-4 shadow-soft hover:shadow-elevated transition-shadow"
            >
              <div className="flex justify-between gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <Badge variant="outline" className="capitalize">
                  {exam.status}
                </Badge>
              </div>
              <h3 className="mt-3 font-semibold">{exam.name}</h3>
              <p className="text-xs text-muted-foreground">{exam.classLabel}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" /> {exam.startDate}
                {exam.endDate !== exam.startDate ? ` → ${exam.endDate}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {exam.papers.length} subject{exam.papers.length === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(exam);
                  }}
                >
                  View subjects
                </Button>
                <Link
                  to="/marks"
                  search={{ examId: exam.examId, classId: exam.classId }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" className="rounded-lg gap-1">
                    <BarChart3 className="size-3" />
                    Enter marks
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-2 font-semibold">Exam</h4>
                <p className="text-muted-foreground">{selected.classLabel}</p>
                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 text-primary" />
                  {selected.startDate}
                  {selected.endDate !== selected.startDate ? ` → ${selected.endDate}` : ""}
                </p>
                {selected.description ? (
                  <p className="mt-2 text-xs text-muted-foreground">{selected.description}</p>
                ) : null}
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-3 font-semibold">
                  Subjects ({selected.papers.length})
                </h4>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {selected.papers.map((paper) => (
                    <li
                      key={paper.id}
                      className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{paper.subject}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3" /> {paper.date}
                          </span>
                          {paper.duration ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" /> {paper.duration}
                            </span>
                          ) : null}
                          {paper.room ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" /> {paper.room}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {paper.status}
                        </Badge>
                        {paper.isInvigilator ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Shield className="size-3" /> Invigilator
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/marks"
                search={{ examId: selected.examId, classId: selected.classId }}
                className="block"
              >
                <Button className="w-full rounded-lg gap-1">
                  <BarChart3 className="size-3.5" />
                  Enter marks
                </Button>
              </Link>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
