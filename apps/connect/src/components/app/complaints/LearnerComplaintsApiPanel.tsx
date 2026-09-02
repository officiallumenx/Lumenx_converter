import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import {
  DEFAULT_DESTINATION,
  loadLearnerComplaints,
  submitLearnerComplaint,
  type ConnectComplaintItem,
} from "@/lib/complaints";
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lumenx/ui";
import { Lock, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const complaintSchema = z.object({
  title: z.string().trim().min(4).max(200),
  category: z.string().min(1),
  destination: z.enum(["class_teacher", "principal_admin"]),
  priority: z.enum(["Low", "Medium", "High"]),
  body: z.string().trim().min(24).max(8000),
});

type ComplaintForm = z.infer<typeof complaintSchema>;

const DEST_LABEL: Record<ComplaintForm["destination"], string> = {
  class_teacher: "Class Teacher",
  principal_admin: "Principal / Admin",
};

type MeResponse = {
  identities: {
    students: Array<{ instituteId: string; studentId: string }>;
  };
};

export function LearnerComplaintsApiPanel() {
  const { role, activeInstituteId, activeChildId } = useApp();
  const portal = useParentPortal();
  const [items, setItems] = useState<ConnectComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const childLabel =
    role === "parent" && portal.isParent && portal.snapshot
      ? portal.snapshot.child.name
      : null;

  useEffect(() => {
    if (!activeInstituteId || role === "teacher") return;
    let cancelled = false;

    if (role === "student") {
      void getConnectApiClient()
        .get<MeResponse>("/api/v1/me")
        .then((me) => {
          if (cancelled) return;
          const identity =
            me.identities.students.find((s) => s.instituteId === activeInstituteId) ?? null;
          setStudentId(identity?.studentId ?? null);
        });
    } else if (role === "parent") {
      setStudentId(activeChildId || portal.snapshot?.child.id || null);
    }

    return () => {
      cancelled = true;
    };
  }, [role, activeInstituteId, activeChildId, portal.snapshot?.child.id]);

  const load = useCallback(async () => {
    if (!activeInstituteId) {
      setLoading(false);
      setError("Select an institute to view complaints.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadLearnerComplaints({
      instituteId: activeInstituteId,
      studentId: role === "parent" ? studentId : studentId,
    });
    if (result.status === "ready") {
      setItems(result.items);
    } else if (result.status === "empty") {
      setItems([]);
    } else if (result.status === "error") {
      setError(result.message);
      setItems([]);
    }
    setLoading(false);
  }, [activeInstituteId, role, studentId]);

  useEffect(() => {
    if (!isApiAuthMode()) return;
    if (role === "student" && !studentId) return;
    void load();
  }, [load, reloadKey, role, studentId]);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Complaints"
        subtitle={
          childLabel
            ? `Private queue for ${childLabel}. Choose destination — Class Teacher or Principal/Admin.`
            : "Choose destination — Class Teacher or Principal/Admin. Priority Low / Medium / High."
        }
        action={
          <LearnerNewComplaint
            instituteId={activeInstituteId}
            studentId={role === "parent" ? studentId : studentId}
            childLabel={childLabel}
            onCreated={() => setReloadKey((k) => k + 1)}
          />
        }
      />

      <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-start">
        <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 text-sm">
          <div className="font-medium">Destination required</div>
          <div className="break-words text-muted-foreground">
            You must pick Class Teacher or Principal/Admin. Complaints are not auto-routed.
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground px-1">Loading complaints…</p>
      ) : error ? (
        <p className="text-sm text-destructive px-1">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No complaints yet.</p>
      ) : (
        <div className="min-w-0 space-y-3">
          {items.map((c) => (
            <div
              key={c.id}
              className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-2">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                    <h3 className="font-semibold leading-snug break-words">{c.title}</h3>
                  </div>
                  <div className="mt-1 break-words text-xs text-muted-foreground">
                    {c.category} • To: {DEST_LABEL[c.destination]} • Priority: {c.priorityLabel}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{c.body}</p>
                  {c.responseNote ? (
                    <p className="mt-2 rounded-xl bg-muted/40 p-3 text-sm">
                      <span className="font-medium">Response:</span> {c.responseNote}
                    </p>
                  ) : null}
                </div>
                <Badge
                  className="w-fit shrink-0"
                  variant={c.status === "pending" ? "outline" : "secondary"}
                >
                  {c.statusLabel}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LearnerNewComplaint({
  instituteId,
  studentId,
  childLabel,
  onCreated,
}: {
  instituteId: string | null;
  studentId: string | null;
  childLabel: string | null;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: "",
      category: "",
      destination: DEFAULT_DESTINATION,
      priority: "Medium",
      body: "",
    },
  });

  const onSubmit = async (data: ComplaintForm) => {
    if (!instituteId) {
      toast.error("Select an institute first.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLearnerComplaint({
        instituteId,
        title: data.title,
        body: data.body,
        category: data.category,
        destination: data.destination,
        priority: data.priority,
        studentId,
      });
      toast.success(`Complaint submitted to ${DEST_LABEL[data.destination]}.`);
      setOpen(false);
      form.reset({ destination: DEFAULT_DESTINATION, priority: "Medium" });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) form.reset({ destination: DEFAULT_DESTINATION, priority: "Medium" });
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-glow">
          <Plus className="size-4" /> Raise complaint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise a complaint</DialogTitle>
          {childLabel && (
            <p className="text-sm text-muted-foreground pt-1">
              Tagged for <span className="font-medium text-foreground">{childLabel}</span>.
            </p>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Short summary" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "Academic",
                          "Discipline",
                          "Infrastructure",
                          "Communication",
                          "Teacher concerns",
                        ].map((s) => (
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
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="class_teacher">Class Teacher</SelectItem>
                        <SelectItem value="principal_admin">Principal / Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Low", "Medium", "High"].map((s) => (
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
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="What happened…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
