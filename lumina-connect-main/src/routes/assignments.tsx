import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { assignments, subjects, assignmentSubmissions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Upload, Calendar, Users, Filter, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Assignments — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AssignmentsPage />
    </AppShell>
  ),
});

const newAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Title is required.").max(200),
  description: z.string().trim().min(12, "Add instructions (at least 12 characters).").max(8000),
  subject: z.string().min(1, "Select a subject."),
  className: z.string().min(1, "Select a class."),
  due: z.string().min(1, "Set a due date."),
});

type NewAssignmentForm = z.infer<typeof newAssignmentSchema>;

const submissionSchema = z.object({
  note: z.string().trim().min(10, "Describe your submission (min. 10 characters).").max(4000),
});

function AssignmentsPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const parentSubtitle =
    role === "parent" && portal.isParent && portal.snapshot
      ? `Work for ${portal.snapshot.child.name} (${portal.snapshot.classTag})`
      : "Stay on top of upcoming work";

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Assignments"
        subtitle={role === "teacher" ? "Create & track homework for your classes" : parentSubtitle}
        action={role === "teacher" ? <NewAssignment /> : undefined}
      />

      {role === "teacher" && <TeacherSubmissionConsole />}

      <Tabs defaultValue="pending" className="mt-6 w-full min-w-0">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        {(["pending", "submitted", "all"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <List filter={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function List({ filter }: { filter: "pending" | "submitted" | "all" }) {
  const { role, studentIncludedMode } = useApp();
  const portal = useParentPortal();
  const source =
    role === "parent" && portal.isParent && portal.snapshot
      ? portal.snapshot.assignments
      : assignments;
  const items = source.filter((a) => (filter === "all" ? true : a.status === filter));
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((a) => (
        <AssignmentCard key={a.id} a={a} role={role} />
      ))}
      {!items.length && (
        <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  a,
  role,
}: {
  a: (typeof assignments)[number];
  role: ReturnType<typeof useApp>["role"];
}) {
  const { studentIncludedMode } = useApp();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const confirmSubmit = async () => {
    const parsed = submissionSchema.safeParse({ note });
    if (!parsed.success) {
      setNoteError(parsed.error.flatten().fieldErrors.note?.[0] ?? "Invalid note");
      return;
    }
    const input = fileRef.current;
    const files = input?.files;
    if (!files?.length) {
      setFileErr("Attach at least one file (PDF, Word, or image).");
      return;
    }
    const list = [...files];
    const ok = list.every((f) => {
      if (f.size > 8 * 1024 * 1024) return false;
      const byMime =
        /pdf|word|msword|document|png|jpe?g|webp|gif/i.test(f.type || "") ||
        f.type === "application/octet-stream";
      const byName = /\.(pdf|docx?|png|jpe?g|webp|gif)$/i.test(f.name);
      return byMime || byName;
    });
    if (!ok) {
      setFileErr("Allowed: PDF, DOC/DOCX, PNG, JPG, WebP, GIF — max 8 MB each.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 520));
      setFileErr(null);
      setNoteError(null);
      setSubmitOpen(false);
      setNote("");
      setFileLabel("");
      if (input) input.value = "";
      toast.success(`Submitted ${files.length} file(s) with your note.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="size-5" />
        </div>
        <Badge
          variant={a.status === "submitted" ? "secondary" : "outline"}
          className="shrink-0 text-[10px] capitalize sm:text-xs"
        >
          {a.status}
        </Badge>
      </div>
      <h3 className="mt-3 line-clamp-2 font-semibold leading-snug break-words">{a.title}</h3>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {a.subject} • {a.class}
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" /> Due {a.due}
        </div>
        {(role === "student" || (role === "parent" && studentIncludedMode)) &&
          a.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg"
              onClick={() => setSubmitOpen(true)}
            >
              <Upload className="size-3.5" /> Submit
            </Button>
          )}
      </div>

      <AlertDialog
        open={submitOpen}
        onOpenChange={(o) => {
          if (!o && submitting) return;
          setSubmitOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm you are ready to submit. Add a brief note describing what you are turning in
              (required).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="asg-files">
                Files (required)
              </label>
              <Input
                id="asg-files"
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,image/*"
                className="mt-1.5 cursor-pointer"
                onChange={(e) => {
                  setFileErr(null);
                  const names = e.target.files?.length
                    ? [...e.target.files].map((f) => f.name).join(", ")
                    : "";
                  setFileLabel(names);
                }}
              />
              {fileLabel && (
                <p className="mt-1 text-xs text-muted-foreground break-all">{fileLabel}</p>
              )}
              {fileErr && <p className="mt-1 text-xs text-destructive">{fileErr}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="asg-note">
                Submission note
              </label>
              <Textarea
                id="asg-note"
                rows={4}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(null);
                }}
                placeholder="e.g. Completed all exercises; main proof in PDF page 2…"
                className={noteError ? "border-destructive" : ""}
              />
              {noteError && <p className="mt-1 text-xs text-destructive">{noteError}</p>}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} onClick={() => setNote("")}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={submitting}
              className="gap-2 rounded-md sm:mt-0"
              onClick={() => void confirmSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Submit work"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const TIMING_LABEL = {
  on_time: "On time",
  late: "Late",
  early: "Early",
} as const;

function TeacherSubmissionConsole() {
  const defaultId =
    assignments.find((a) => a.status === "submitted")?.id ?? assignments[0]?.id ?? "";
  const [assignmentId, setAssignmentId] = useState(defaultId);
  const [q, setQ] = useState("");
  const [timing, setTiming] = useState<"all" | keyof typeof TIMING_LABEL>("all");

  const rows = useMemo(() => {
    let r = assignmentSubmissions.filter((s) => s.assignmentId === assignmentId);
    const qq = q.trim().toLowerCase();
    if (qq) {
      r = r.filter(
        (s) => s.studentName.toLowerCase().includes(qq) || s.roll.toLowerCase().includes(qq),
      );
    }
    if (timing !== "all") r = r.filter((s) => s.timing === timing);
    return r;
  }, [assignmentId, q, timing]);

  return (
    <div className="mb-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Users className="size-4 text-primary" />
        <h3 className="font-semibold">Submissions & tracking</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Filter by assignment, student name or roll number, and submission timing (early, on time, or
        late).
      </p>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 sm:min-w-[14rem]">
          <label className="text-xs font-medium text-muted-foreground">Assignment</label>
          <select
            className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} · {a.class}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label className="text-xs font-medium text-muted-foreground">Search name or roll</label>
          <Input
            className="mt-1 rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. 14 or Aarav"
          />
        </div>
        <div className="min-w-0 sm:w-44">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="size-3" /> Timing
          </label>
          <select
            className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={timing}
            onChange={(e) => setTiming(e.target.value as typeof timing)}
          >
            <option value="all">All</option>
            <option value="early">Early</option>
            <option value="on_time">On time</option>
            <option value="late">Late</option>
          </select>
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="min-w-[10rem]">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No submissions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.assignmentId}-${r.roll}-${r.studentName}`}>
                  <TableCell className="font-medium tabular-nums">{r.roll}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIMING_LABEL[r.timing]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {r.submittedAt}
                  </TableCell>
                  <TableCell className="max-w-[14rem] min-w-0 truncate text-sm sm:max-w-[20rem]">
                    {r.note}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewAssignment() {
  const [open, setOpen] = useState(false);
  const form = useForm<NewAssignmentForm>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      className: "",
      due: "",
    },
  });

  const onSubmit = (data: NewAssignmentForm) => {
    void data;
    setOpen(false);
    form.reset();
    toast.success("Assignment published to your classes.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-glow">
          <Plus className="size-4" /> New
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create assignment</DialogTitle>
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((s) => (
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["8-A", "9-A", "10-A", "10-B"].map((s) => (
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
            </div>
            <FormField
              control={form.control}
              name="due"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Publish</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
