import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { useApp } from "@/lib/app-state";
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
  SimpleFileUpload,
  type SimpleUploadValue,
} from "@lumenx/ui";
import { BookOpen, Plus, ChevronLeft, Send, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import type {
  AssignmentSubmission,
  PublishStatus,
  TeacherAssignment,
  TeacherClass,
} from "@/lib/teacher/types";
import {
  attachHomeworkPdf,
  homeworkDtoToTeacherAssignment,
  loadTeacherHomeworkList,
  loadTeacherHomeworkSheet,
  publishHomeworkItem,
  saveHomeworkDraft,
  submissionDtoToConnectRow,
  toggleHomeworkSubmission,
  type HomeworkDto,
} from "@/lib/homework";
import {
  getTeacherClassesFromCache,
  getTeacherPortalApiCache,
  loadTeacherPortalApiData,
} from "@/lib/teacher-classes/load";
import {
  listSubjects,
  listTeacherAssignments,
  type SubjectDto,
  type TeacherAssignmentDto,
} from "@/lib/teacher-classes/api";

const newAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Title is required.").max(200),
  description: z.string().trim().min(12, "Add instructions (at least 12 characters).").max(8000),
  subjectId: z.string().min(1, "Select a subject."),
  sectionId: z.string().min(1, "Select a class."),
  dueDate: z.string().min(1, "Set a due date."),
  type: z.enum(["homework", "assignment"]),
});

type NewAssignmentForm = z.infer<typeof newAssignmentSchema>;

export function ApiTeacherAssignmentsPage() {
  const { activeInstituteId } = useApp();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [homeworkRows, setHomeworkRows] = useState<HomeworkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryType, setCategoryType] = useState<"assignment" | "homework">("homework");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portalTick, setPortalTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentDto[]>([]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const classes = useMemo(() => {
    void portalTick;
    return getTeacherClassesFromCache();
  }, [portalTick]);

  const subjectLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjects) {
      map.set(s.id, s.name?.trim() || s.code?.trim() || s.id);
    }
    return map;
  }, [subjects]);

  const classLabels = useMemo(() => {
    const map = new Map<string, { classLabel: string; sectionLabel: string }>();
    for (const c of classes) {
      map.set(c.id, { classLabel: c.className, sectionLabel: c.section });
    }
    return map;
  }, [classes]);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await loadTeacherPortalApiData(activeInstituteId);
      if (cancelled) return;
      setPortalTick((t) => t + 1);
      const cache = getTeacherPortalApiCache();
      const teacherId = cache?.teacherId ?? null;
      const cachedClasses = getTeacherClassesFromCache();
      const classLabelMap = new Map(
        cachedClasses.map((c) => [c.id, { classLabel: c.className, sectionLabel: c.section }]),
      );
      const [subjectRows, assignmentRows, listResult] = await Promise.all([
        listSubjects(activeInstituteId),
        teacherId
          ? listTeacherAssignments({ instituteId: activeInstituteId, teacherId })
          : Promise.resolve([]),
        teacherId
          ? loadTeacherHomeworkList({ instituteId: activeInstituteId, teacherId })
          : Promise.resolve({ status: "empty" as const, items: [], errorMessage: null }),
      ]);
      if (cancelled) return;
      setSubjects(subjectRows);
      setTeacherAssignments(assignmentRows);
      setHomeworkRows(listResult.items);
      const subjectLabelMap = new Map(
        subjectRows.map((s) => [s.id, s.name?.trim() || s.code?.trim() || s.id]),
      );
      setAssignments(
        listResult.items.map((dto) => {
          const labels = classLabelMap.get(dto.sectionId) ?? {
            classLabel: "Class",
            sectionLabel: "—",
          };
          return homeworkDtoToTeacherAssignment(dto, {
            classLabel: labels.classLabel,
            sectionLabel: labels.sectionLabel,
            subjectLabel: subjectLabelMap.get(dto.subjectId) ?? dto.subjectId,
          });
        }),
      );
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  useEffect(() => {
    setAssignments(
      homeworkRows.map((dto) => {
        const labels = classLabels.get(dto.sectionId) ?? {
          classLabel: "Class",
          sectionLabel: "—",
        };
        return homeworkDtoToTeacherAssignment(dto, {
          classLabel: labels.classLabel,
          sectionLabel: labels.sectionLabel,
          subjectLabel: subjectLabels.get(dto.subjectId) ?? dto.subjectId,
        });
      }),
    );
  }, [homeworkRows, classLabels, subjectLabels]);

  return (
    <div className="min-w-0 space-y-5">
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
            Homework
          </h1>
          <p className="mt-1.5 max-w-2xl break-words text-sm leading-relaxed text-muted-foreground">
            Create, publish, and mark offline submissions for your classes.
          </p>
        </div>
        <div className="shrink-0">
          <ApiNewAssignmentDialog
            instituteId={activeInstituteId}
            classes={classes}
            subjects={subjects}
            teacherAssignments={teacherAssignments}
            onCreated={refresh}
          />
        </div>
      </div>

      <ApiByItemView
        assignments={assignments}
        homeworkRows={homeworkRows}
        loading={loading}
        instituteId={activeInstituteId}
        categoryType={categoryType}
        onCategoryType={(t) => {
          setCategoryType(t);
          setSelectedId(null);
        }}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onReload={refresh}
        subjectLabels={subjectLabels}
        classLabels={classLabels}
      />
    </div>
  );
}

