import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/PageHeader";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lumenx/ui";
import {
  BookOpen,
  Plus,
  Calendar,
  Users,
  Filter,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AssignmentSubmission,
  HomeworkAttendanceRow,
  HomeworkClassSummary,
  PublishStatus,
  TeacherAssignment,
} from "@/lib/teacher/types";

const TIMING_LABEL = {
  early: "Early",
  on_time: "On time",
  late: "Late",
  missing: "Missing",
} as const;

const newAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Title is required.").max(200),
  description: z.string().trim().min(12, "Add instructions (at least 12 characters).").max(8000),
  subject: z.string().min(1, "Select a subject."),
  classId: z.string().min(1, "Select a class."),
  dueDate: z.string().min(1, "Set a due date."),
  type: z.enum(["homework", "assignment"]),
});

type NewAssignmentForm = z.infer<typeof newAssignmentSchema>;

export function TeacherAssignmentsPage() {
  const portal = useTeacherPortal();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [classSummaries, setClassSummaries] = useState<HomeworkClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [classNameFilter, setClassNameFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "title">("dueDate");
  const [categoryType, setCategoryType] = useState<"assignment" | "homework">("homework");
  const [statusFilter, setStatusFilter] = useState<"all" | PublishStatus>("all");

  const classNames = useMemo(
    () =>
      [...new Set(portal.isTeacher ? portal.classes.map((c) => c.className) : [])].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [portal],
  );

  const sections = useMemo(() => {
    if (!portal.isTeacher) return [];
    const pool =
      classNameFilter === "all"
        ? portal.classes
        : portal.classes.filter((c) => c.className === classNameFilter);
    return [...new Set(pool.map((c) => c.section))].sort();
  }, [portal, classNameFilter]);

  const load = () => {
    setLoading(true);
    Promise.all([teacherRepository.getAssignments(), teacherRepository.getHomeworkClassSummaries()]).then(
      ([a, s]) => {
        setAssignments(a);
        setClassSummaries(s);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    if (portal.isTeacher) load();
  }, [portal.isTeacher]);

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [sections, sectionFilter]);

  const displayAssignments = useMemo(() => {
    const list = assignments
      .filter((a) => a.type === categoryType)
      .filter((a) => statusFilter === "all" || a.publishStatus === statusFilter)
      .filter((a) => {
        const cls = portal.isTeacher ? portal.classes.find((c) => c.id === a.classId) : null;
        if (classNameFilter !== "all" && cls?.className !== classNameFilter) return false;
        if (sectionFilter !== "all" && cls?.section !== sectionFilter) return false;
        return true;
      });
    if (sortBy === "dueDate") {
      return [...list].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    }
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [assignments, categoryType, statusFilter, classNameFilter, sectionFilter, sortBy, portal]);

  if (!portal.isTeacher) return null;

  const avgSubmission =
    classSummaries.length > 0
      ? Math.round(
          classSummaries.reduce((a, c) => a + c.avgSubmissionPct, 0) / classSummaries.length,
        )
      : 0;
  const pendingCount = assignments.filter((a) => a.publishStatus === "draft").length;
  const expiredCount = assignments.filter((a) => a.publishStatus === "expired").length;
  // "Active" = currently published (not drafts, not expired).
  const activeCount = assignments.filter((a) => a.publishStatus === "published").length;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Assignments & Homework"
        subtitle="Create homework, track submissions, and monitor homework attendance %"
        action={<NewAssignmentDialog classes={portal.classes} onCreated={load} />}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Active", value: String(activeCount), icon: BookOpen },
          {
            label: "Drafts",
            value: String(pendingCount),
            icon: ClipboardList,
            tone: "warning" as const,
          },
          {
            label: "Expired",
            value: String(expiredCount),
            icon: AlertTriangle,
            tone: "warning" as const,
          },
          {
            label: "Avg submission %",
            value: `${avgSubmission}%`,
            icon: TrendingUp,
            tone: "primary" as const,
          },
          {
            label: "Below 70%",
            value: String(classSummaries.reduce((a, c) => a + c.studentsBelow70, 0)),
            icon: AlertTriangle,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-2xl border border-border p-4 shadow-soft",
              s.tone === "primary" && "bg-primary/10",
              s.tone === "warning" && "bg-warning/10",
            )}
          >
            <s.icon className="mb-2 size-4 text-muted-foreground" />
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
            <div className="font-display text-2xl font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["assignment", "homework"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setCategoryType(t)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              categoryType === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t === "assignment" ? "Assignments" : "Homework"}
          </button>
        ))}
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="assignments" className="rounded-lg">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="homework-attendance" className="rounded-lg">
            Homework attendance %
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-lg">
            Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4 space-y-4">
          <ClassSectionFilterRow
            classNameFilter={classNameFilter}
            sectionFilter={sectionFilter}
            classNames={classNames}
            sections={sections}
            onClassChange={(v) => {
              setClassNameFilter(v);
              setSectionFilter("all");
            }}
            onSectionChange={setSectionFilter}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "dueDate" | "title")}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="dueDate">Sort by due date</SelectItem>
                <SelectItem value="title">Sort by title</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "draft", "published", "expired"] as const).map((s) => (
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
                  {s === "all" ? "All statuses" : s}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <PageSkeleton rows={4} />
          ) : (
            <AssignmentList
              assignments={displayAssignments}
              classes={portal.classes}
              onReload={load}
            />
          )}
        </TabsContent>

        <TabsContent value="homework-attendance" className="mt-4">
          <HomeworkAttendanceTab
            classes={portal.classes}
            summaries={classSummaries}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab assignments={assignments} classes={portal.classes} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentList({
  assignments,
  classes,
  onReload,
}: {
  assignments: TeacherAssignment[];
  classes: { id: string; className: string; section: string; subject: string }[];
  onReload: () => void;
}) {
  const [view, setView] = useState<TeacherAssignment | null>(null);
  const [edit, setEdit] = useState<TeacherAssignment | null>(null);

  const publishFn = useCallback(
    async (id: string) => {
      await teacherRepository.publishAssignment(id);
      toast.success("Published");
      onReload();
    },
    [onReload],
  );

  const deleteFn = useCallback(
    async (id: string) => {
      await teacherRepository.deleteAssignment(id);
      toast.success("Deleted");
      onReload();
    },
    [onReload],
  );

  const { run: publish, pending: publishing } = useAsyncAction(publishFn);
  const { run: deleteAssignment, pending: deleting } = useAsyncAction(deleteFn);
  const actionPending = publishing || deleting;
  const now = new Date();

  if (!assignments.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No items match"
        description="Try a different status filter or create a new assignment."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {assignments.map((a) => {
          const isExpired = a.publishStatus === "expired";
          const dueDate = a.dueDate ? new Date(a.dueDate) : null;
          const isOverdue =
            !isExpired && dueDate && dueDate < now && a.publishStatus === "published";
          return (
            <article
              key={a.id}
              className={cn(
                "rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated sm:p-5",
                isExpired && "border-muted-foreground/25 bg-muted/20",
                isOverdue && "border-warning/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "grid size-10 place-items-center rounded-xl bg-primary/10 text-primary",
                    isExpired && "opacity-60",
                  )}
                >
                  <BookOpen className="size-5" />
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {a.type}
                  </Badge>
                  <PublishStatusBadge status={a.publishStatus} />
                  {isOverdue && (
                    <Badge className="border-0 bg-warning/15 text-warning-foreground text-[10px]">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              <h3 className="mt-3 font-semibold leading-snug line-clamp-2">{a.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.subject} · Class {a.classLabel}
              </p>
              <div
                className={cn(
                  "mt-3 flex items-center gap-1.5 text-xs",
                  isOverdue ? "text-warning-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <Calendar className="size-3.5" /> {isExpired ? "Due date passed" : `Due ${a.due}`}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Submission rate</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      a.submissionRate >= 80
                        ? "text-success"
                        : a.submissionRate >= 60
                          ? "text-warning-foreground"
                          : "text-destructive",
                    )}
                  >
                    {a.submissionRate}%
                  </span>
                </div>
                <Progress value={a.submissionRate} className="h-2" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setView(a)}
                >
                  View
                </Button>
                {!isExpired && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setEdit(a)}
                    >
                      Edit
                    </Button>
                    {a.publishStatus === "draft" && (
                      <Button
                        size="sm"
                        className="rounded-lg"
                        disabled={actionPending}
                        onClick={() => publish(a.id)}
                      >
                        {publishing ? "Publishing…" : "Publish"}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-destructive"
                  disabled={actionPending}
                  onClick={() => deleteAssignment(a.id)}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <PublishStatusBadge status={view.publishStatus} /> · {view.status}
              </p>
              <p>
                <span className="text-muted-foreground">Class:</span> {view.classLabel} ·{" "}
                {view.subject}
              </p>
              <p>
                <span className="text-muted-foreground">Due:</span> {view.due}
              </p>
              <div>
                <span className="text-muted-foreground">Instructions:</span>
                <p className="mt-1 whitespace-pre-wrap">{view.instructions || view.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {edit && (
        <EditAssignmentDialog
          assignment={edit}
          classes={classes}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            onReload();
          }}
        />
      )}
    </>
  );
}

function EditAssignmentDialog({
  assignment,
  classes,
  onClose,
  onSaved,
}: {
  assignment: TeacherAssignment;
  classes: { id: string; className: string; section: string; subject: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.instructions || assignment.description);
  const [dueDate, setDueDate] = useState(assignment.dueDate);

  const saveFn = useCallback(async () => {
    await teacherRepository.updateAssignment(assignment.id, {
      title,
      description,
      instructions: description,
      due: dueDate,
      dueDate,
    });
    toast.success("Assignment updated");
    onSaved();
  }, [assignment.id, title, description, dueDate, onSaved]);

  const { run: save, pending: saving } = useAsyncAction(saveFn);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit assignment</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-xl"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="rounded-xl"
        />
        <ConnectDatePicker
          label="Due date"
          value={dueDate}
          onChange={setDueDate}
          placeholder="Select due date"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeworkAttendanceTab({
  classes,
  summaries,
  loading,
}: {
  classes: { id: string; className: string; section: string }[];
  summaries: HomeworkClassSummary[];
  loading: boolean;
}) {
  const initial = classes[0];
  const [classNameFilter, setClassNameFilter] = useState(initial?.className ?? "");
  const [sectionFilter, setSectionFilter] = useState(initial?.section ?? "");
  const [rows, setRows] = useState<HomeworkAttendanceRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const classNames = useMemo(
    () => [...new Set(classes.map((c) => c.className))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [classes],
  );

  const sections = useMemo(
    () =>
      [...new Set(classes.filter((c) => c.className === classNameFilter).map((c) => c.section))].sort(),
    [classes, classNameFilter],
  );

  const classId = useMemo(
    () => classes.find((c) => c.className === classNameFilter && c.section === sectionFilter)?.id ?? "",
    [classes, classNameFilter, sectionFilter],
  );

  const summary = summaries.find((s) => s.classId === classId);

  useEffect(() => {
    if (!sections.includes(sectionFilter) && sections[0]) setSectionFilter(sections[0]);
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (!classId) return;
    setRowsLoading(true);
    teacherRepository.getHomeworkAttendance(classId).then((r) => {
      setRows(r);
      setRowsLoading(false);
    });
  }, [classId]);

  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Homework attendance % = share of assigned homework submitted (on-time, late, or early).
      </p>

      <ClassSectionFilterRow
        classNameFilter={classNameFilter}
        sectionFilter={sectionFilter}
        classNames={classNames}
        sections={sections}
        allOption={false}
        onClassChange={(v) => {
          setClassNameFilter(v);
          const next = classes.filter((c) => c.className === v).map((c) => c.section);
          if (!next.includes(sectionFilter)) setSectionFilter(next[0] ?? "");
        }}
        onSectionChange={setSectionFilter}
      />

      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatPill label="Class avg submission" value={`${summary.avgSubmissionPct}%`} />
          <StatPill label="On-time rate" value={`${summary.avgOnTimePct}%`} />
          <StatPill label="Assignments tracked" value={String(summary.totalAssignments)} />
          <StatPill label="Below 70%" value={String(summary.studentsBelow70)} />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
              <TableHead className="text-right">On time</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Missing</TableHead>
              <TableHead className="text-right">HW %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell className="tabular-nums">{r.roll}</TableCell>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalAssigned}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.submitted}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{r.onTime}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning-foreground">
                    {r.late}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {r.missing}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "tabular-nums",
                        r.submissionPct >= 80 && "border-success/30 text-success",
                        r.submissionPct < 70 && "border-destructive/30 text-destructive",
                      )}
                    >
                      {r.submissionPct}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No homework data for this class.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SubmissionsTab({
  assignments,
  classes,
  loading,
}: {
  assignments: TeacherAssignment[];
  classes: { id: string; className: string; section: string; subject: string }[];
  loading: boolean;
}) {
  const published = useMemo(
    () => assignments.filter((a) => a.publishStatus === "published" || a.publishStatus === "expired"),
    [assignments],
  );

  const [typeFilter, setTypeFilter] = useState<"all" | "homework" | "assignment">("all");
  const [classNameFilter, setClassNameFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [assignmentId, setAssignmentId] = useState("");
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [q, setQ] = useState("");
  const [timing, setTiming] = useState<"all" | keyof typeof TIMING_LABEL>("all");
  const [subsLoading, setSubsLoading] = useState(false);
  const [markDrafts, setMarkDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const classNames = useMemo(
    () => [...new Set(classes.map((c) => c.className))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [classes],
  );

  const sections = useMemo(() => {
    const pool =
      classNameFilter === "all"
        ? classes
        : classes.filter((c) => c.className === classNameFilter);
    return [...new Set(pool.map((c) => c.section))].sort();
  }, [classes, classNameFilter]);

  const matchingAssignments = useMemo(() => {
    return published.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      const cls = classes.find((c) => c.id === a.classId);
      if (classNameFilter !== "all" && cls?.className !== classNameFilter) return false;
      if (sectionFilter !== "all" && cls?.section !== sectionFilter) return false;
      return true;
    });
  }, [published, typeFilter, classNameFilter, sectionFilter, classes]);

  const selectedAssignment = matchingAssignments.find((a) => a.id === assignmentId) ?? matchingAssignments[0];

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) setSectionFilter("all");
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (!matchingAssignments.length) {
      setAssignmentId("");
      return;
    }
    if (!matchingAssignments.some((a) => a.id === assignmentId)) {
      setAssignmentId(matchingAssignments[0].id);
    }
  }, [matchingAssignments, assignmentId]);

  useEffect(() => {
    if (!selectedAssignment?.id) {
      setSubmissions([]);
      return;
    }
    setSubsLoading(true);
    teacherRepository.getAssignmentSubmissions(selectedAssignment.id).then((s) => {
      setSubmissions(s);
      setMarkDrafts(Object.fromEntries(s.map((r) => [r.id, r.marks != null ? String(r.marks) : ""])));
      setSubsLoading(false);
    });
  }, [selectedAssignment?.id]);

  const filtered = useMemo(() => {
    let r = submissions;
    const qq = q.trim().toLowerCase();
    if (qq) {
      r = r.filter(
        (s) => s.studentName.toLowerCase().includes(qq) || s.roll.toLowerCase().includes(qq),
      );
    }
    if (timing !== "all") r = r.filter((s) => s.timing === timing);
    return r;
  }, [submissions, q, timing]);

  const stats = useMemo(() => {
    const submitted = submissions.filter((s) => s.timing !== "missing").length;
    const missing = submissions.filter((s) => s.timing === "missing").length;
    const graded = submissions.filter((s) => s.marks != null).length;
    return { total: submissions.length, submitted, missing, graded };
  }, [submissions]);

  const saveMarks = async (row: AssignmentSubmission) => {
    const raw = markDrafts[row.id]?.trim() ?? "";
    const max = row.maxMarks;
    let marks: number | null = null;
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > max) {
        toast.error(`Enter marks between 0 and ${max}`);
        return;
      }
      marks = n;
    }
    setSavingId(row.id);
    await teacherRepository.updateSubmissionMarks(row.id, marks);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === row.id ? { ...s, marks, graded: marks != null } : s)),
    );
    setSavingId(null);
    toast.success(marks != null ? "Marks saved" : "Marks cleared");
  };

  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <h3 className="font-semibold">Submissions & marks</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Pick homework or assignment, class, and section — then review submissions and enter marks.
      </p>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "homework", "assignment"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
        </div>

        <ClassSectionFilterRow
          classNameFilter={classNameFilter}
          sectionFilter={sectionFilter}
          classNames={classNames}
          sections={sections}
          onClassChange={(v) => {
            setClassNameFilter(v);
            setSectionFilter("all");
          }}
          onSectionChange={setSectionFilter}
        />

        <Field label="Select item">
          <Select
            value={selectedAssignment?.id ?? ""}
            onValueChange={setAssignmentId}
            disabled={!matchingAssignments.length}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Choose homework or assignment" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {matchingAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.type === "homework" ? "HW" : "Asg"} · {a.title} · Class {a.classLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selectedAssignment ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Students" value={String(stats.total)} />
            <StatPill label="Submitted" value={String(stats.submitted)} />
            <StatPill label="Missing" value={String(stats.missing)} />
            <StatPill label="Graded" value={String(stats.graded)} />
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Search name or roll">
          <Input
            className="h-10 rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. 14 or Aarav"
          />
        </Field>
        <Field label="Submission timing">
          <Select value={timing} onValueChange={(v) => setTiming(v as typeof timing)}>
            <SelectTrigger className="h-10 rounded-xl">
              <Filter className="mr-1 size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              <SelectItem value="all">All timings</SelectItem>
              <SelectItem value="early">Early</SelectItem>
              <SelectItem value="on_time">On time</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {!matchingAssignments.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No published items match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="min-w-[8rem]">Marks</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length ? (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{r.roll}</TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          r.timing === "missing" && "border-destructive/30 text-destructive",
                          r.timing === "late" && "border-warning/30 text-warning-foreground",
                          (r.timing === "on_time" || r.timing === "early") &&
                            "border-success/30 text-success",
                        )}
                      >
                        {TIMING_LABEL[r.timing]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.submittedAt ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.timing === "missing" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={r.maxMarks}
                            value={markDrafts[r.id] ?? ""}
                            onChange={(e) =>
                              setMarkDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                            }
                            placeholder={`/${r.maxMarks}`}
                            className="h-9 w-20 rounded-lg tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">/{r.maxMarks}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg px-2 text-xs"
                            disabled={savingId === r.id}
                            onClick={() => saveMarks(r)}
                          >
                            {savingId === r.id ? "…" : "Save"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm">{r.note || "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No submissions match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function NewAssignmentDialog({
  classes,
  onCreated,
}: {
  classes: { id: string; className: string; section: string; subject: string }[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<NewAssignmentForm>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: classes[0]?.subject ?? "Mathematics",
      classId: classes[0]?.id ?? "",
      dueDate: "",
      type: "homework",
    },
  });

  const createFn = useCallback(
    async (data: NewAssignmentForm) => {
      await teacherRepository.createAssignment({ ...data, instructions: data.description });
      setOpen(false);
      form.reset();
      toast.success("Assignment saved as draft.");
      onCreated();
    },
    [form, onCreated],
  );

  const { run: onSubmit, pending: creating } = useAsyncAction(createFn);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="gap-2 rounded-xl shadow-glow" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New homework
      </Button>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create assignment / homework</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Quadratic equations problem set" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="What students should deliver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectItem value="homework">Homework</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        {[...new Set(classes.map((c) => c.subject))].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            Class {c.className}-{c.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <ConnectDatePicker
                      label="Due date"
                      hideLabel
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select due date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Save draft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PublishStatusBadge({ status }: { status: PublishStatus }) {
  const label = { draft: "Draft", published: "Published", expired: "Expired" }[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize text-[10px]",
        status === "published" && "border-success/30 bg-success/10 text-success",
        status === "draft" && "border-warning/30 bg-warning/10 text-warning-foreground",
        status === "expired" && "border-muted-foreground/40 bg-muted/50 text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ClassSectionFilterRow({
  classNameFilter,
  sectionFilter,
  classNames,
  sections,
  onClassChange,
  onSectionChange,
  allOption = true,
}: {
  classNameFilter: string;
  sectionFilter: string;
  classNames: string[];
  sections: string[];
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  allOption?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
      <Field label="Class">
        <Select value={classNameFilter} onValueChange={onClassChange}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            {allOption ? <SelectItem value="all">All classes</SelectItem> : null}
            {classNames.map((c) => (
              <SelectItem key={c} value={c}>
                Class {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Section">
        <Select value={sectionFilter} onValueChange={onSectionChange}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            {allOption ? <SelectItem value="all">All sections</SelectItem> : null}
            {sections.map((s) => (
              <SelectItem key={s} value={s}>
                Section {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 sm:max-w-xs">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
