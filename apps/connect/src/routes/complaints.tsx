import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Button } from "@lumenx/ui";
import { Input } from "@lumenx/ui";
import { Textarea } from "@lumenx/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { ShieldAlert, Lock, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@lumenx/ui";
import { toast } from "sonner";
import { appendDemoComplaint, loadDemoComplaints, listenDemoSync } from "@lumenx/utils";
import { notifyComplaintSubmitted } from "@lumenx/module-notifications";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@lumenx/ui";
import { TeacherComplaintsPage } from "@/teacher-portal";
import { isApiAuthMode } from "@/auth/auth-mode";
import { LearnerComplaintsApiPanel } from "@/components/app/complaints/LearnerComplaintsApiPanel";

export const Route = createFileRoute("/complaints")({
  head: () => ({ meta: [{ title: "Complaints — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ComplaintsPage />
    </AppShell>
  ),
});

const complaintSchema = z.object({
  title: z.string().trim().min(4, "Enter a clear subject (at least 4 characters).").max(200),
  category: z.string().min(1, "Choose a category."),
  destination: z.enum(["class_teacher", "principal_admin"], {
    required_error: "Choose a destination.",
  }),
  priority: z.enum(["Low", "Medium", "High"], {
    required_error: "Choose a priority level.",
  }),
  body: z
    .string()
    .trim()
    .min(24, "Describe the issue in at least 24 characters so the office can act on it.")
    .max(8000),
});

type ComplaintForm = z.infer<typeof complaintSchema>;

const DEST_LABEL: Record<ComplaintForm["destination"], string> = {
  class_teacher: "Class Teacher",
  principal_admin: "Principal / Admin",
};

const complaintItems = [
  {
    id: "k1",
    childId: "C1",
    title: "Broken projector in Lab 3",
    category: "Infrastructure",
    destination: "principal_admin" as const,
    priority: "Medium",
    status: "Under Review",
  },
  {
    id: "k2",
    childId: "C2",
    title: "Concern about evening cab safety",
    category: "Communication",
    destination: "class_teacher" as const,
    priority: "High",
    status: "Pending",
  },
];

function ComplaintsPage() {
  const { role, activeChildId } = useApp();
  const portal = useParentPortal();
  const [extra, setExtra] = useState(() => loadDemoComplaints());

  useEffect(() => listenDemoSync("complaints", () => setExtra(loadDemoComplaints())), []);

  const list = useMemo(() => {
    const mapped = extra.map((c) => ({
      id: c.id,
      childId: activeChildId ?? "C1",
      title: c.title,
      category: "Submitted",
      destination: c.destination,
      priority: c.priority,
      status: c.status === "pending" ? "Pending" : c.status === "review" ? "Under Review" : "Resolved",
    }));
    const base = role === "parent" ? complaintItems.filter((c) => c.childId === activeChildId) : complaintItems;
    return [...mapped, ...base];
  }, [role, activeChildId, extra]);

  if (role === "teacher") return <TeacherComplaintsPage />;
  if (isApiAuthMode()) return <LearnerComplaintsApiPanel />;

  const childLabel =
    role === "parent" && portal.isParent && portal.snapshot ? portal.snapshot.child.name : null;

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Complaints"
        subtitle={
          childLabel
            ? `Private queue for ${childLabel}. Choose destination — Class Teacher or Principal/Admin. No automatic routing.`
            : "Choose destination — Class Teacher or Principal/Admin. Priority Low / Medium / High. No automatic routing."
        }
        action={<NewComplaint childLabel={childLabel} />}
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

      <div className="min-w-0 space-y-3">
        {list.map((c) => (
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
                  {c.category} • To: {DEST_LABEL[c.destination]} • Priority: {c.priority}
                </div>
              </div>
              <Badge
                className="w-fit shrink-0"
                variant={c.status === "Pending" ? "outline" : "secondary"}
              >
                {c.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewComplaint({ childLabel }: { childLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: "",
      category: "",
      destination: undefined,
      priority: undefined,
      body: "",
    },
  });

  const onSubmit = (data: ComplaintForm) => {
    const id = `CMP-${Date.now()}`;
    appendDemoComplaint({
      id,
      title: data.title,
      from: childLabel ?? "Connect user",
      role: childLabel ? "Parent" : "Student",
      destination: data.destination,
      priority: data.priority,
      status: "pending",
      time: "Just now",
      body: data.body,
    });
    notifyComplaintSubmitted({
      complaintId: id,
      title: data.title,
      requesterRole: childLabel ? "Parent" : "Student",
    });
    setOpen(false);
    form.reset();
    toast.success(`Complaint submitted to ${DEST_LABEL[data.destination]}.`);
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
          <Plus className="size-4" /> Raise complaint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise a complaint</DialogTitle>
          {childLabel && (
            <p className="text-sm text-muted-foreground pt-1">
              This will be tagged for{" "}
              <span className="font-medium text-foreground">{childLabel}</span> (active learner).
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
                    <Textarea
                      rows={5}
                      placeholder="What happened, when, and what outcome you need…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
