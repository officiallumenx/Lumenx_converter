import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@lumenx/ui";
import { FileText, BarChart3, Calendar, MapPin, Clock } from "lucide-react";
import type { TeacherExam } from "@/lib/teacher/types";

function isMarksLocked(status: TeacherExam["marksStatus"]) {
  return status === "submitted" || status === "published";
}

function marksActionLabel(status: TeacherExam["marksStatus"]) {
  if (status === "published") return "Published by Admin";
  if (status === "submitted") return "Submitted to Admin";
  return "Enter marks";
}

export function TeacherExamsPage() {
  const portal = useTeacherPortal();
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherExam | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherExam["status"]>("all");

  const classNames = useMemo(
    () => uniqueSortedClassNames(portal.classes),
    [portal.classes],
  );

  const sections = useMemo(
    () => sectionsForClassName(portal.classes, classFilter),
    [portal.classes, classFilter],
  );

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    setLoading(true);
    teacherRepository.getExams().then((all) => {
      const filtered = all.filter((exam) => {
        const cls = portal.classes.find((c) => c.id === exam.classId);
        if (!cls) return classFilter === "all" && sectionFilter === "all";
        if (classFilter !== "all" && cls.className !== classFilter) return false;
        if (sectionFilter !== "all" && cls.section !== sectionFilter) return false;
        return true;
      });
      setExams(filtered);
      setLoading(false);
    });
  }, [portal.isTeacher, portal.classes, classFilter, sectionFilter]);

  if (!portal.isTeacher) return null;

  const displayed = statusFilter === "all" ? exams : exams.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exams"
        subtitle="View exam schedule, timetable, and enter marks — managed by administration"
      />
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
          <Select
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v);
              setSectionFilter("all");
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              <SelectItem value="all">All classes</SelectItem>
              {classNames.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>
      {loading ? (
        <PageSkeleton rows={4} />
      ) : displayed.length ? (
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
                <Badge variant="outline" className="capitalize">
                  {ex.status}
                </Badge>
              </div>
              <h3 className="mt-3 font-semibold">{ex.name}</h3>
              <p className="text-xs text-muted-foreground">
                {ex.subject} · Class {ex.classLabel}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" /> {ex.startDate} – {ex.endDate}
              </p>
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
                <Link to="/marks" search={{ examId: ex.id, classId: ex.classId }}>
                  <Button
                    size="sm"
                    variant={isMarksLocked(ex.marksStatus) ? "outline" : "default"}
                    className={cn(
                      "rounded-lg gap-1",
                      isMarksLocked(ex.marksStatus) &&
                        "border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
                    )}
                  >
                    <BarChart3 className="size-3" />
                    {marksActionLabel(ex.marksStatus)}
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
          description={
            statusFilter !== "all"
              ? "Try a different filter."
              : "Exam schedules are published by the administration."
          }
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <Section title="Exam information">
                <p>{selected.description}</p>
                <p className="text-muted-foreground">
                  {selected.subject} · Class {selected.classLabel}
                </p>
              </Section>
              <Section title="Schedule">
                <p className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" /> {selected.startDate} to{" "}
                  {selected.endDate}
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
              </Section>
              <Section title="Results">
                <Badge variant="outline" className="capitalize">
                  Marks: {selected.marksStatus}
                </Badge>
                <Link to="/marks" search={{ examId: selected.id, classId: selected.classId }}>
                  <Button
                    className={cn(
                      "mt-2 rounded-xl gap-2",
                      isMarksLocked(selected.marksStatus) &&
                        "border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
                    )}
                    variant={isMarksLocked(selected.marksStatus) ? "outline" : "default"}
                  >
                    <BarChart3 className="size-4" />
                    {marksActionLabel(selected.marksStatus)}
                  </Button>
                </Link>
              </Section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <h4 className="mb-2 font-semibold">{title}</h4>
      {children}
    </div>
  );
}
