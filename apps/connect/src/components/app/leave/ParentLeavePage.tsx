import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarOff, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { Button, Textarea, cn } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LeaveStatusBadge } from "@/components/app/leave/LeaveStatusBadge";
import { useApp } from "@/lib/app-state";
import { children } from "@/lib/mock-data";
import { leaveStore } from "@/lib/leave-store";
import {
  formatLeaveRequestDates,
  isValidLeaveRange,
  leaveDayCount,
  minLeaveDateIso,
  sortLeaveRequests,
} from "@/lib/leave-utils";

export function ParentLeavePage() {
  const { activeChildId } = useApp();
  const child = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? children[0],
    [activeChildId],
  );
  const minDate = minLeaveDateIso();
  const [leaveStartDate, setLeaveStartDate] = useState(minDate);
  const [leaveEndDate, setLeaveEndDate] = useState(minDate);
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    leaveStore.init();
  }, []);

  const allRequests = useSyncExternalStore(
    leaveStore.subscribe,
    leaveStore.getAll,
    leaveStore.getAll,
  );
  const requests = useMemo(
    () => sortLeaveRequests(leaveStore.getForChild(child.id)),
    [allRequests, child.id],
  );

  const submit = () => {
    const desc = description.trim();
    if (!isValidLeaveRange(leaveStartDate, leaveEndDate)) {
      toast.error("Invalid dates", {
        description: "Start and end must be at least one day from today, with end on or after start.",
      });
      return;
    }
    if (desc.length < 10) {
      toast.error("Add a short reason", { description: "Minimum 10 characters." });
      return;
    }
    leaveStore.applyLeave({
      childId: child.id,
      childName: child.name,
      className: child.className,
      section: child.section,
      leaveStartDate,
      leaveEndDate,
      description: desc,
    });
    const days = leaveDayCount({ leaveStartDate, leaveEndDate });
    toast.success("Leave submitted", {
      description: `${days} day${days > 1 ? "s" : ""} sent to class teacher. You'll get an alert when reviewed.`,
    });
    setDescription("");
    setLeaveStartDate(minDate);
    setLeaveEndDate(minDate);
    setShowForm(false);
  };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <ChildSwitcher />

      <PageHeader
        title="Leave management"
        subtitle={`Apply leave for ${child.name.split(" ")[0]} · Submit at least 1 day before the first leave day`}
        action={
          !showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="size-4 mr-1.5" />
              Apply leave
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="flex gap-2">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs leading-relaxed">
              <li>Select leave start and end dates (earliest start: tomorrow).</li>
              <li>Request goes instantly to the class teacher as a leave alert.</li>
              <li>When approved, attendance is updated for each day in the range.</li>
              <li>You receive an alert when status is approved, rejected, or dismissed.</li>
            </ol>
          </div>
        </div>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarOff className="size-4 text-primary" />
            New leave application
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Leave start date</span>
              <input
                type="date"
                min={minDate}
                value={leaveStartDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setLeaveStartDate(next);
                  if (leaveEndDate < next) setLeaveEndDate(next);
                }}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Leave end date</span>
              <input
                type="date"
                min={leaveStartDate || minDate}
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                {leaveDayCount({ leaveStartDate, leaveEndDate })} day
                {leaveDayCount({ leaveStartDate, leaveEndDate }) > 1 ? "s" : ""} selected
              </span>
            </label>
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground sm:col-span-2">
              <p className="font-medium text-foreground">{child.name}</p>
              <p>
                {child.className}-{child.section} · Roll {child.rollNo}
              </p>
              <p className="mt-1">Sent to class teacher for approval</p>
            </div>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Reason / description</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Family function, medical appointment, travel…"
              rows={4}
              className="resize-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit}>Submit to class teacher</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <h2 className="mb-4 font-semibold">Your leave requests</h2>
        {requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No leave applications yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <article
                key={req.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  req.status === "pending" ? "border-warning/35 bg-warning/5" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{formatLeaveRequestDates(req)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {leaveDayCount(req)} day{leaveDayCount(req) > 1 ? "s" : ""} · Applied {req.appliedAt}
                      {req.updatedAt !== req.appliedAt && ` · Updated ${req.updatedAt}`}
                    </p>
                  </div>
                  <LeaveStatusBadge status={req.status} />
                </div>
                <p className="mt-2 text-sm text-foreground/90">{req.description}</p>
                {req.teacherNote && (
                  <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Class teacher: </span>
                    {req.teacherNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
