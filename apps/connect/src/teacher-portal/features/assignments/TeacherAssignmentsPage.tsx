import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";
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

const newAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Title is required.").max(200),
  description: z.string().trim().min(12, "Add instructions (at least 12 characters).").max(8000),
  subject: z.string().min(1, "Select a subject."),
  className: z.string().min(1, "Select a class."),
  section: z.string().min(1, "Select a section."),
  dueDate: z.string().min(1, "Set a due date."),
  type: z.enum(["homework", "assignment"]),
});

type NewAssignmentForm = z.infer<typeof newAssignmentSchema>;

type BrowseMode = "item" | "class";

/**
 * A) By item — pick homework/assignment, tap students submitted / not.
 * B) By class — class + section roster with totals.
 */
export function TeacherAssignmentsPage() {
  const portal = useTeacherPortal();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [browseMode, setBrowseMode] = useState<BrowseMode>("item");
  const [categoryType, setCategoryType] = useState<"assignment" | "homework">("homework");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!portal.isTeacher) return;
    setLoading(true);
    teacherRepository.getAssignments().then((list) => {
      setAssignments(list);
      setLoading(false);
    });
  }, [portal.isTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  if (!portal.isTeacher) return null;

  return (
    <div className="min-w-0 space-y-5">
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
            Homework
          </h1>
          <p className="mt-1.5 max-w-2xl break-words text-sm leading-relaxed text-muted-foreground">
            Mark submissions by tap, or review a class overview.
          </p>
        </div>
        <div className="shrink-0">
          <NewAssignmentDialog classes={portal.classes} onCreated={load} />
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["item", "By item"],
            ["class", "By class"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setBrowseMode(mode);
              setSelectedId(null);
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              browseMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {browseMode === "class" ? (
        <ByClassView
          classes={portal.classes}
          categoryType={categoryType}
          onCategoryType={setCategoryType}
        />
      ) : (
        <ByItemView
          assignments={assignments}
          loading={loading}
          categoryType={categoryType}
          onCategoryType={(t) => {
            setCategoryType(t);
            setSelectedId(null);
          }}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          onReload={load}
        />
      )}
    </div>
  );
}

function ByItemView({
  assignments,
  loading,
  categoryType,
  onCategoryType,
  selectedId,
  onSelectId,
  onReload,
}: {
  assignments: TeacherAssignment[];
  loading: boolean;
  categoryType: "assignment" | "homework";
  onCategoryType: (t: "assignment" | "homework") => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onReload: () => void;
}) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

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

  const reloadSubs = useCallback(async (assignmentId: string) => {
    setSubsLoading(true);
    const rows = await teacherRepository.getAssignmentSubmissions(assignmentId);
    setSubmissions(rows);
    setSubsLoading(false);
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setSubmissions([]);
      return;
    }
    void reloadSubs(selected.id);
  }, [selected?.id, reloadSubs]);

  const publishFn = useCallback(
    async (id: string) => {
      await teacherRepository.publishAssignment(id);
      toast.success("Published");
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
      ) : selected ? (
        <SelectedAssignmentDetail
          assignment={selected}
          submissions={submissions}
          subsLoading={subsLoading}
          publishing={publishing}
          onBack={() => onSelectId(null)}
          onPublish={() => void publish(selected.id)}
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

function ByClassView({
  classes,
  categoryType,
  onCategoryType,
}: {
  classes: TeacherClass[];
  categoryType: "assignment" | "homework";
  onCategoryType: (t: "assignment" | "homework") => void;
}) {
  const [className, setClassName] = useState(classes[0]?.className ?? "");
  const [section, setSection] = useState(classes[0]?.section ?? "");
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [rows, setRows] = useState<
    { studentId: string; studentName: string; roll: string; submitted: number; total: number }[]
  >([]);
  const [q, setQ] = useState("");

  const classOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [classes],
  );

  const sectionOptions = useMemo(
    () =>
      [...new Set(classes.filter((c) => c.className === className).map((c) => c.section))].sort(),
    [classes, className],
  );

  const selectedClass = useMemo(
    () => classes.find((c) => c.className === className && c.section === section) ?? null,
    [classes, className, section],
  );

  useEffect(() => {
    if (!sectionOptions.includes(section) && sectionOptions[0]) {
      setSection(sectionOptions[0]);
    }
  }, [sectionOptions, section]);

  useEffect(() => {
    if (!selectedClass) {
      setRows([]);
      setTotalItems(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    teacherRepository
      .getClassSubmissionOverview(selectedClass.id, categoryType)
      .then((data) => {
        if (cancelled) return;
        setTotalItems(data.totalItems);
        setRows(data.students);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass, categoryType]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) => r.studentName.toLowerCase().includes(t) || r.roll.includes(t),
    );
  }, [rows, q]);

  const studentsFullyDone = rows.filter((r) => r.total > 0 && r.submitted === r.total).length;

  return (
    <div className="space-y-4">
      <TypeToggle value={categoryType} onChange={onCategoryType} />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Class">
          <Select
            value={className}
            onValueChange={(v) => {
              setClassName(v);
              const secs = classes.filter((c) => c.className === v).map((c) => c.section);
              if (secs[0]) setSection(secs[0]);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {classOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  Class {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Section">
          <Select value={section} onValueChange={setSection} disabled={!sectionOptions.length}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {sectionOptions.map((sec) => (
                <SelectItem key={sec} value={sec}>
                  Section {sec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {selectedClass ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 shadow-soft sm:px-4">
          <span className="inline-flex items-center rounded-xl bg-primary/12 px-3 py-1.5 text-base font-semibold text-primary">
            Class {selectedClass.className}-{selectedClass.section}
          </span>
          <span className="text-sm text-muted-foreground">
            {totalItems} {categoryType === "homework" ? "homework" : "assignments"} given
          </span>
          <span className="text-sm text-muted-foreground">
            · {studentsFullyDone}/{rows.length} students fully submitted
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-semibold">Students</h3>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or roll"
          className="h-10 max-w-xs rounded-xl"
        />
      </div>

      {loading ? (
        <PageSkeleton rows={5} />
      ) : !selectedClass ? (
        <EmptyState icon={BookOpen} title="Select class and section" description="" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No students"
          description="No roster for this class and section."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {filtered.map((r) => (
            <li
              key={r.studentId}
              className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="mr-2 tabular-nums text-muted-foreground">{r.roll}</span>
                  {r.studentName}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums",
                  r.total > 0 && r.submitted === r.total
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {r.submitted}/{r.total} submitted
              </span>
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
      const next = await teacherRepository.toggleSubmission(row.id);
      if (next) {
        onSubmissionsChange(submissions.map((s) => (s.id === row.id ? next : s)));
        onProgressRefresh();
      }
    } catch (error) {
      if (!isTeacherAccessDenied(error)) throw error;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
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
  const [attachment, setAttachment] = useState<SimpleUploadValue | null>(null);
  const defaultClass = classes[0];
  const form = useForm<NewAssignmentForm>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: defaultClass?.subject ?? "Mathematics",
      className: defaultClass?.className ?? "",
      section: defaultClass?.section ?? "",
      dueDate: "",
      type: "homework",
    },
  });

  const watchedClassName = form.watch("className");

  const classOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [classes],
  );

  const sectionOptions = useMemo(
    () =>
      [
        ...new Set(
          classes.filter((c) => c.className === watchedClassName).map((c) => c.section),
        ),
      ].sort(),
    [classes, watchedClassName],
  );

  useEffect(() => {
    const section = form.getValues("section");
    if (section && !sectionOptions.includes(section) && sectionOptions[0]) {
      form.setValue("section", sectionOptions[0]);
    }
  }, [sectionOptions, form]);

  const createFn = useCallback(
    async (data: NewAssignmentForm) => {
      const match = classes.find(
        (c) => c.className === data.className && c.section === data.section,
      );
      if (!match) {
        toast.error("Select a valid class and section.");
        return;
      }
      await teacherRepository.createAssignment({
        title: data.title,
        description: data.description,
        instructions: data.description,
        subject: data.subject,
        classId: match.id,
        dueDate: data.dueDate,
        type: data.type,
        attachment,
      });
      setOpen(false);
      setAttachment(null);
      form.reset({
        title: "",
        description: "",
        subject: defaultClass?.subject ?? "Mathematics",
        className: defaultClass?.className ?? "",
        section: defaultClass?.section ?? "",
        dueDate: "",
        type: "homework",
      });
      toast.success("Saved as draft.");
      onCreated();
    },
    [attachment, classes, defaultClass, form, onCreated],
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
                name="className"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        const secs = classes
                          .filter((c) => c.className === v)
                          .map((c) => c.section);
                        form.setValue("section", secs[0] ?? "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        {classOptions.map((name) => (
                          <SelectItem key={name} value={name}>
                            Class {name}
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
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!sectionOptions.length}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[100]">
                        {sectionOptions.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            Section {sec}
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
              label="Attachment (optional)"
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

