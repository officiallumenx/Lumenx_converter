import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarOff, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { Button, Textarea, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { LeaveStatusBadge } from "@/components/app/leave/LeaveStatusBadge";
import { LeaveRequestCalendar } from "@/components/app/leave/LeaveRequestCalendar";
import {
  DateRangePickerRow,
  syncCalendarMonthFromIso,
} from "@/components/app/attendance/AttendanceDatePicker";
import { useApp } from "@/lib/app-state";
import { children, getClassTeacherForChild } from "@/lib/mock-data";
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
  const [leaveChildId, setLeaveChildId] = useState(activeChildId ?? children[0]?.id ?? "C1");
  const child = useMemo(
    () => children.find((c) => c.id === leaveChildId) ?? children[0],
    [leaveChildId],
  );
  const classTeacher = useMemo(() => getClassTeacherForChild(child.id), [child.id]);
  const minDate = minLeaveDateIso();
  const [leaveStartDate, setLeaveStartDate] = useState(minDate);
  const [leaveEndDate, setLeaveEndDate] = useState(minDate);
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (activeChildId) setLeaveChildId(activeChildId);
  }, [activeChildId]);

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
  const selectedLeaveDays = leaveDayCount({ leaveStartDate, leaveEndDate });

  const submit = () => {
    const desc = description.trim();
    if (!isValidLeaveRange(leaveStartDate, leaveEndDate)) {
      toast.error("Invalid dates", {
        description:
          "Start and end must be at least one day from today, with end on or after start.",
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
      classTeacherName: classTeacher,
      leaveStartDate,
      leaveEndDate,
      description: desc,
    });
    const days = leaveDayCount({ leaveStartDate, leaveEndDate });
    toast.success("Leave submitted", {
      description: `${days} day${days > 1 ? "s" : ""} sent to ${classTeacher}. You'll get an alert when reviewed.`,
    });
    setDescription("");
    setLeaveStartDate(minDate);
    setLeaveEndDate(minDate);
    setShowForm(false);
  };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Leave management"
        subtitle="Apply leave for your child · routed to their class teacher"
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
              <li>Select the child, then choose leave start and end dates.</li>
              <li>Request goes instantly to the class teacher as a leave alert.</li>
              <li>When approved, attendance is updated for each day in the range.</li>
              <li>You receive an alert when status is approved, rejected, or dismissed.</li>
            </ol>
          </div>
        </div>
      </div>

      {children.length === 1 && (
        <p className="text-xs text-muted-foreground px-1">
          Leave for {child.name} is routed to{" "}
          <span className="font-medium text-primary">{classTeacher}</span> (class teacher).
        </p>
      )}

      {children.length > 1 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Select child</span>
            <Select value={leaveChildId} onValueChange={setLeaveChildId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose child" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.className}-{c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave for <span className="font-medium text-foreground">{child.name}</span> goes to{" "}
            <span className="font-medium text-primary">{classTeacher}</span> (class teacher).
          </p>
        </section>
      )}

      <LeaveRequestCalendar
        year={calYear}
        month={calMonth}
        onMonthChange={(y, m) => {
          setCalYear(y);
          setCalMonth(m);
        }}
        requests={requests}
        rangeStart={showForm ? leaveStartDate : undefined}
        rangeEnd={showForm ? leaveEndDate : undefined}
        minDate={minDate}
        interactive={showForm}
        onRangeSelect={(start, end) => {
          setLeaveStartDate(start);
          setLeaveEndDate(end);
        }}
      />

      {showForm && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarOff className="size-4 text-primary" />
            New leave application
          </h2>

          {children.length === 1 && (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 text-sm">
              <p className="font-semibold text-foreground">{child.name}</p>
              <p className="text-muted-foreground">
                {child.className}-{child.section} · Roll {child.rollNo}
              </p>
              <p className="mt-1 text-xs text-primary font-medium">
                Notification sent to {classTeacher} (class teacher)
              </p>
            </div>
          )}

          {children.length > 1 && (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 text-sm">
              <p className="font-semibold text-foreground">{child.name}</p>
              <p className="text-muted-foreground">
                {child.className}-{child.section} · Roll {child.rollNo}
              </p>
              <p className="mt-1 text-xs text-primary font-medium">
                {classTeacher} will receive the leave alert for approval
              </p>
            </div>
          )}

          <DateRangePickerRow
            startLabel="Leave start"
            endLabel="Leave end"
            startValue={leaveStartDate}
            endValue={leaveEndDate}
            startMin={minDate}
            startPlaceholder="Start date"
            endPlaceholder="End date"
            viewYear={calYear}
            viewMonth={calMonth}
            onStartChange={(iso) => {
              setLeaveStartDate(iso);
              if (leaveEndDate < iso) setLeaveEndDate(iso);
              syncCalendarMonthFromIso(iso, setCalYear, setCalMonth);
            }}
            onEndChange={(iso) => {
              setLeaveEndDate(iso);
              syncCalendarMonthFromIso(iso, setCalYear, setCalMonth);
            }}
            endMin={leaveStartDate || minDate}
            hint={`${selectedLeaveDays} day${selectedLeaveDays > 1 ? "s" : ""} selected`}
          />
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
        <h2 className="mb-4 font-semibold">
          Leave requests · {child.name.split(" ")[0]}
        </h2>
        {requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No leave applications yet for this child.
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
                      {leaveDayCount(req)} day{leaveDayCount(req) > 1 ? "s" : ""} · Applied{" "}
                      {req.appliedAt}
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
