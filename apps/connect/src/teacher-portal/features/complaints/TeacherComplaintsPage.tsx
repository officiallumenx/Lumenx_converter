import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/PageHeader";
import { teacherRepository } from "@/lib/teacher/repositories";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { ComplaintCard, ComplaintStatusBadge } from "./ComplaintCard";
import { COMPLAINT_STATUS_FILTERS, type ComplaintStatusFilter } from "./complaint-status";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ComplaintStatus, TeacherComplaint } from "@/lib/teacher/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
  cn,
} from "@lumenx/ui";

const schema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  priority: z.enum(["normal", "urgent", "critical"]),
  body: z.string().min(12),
});

export function TeacherComplaintsPage() {
  const [items, setItems] = useState<TeacherComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatusFilter>("all");
  const [respondId, setRespondId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "Infrastructure", priority: "normal", body: "" },
  });

  const load = useCallback(() => {
    setLoading(true);
    teacherRepository.getComplaints().then((c) => { setItems(c); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusCounts = useMemo(() => {
    const counts: Record<ComplaintStatusFilter, number> = {
      all: items.length,
      draft: 0,
      open: 0,
      in_progress: 0,
      forwarded: 0,
      resolved: 0,
      closed: 0,
      archived: 0,
    };
    for (const item of items) counts[item.status] += 1;
    return counts;
  }, [items]);

  const filteredItems = useMemo(
    () => (statusFilter === "all" ? items : items.filter((c) => c.status === statusFilter)),
    [items, statusFilter],
  );

  const updateStatusFn = useCallback(async (id: string, status: ComplaintStatus, resp?: string) => {
    await teacherRepository.updateComplaintStatus(id, status, resp);
    toast.success(`Complaint marked as ${status.replace("_", " ")}`);
    load();
  }, [load]);

  const submitResponseFn = useCallback(async () => {
    if (!respondId || response.trim().length < 8) return;
    await updateStatusFn(respondId, "in_progress", response.trim());
    setRespondId(null);
    setResponse("");
  }, [respondId, response, updateStatusFn]);

  const createFn = useCallback(async (data: z.infer<typeof schema>, draft = false) => {
    await teacherRepository.createComplaint({ ...data, draft });
    toast.success(draft ? "Draft saved" : "Complaint submitted");
    setCreateOpen(false);
    form.reset();
    if (draft) setStatusFilter("draft");
    load();
  }, [form, load]);

  const deleteDraftFn = useCallback(async (id: string) => {
    await teacherRepository.deleteComplaint(id);
    toast.success("Draft deleted");
    load();
  }, [load]);

  const { run: updateStatus, pending: updatingStatus } = useAsyncAction(updateStatusFn);
  const { run: submitResponse, pending: submittingResponse } = useAsyncAction(submitResponseFn);
  const { run: onCreate, pending: creating } = useAsyncAction(createFn);
  const { run: onSaveDraft, pending: savingDraft } = useAsyncAction((data: z.infer<typeof schema>) => createFn(data, true));
  const { run: onDeleteDraft, pending: deletingDraft } = useAsyncAction(deleteDraftFn);

  const actionPending = updatingStatus || submittingResponse || creating || savingDraft || deletingDraft;
  const viewed = viewId ? items.find((c) => c.id === viewId) : null;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Complaints"
        subtitle="Create, track, respond, escalate, or close complaints"
        action={<Button className="rounded-xl gap-2 shadow-glow" onClick={() => setCreateOpen(true)} disabled={actionPending}><Plus className="size-4" /> New complaint</Button>}
      />

      <div className="flex flex-wrap gap-1.5">
        {COMPLAINT_STATUS_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              statusFilter === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {label}
            <span className="ml-1.5 tabular-nums opacity-80">({statusCounts[id]})</span>
          </button>
        ))}
      </div>

      {loading ? <PageSkeleton rows={4} /> : filteredItems.length ? (
        <div className="space-y-3">
          {filteredItems.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              disabled={actionPending}
              onView={(id) => setViewId(id)}
              onRespond={(id) => setRespondId(id)}
              onForward={(id) => updateStatus(id, "forwarded", "Forwarded to admin for review.")}
              onResolve={(id) => updateStatus(id, "resolved")}
              onClose={(id) => updateStatus(id, "closed")}
              onArchive={(id) => updateStatus(id, "archived")}
              onSubmitDraft={(id) => updateStatus(id, "open")}
              onDeleteDraft={(id) => onDeleteDraft(id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title={statusFilter === "all" ? "No complaints" : `No ${COMPLAINT_STATUS_FILTERS.find((f) => f.id === statusFilter)?.label.toLowerCase()} complaints`}
          description={statusFilter === "draft" ? "Save a complaint as draft while filling the form." : "Raise an issue and track it here."}
          action={statusFilter === "all" ? <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>Create complaint</Button> : undefined}
        />
      )}

      <Dialog open={!!respondId} onOpenChange={(o) => !o && setRespondId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Respond to complaint</DialogTitle></DialogHeader>
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Add your response…" className="min-h-[100px] rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondId(null)} className="rounded-xl" disabled={submittingResponse}>Cancel</Button>
            <Button onClick={() => submitResponse()} disabled={response.trim().length < 8 || submittingResponse} className="rounded-xl">
              {submittingResponse ? "Submitting…" : "Submit response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewed} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {viewed?.title}
              {viewed && <ComplaintStatusBadge status={viewed.status} />}
            </DialogTitle>
          </DialogHeader>
          {viewed && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Category:</span> {viewed.category}</p>
              <p><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{viewed.priority}</span></p>
              <p><span className="text-muted-foreground">Created:</span> {viewed.createdAt}</p>
              <p className="whitespace-pre-wrap pt-1">{viewed.body}</p>
              {viewed.response && <p className="rounded-xl bg-muted/40 p-3"><span className="font-medium">Response:</span> {viewed.response}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Create complaint</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onCreate(data))} className="space-y-3">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent position="popper" className="z-[100]">
                      {["Student Issue", "Infrastructure", "Technical", "Administrative"].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating || savingDraft}>Cancel</Button>
                <Button type="button" variant="outline" disabled={creating || savingDraft} onClick={form.handleSubmit((data) => onSaveDraft(data))}>
                  {savingDraft ? "Saving…" : "Save draft"}
                </Button>
                <Button type="submit" disabled={creating || savingDraft}>{creating ? "Submitting…" : "Submit"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