function ApiByItemView({
  assignments,
  homeworkRows,
  loading,
  instituteId,
  categoryType,
  onCategoryType,
  selectedId,
  onSelectId,
  onReload,
  subjectLabels,
  classLabels,
}: {
  assignments: TeacherAssignment[];
  homeworkRows: HomeworkDto[];
  loading: boolean;
  instituteId: string | null;
  categoryType: "assignment" | "homework";
  onCategoryType: (t: "assignment" | "homework") => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onReload: () => void;
  subjectLabels: Map<string, string>;
  classLabels: Map<string, { classLabel: string; sectionLabel: string }>;
}) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);

  const list = useMemo(
    () =>
      assignments
        .filter((a) => a.type === categoryType)
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [assignments, categoryType],
  );

  const selected = useMemo(
    () => (selectedId ? list.find((a) => a.id === selectedId) ?? null : null),
    [list, selectedId],
  );

  useEffect(() => {
    if (selectedId && !list.some((a) => a.id === selectedId)) onSelectId(null);
  }, [list, selectedId, onSelectId]);

  const reloadSubs = useCallback(
    async (homeworkId: string) => {
      if (!instituteId) return;
      setSubsLoading(true);
      const result = await loadTeacherHomeworkSheet({
        instituteId,
        homeworkId,
      });
      if (result.sheet) {
        const dto = homeworkRows.find((h) => h.id === homeworkId);
        const labels = dto
          ? classLabels.get(dto.sectionId) ?? { classLabel: "Class", sectionLabel: "—" }
          : { classLabel: "Class", sectionLabel: "—" };
        setSelectedAssignment(
          dto
            ? homeworkDtoToTeacherAssignment(dto, {
                classLabel: labels.classLabel,
                sectionLabel: labels.sectionLabel,
                subjectLabel: subjectLabels.get(dto.subjectId) ?? dto.subjectId,
                sheet: result.sheet,
              })
            : selected,
        );
      }
      setSubmissions(result.rows);
      setSubsLoading(false);
    },
    [instituteId, homeworkRows, classLabels, subjectLabels],
  );

  useEffect(() => {
    if (!selected?.id) {
      setSubmissions([]);
      setSelectedAssignment(null);
      return;
    }
    setSelectedAssignment(selected);
    void reloadSubs(selected.id);
  }, [selected?.id, reloadSubs]);

  const publishFn = useCallback(
    async (id: string) => {
      await publishHomeworkItem(id);
      toast.success("Published — parents and students were notified");
      onReload();
      await reloadSubs(id);
    },
    [onReload, reloadSubs],
  );
  const { run: publish, pending: publishing } = useAsyncAction(publishFn);

  return (
    <div className="space-y-4">
      <TypeToggle value={categoryType} onChange={onCategoryType} />

      {loading ? (
        <PageSkeleton rows={4} />
      ) : selectedAssignment ? (
        <SelectedAssignmentDetail
          assignment={selectedAssignment}
          submissions={submissions}
          subsLoading={subsLoading}
          publishing={publishing}
          onBack={() => onSelectId(null)}
          onPublish={() => void publish(selectedAssignment.id)}
          onSubmissionsChange={setSubmissions}
          onProgressRefresh={onReload}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`No ${categoryType === "homework" ? "homework" : "assignments"} yet`}
          description="Create one with New, then open it to mark submissions."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelectId(a.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-soft transition hover:bg-muted/30 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {a.dueDate} · {a.submittedCount}/{a.totalStudents} submitted
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="inline-flex items-center rounded-lg bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">
                    Class {a.classLabel}
                  </span>
                  <PublishStatusBadge status={a.publishStatus} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectedAssignmentDetail({
  assignment,
  submissions,
  subsLoading,
  publishing,
  onBack,
  onPublish,
  onSubmissionsChange,
  onProgressRefresh,
}: {
  assignment: TeacherAssignment;
  submissions: AssignmentSubmission[];
  subsLoading: boolean;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
  onSubmissionsChange: (rows: AssignmentSubmission[]) => void;
  onProgressRefresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return submissions;
    return submissions.filter(
      (s) => s.studentName.toLowerCase().includes(t) || s.roll.includes(t),
    );
  }, [submissions, q]);

  const submittedCount = submissions.filter((s) => s.timing !== "missing").length;

  const toggle = async (row: AssignmentSubmission) => {
    setTogglingId(row.id);
    try {
      const submitted = row.timing === "missing";
      const updated = await toggleHomeworkSubmission(row.id, submitted);
      const next = submissionDtoToConnectRow(updated);
      onSubmissionsChange(submissions.map((s) => (s.id === row.id ? next : s)));
      onProgressRefresh();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="gap-1 rounded-lg" onClick={onBack}>
          <ChevronLeft className="size-4" aria-hidden />
          Back to list
        </Button>
        {assignment.publishStatus === "draft" ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto gap-1 rounded-lg"
            disabled={publishing}
            onClick={onPublish}
          >
            <Send className="size-3.5" aria-hidden />
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-snug">{assignment.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {assignment.subject} · Due {assignment.dueDate}
            </p>
          </div>
          <PublishStatusBadge status={assignment.publishStatus} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-xl bg-primary/12 px-3 py-1.5 text-base font-semibold text-primary">
            Class {assignment.classLabel}
          </span>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Section {assignment.section}
          </span>
          <span className="text-xs text-muted-foreground">
            {submittedCount}/{submissions.length || assignment.totalStudents} submitted
          </span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Tap a student to mark submitted. Tap again to mark not submitted.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-sm font-semibold">Students</h3>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or roll"
            className="h-10 max-w-xs rounded-xl"
          />
        </div>

        {subsLoading ? (
          <PageSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No students"
            description="Publish this item to load the class roster."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {filtered.map((row) => {
              const isSubmitted = row.timing !== "missing";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={togglingId === row.id}
                    onClick={() => void toggle(row)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition sm:px-4",
                      isSubmitted ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/40",
                      togglingId === row.id && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="mr-2 tabular-nums text-muted-foreground">{row.roll}</span>
                        {row.studentName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isSubmitted ? row.submittedAt ?? "Submitted" : "Not submitted"}
                      </p>
                    </div>
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <Circle className="size-3.5" aria-hidden />
                        Not submitted
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: "assignment" | "homework";
  onChange: (t: "assignment" | "homework") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["homework", "assignment"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium capitalize",
            value === t
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {t === "assignment" ? "Assignments" : "Homework"}
        </button>
      ))}
    </div>
  );
}

function ApiNewAssignmentDialog({
  instituteId,
  classes,
  subjects,
  teacherAssignments,
  onCreated,
}: {
  instituteId: string | null;
  classes: TeacherClass[];
  subjects: SubjectDto[];
  teacherAssignments: TeacherAssignmentDto[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<SimpleUploadValue | null>(null);
  const defaultClass = classes[0];
  const form = useForm<NewAssignmentForm>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      sectionId: defaultClass?.id ?? "",
      dueDate: "",
      type: "homework",
    },
  });

  const watchedSectionId = form.watch("sectionId");

  const subjectOptions = useMemo(() => {
    const ids = [
      ...new Set(
        teacherAssignments
          .filter((a) => a.status === "active" && a.sectionId === watchedSectionId)
          .map((a) => a.subjectId),
      ),
    ];
    return ids.map((id) => {
      const subject = subjects.find((s) => s.id === id);
      return { id, label: subject?.name?.trim() || subject?.code?.trim() || id };
    });
  }, [teacherAssignments, watchedSectionId, subjects]);

  useEffect(() => {
    const current = form.getValues("subjectId");
    if (current && !subjectOptions.some((s) => s.id === current) && subjectOptions[0]) {
      form.setValue("subjectId", subjectOptions[0].id);
    }
  }, [subjectOptions, form]);

  const createFn = useCallback(
    async (data: NewAssignmentForm) => {
      if (!instituteId) {
        toast.error("Institute not loaded.");
        return;
      }
      const match = teacherAssignments.find(
        (a) =>
          a.status === "active" &&
          a.sectionId === data.sectionId &&
          a.subjectId === data.subjectId,
      );
      if (!match) {
        toast.error("Select a valid class and subject.");
        return;
      }
      const saved = await saveHomeworkDraft({
        homeworkId: null,
        createInput: {
          instituteId,
          academicYearId: match.academicYearId,
          classId: match.classId,
          sectionId: match.sectionId,
          subjectId: match.subjectId,
          kind: data.type,
          title: data.title,
          description: data.description,
          instructions: data.description,
          dueDate: data.dueDate,
        },
        updateInput: {},
      });
      if (attachment?.file) {
        await attachHomeworkPdf({
          instituteId,
          homeworkId: saved.id,
          file: attachment.file,
        });
      }
      setOpen(false);
      setAttachment(null);
      form.reset({
        title: "",
        description: "",
        subjectId: subjectOptions[0]?.id ?? "",
        sectionId: defaultClass?.id ?? "",
        dueDate: "",
        type: "homework",
      });
      toast.success("Saved as draft.");
      onCreated();
    },
    [instituteId, teacherAssignments, attachment, form, subjectOptions, defaultClass, onCreated],
  );

  const { run: onSubmit, pending: creating } = useAsyncAction(createFn);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="gap-2 rounded-xl shadow-glow" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New
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
                name="sectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class · Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Class" />
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
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Subject</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!subjectOptions.length}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        {subjectOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
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
            <SimpleFileUpload
              kind="homework"
              label="PDF attachment (optional)"
              value={attachment}
              onChange={setAttachment}
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
        "capitalize text-xs",
        status === "published" && "border-success/30 bg-success/10 text-success",
        status === "draft" && "border-warning/30 bg-warning/10 text-warning-foreground",
        status === "expired" && "border-muted-foreground/40 bg-muted/50 text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}
