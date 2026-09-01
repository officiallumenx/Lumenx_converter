import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  cancelPendingLeave,
  loadParentLeaveRequests,
  submitStudentLeave,
  toLeaveBadgeStatus,
  type ConnectLeaveRequest,
} from "@/lib/leave";
import type { StudentDto } from "@/lib/students/types";

export function ParentLeavePage() {
  const apiMode = isApiAuthMode();
  if (apiMode) return <ApiParentLeavePage />;
  return <DemoParentLeavePage />;
}

function DemoParentLeavePage() {
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
    <ParentLeaveLayout
      childName={child.name}
      childClassLabel={`${child.className}-${child.section}`}
      classTeacher={classTeacher}
      childrenOptions={children.map((c) => ({
        id: c.id,
        label: `${c.name} · ${c.className}-${c.section}`,
      }))}
      selectedChildId={leaveChildId}
      onChildChange={setLeaveChildId}
      showMultiChild={children.length > 1}
      rollNo={child.rollNo}
      minDate={minDate}
      leaveStartDate={leaveStartDate}
      leaveEndDate={leaveEndDate}
      onLeaveStartChange={setLeaveStartDate}
      onLeaveEndChange={setLeaveEndDate}
      description={description}
      onDescriptionChange={setDescription}
      showForm={showForm}
      onShowForm={setShowForm}
      calYear={calYear}
      calMonth={calMonth}
      onMonthChange={(y, m) => {
        setCalYear(y);
        setCalMonth(m);
      }}
      selectedLeaveDays={selectedLeaveDays}
      onSubmit={submit}
      requests={requests}
    />
  );
}

function ApiParentLeavePage() {
  const { activeChildId, activeInstituteId, setActiveChildId } = useApp();
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [requests, setRequests] = useState<ConnectLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [leaveChildId, setLeaveChildId] = useState(activeChildId);
  const minDate = minLeaveDateIso();
  const [leaveStartDate, setLeaveStartDate] = useState(minDate);
  const [leaveEndDate, setLeaveEndDate] = useState(minDate);
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadParentLeaveRequests({
      instituteId: activeInstituteId,
      studentId: leaveChildId || null,
    }).then((result) => {
      if (cancelled) return;
      setStudents(result.students);
      setRequests(sortLeaveRequests(result.items));
      setLoading(false);
      if (result.students.length > 0) {
        const valid =
          leaveChildId && result.students.some((s) => s.id === leaveChildId);
        const next = valid
          ? leaveChildId
          : result.students.find((s) => s.id === activeChildId)?.id ??
            result.students[0]!.id;
        if (next !== leaveChildId) {
          setLeaveChildId(next);
          setActiveChildId(next);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, leaveChildId, reloadKey, activeChildId, setActiveChildId]);

  const child = useMemo(
    () => students.find((s) => s.id === leaveChildId) ?? students[0],
    [students, leaveChildId],
  );

  const selectedLeaveDays = leaveDayCount({ leaveStartDate, leaveEndDate });

  const submit = () => {
    if (!activeInstituteId || !child) {
      toast.error("Institute or child not loaded yet.");
      return;
    }
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
    void submitStudentLeave({
      instituteId: activeInstituteId,
      studentId: child.id,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: desc,
    })
      .then(() => {
        const days = leaveDayCount({ leaveStartDate, leaveEndDate });
        toast.success("Leave submitted", {
          description: `${days} day${days > 1 ? "s" : ""} sent to class teacher.`,
        });
        setDescription("");
        setLeaveStartDate(minDate);
        setLeaveEndDate(minDate);
        setShowForm(false);
        refresh();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to submit leave");
      });
  };

  const cancelRequest = (id: string) => {
    void cancelPendingLeave(id)
      .then(() => {
        toast.success("Leave request cancelled");
        refresh();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to cancel leave");
      });
  };

  if (loading && !child) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Loading leave…</p>
    );
  }

  if (!child) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No linked students found for leave applications.
      </p>
    );
  }

  const childLabel = `${child.classLabel ?? "Class"}-${child.sectionLabel ?? "—"}`;

  return (
    <ParentLeaveLayout
      childName={child.displayName}
      childClassLabel={childLabel}
      classTeacher="class teacher"
      childrenOptions={students.map((s) => ({
        id: s.id,
        label: `${s.displayName} · ${s.classLabel ?? "Class"}-${s.sectionLabel ?? "—"}`,
      }))}
      selectedChildId={child.id}
      onChildChange={(id) => {
        setLeaveChildId(id);
        setActiveChildId(id);
      }}
      showMultiChild={students.length > 1}
      rollNo={child.rollNo ?? "—"}
      minDate={minDate}
      leaveStartDate={leaveStartDate}
      leaveEndDate={leaveEndDate}
      onLeaveStartChange={setLeaveStartDate}
      onLeaveEndChange={setLeaveEndDate}
      description={description}
      onDescriptionChange={setDescription}
      showForm={showForm}
      onShowForm={setShowForm}
      calYear={calYear}
      calMonth={calMonth}
      onMonthChange={(y, m) => {
        setCalYear(y);
        setCalMonth(m);
      }}
      selectedLeaveDays={selectedLeaveDays}
      onSubmit={submit}
      requests={requests}
      onCancelPending={cancelRequest}
    />
  );
}

type LayoutRequest = ConnectLeaveRequest | ReturnType<typeof leaveStore.getForChild>[number];

function ParentLeaveLayout({
  childName,
  childClassLabel,
  classTeacher,
  childrenOptions,
  selectedChildId,
  onChildChange,
  showMultiChild,
  rollNo,
  minDate,
  leaveStartDate,
  leaveEndDate,
  onLeaveStartChange,
  onLeaveEndChange,
  description,
  onDescriptionChange,
  showForm,
  onShowForm,
  calYear,
  calMonth,
  onMonthChange,
  selectedLeaveDays,
  onSubmit,
  requests,
  onCancelPending,
}: {
  childName: string;
  childClassLabel: string;
  classTeacher: string;
  childrenOptions: { id: string; label: string }[];
  selectedChildId: string;
  onChildChange: (id: string) => void;
  showMultiChild: boolean;
  rollNo: string;
  minDate: string;
  leaveStartDate: string;
  leaveEndDate: string;
  onLeaveStartChange: (iso: string) => void;
  onLeaveEndChange: (iso: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  showForm: boolean;
  onShowForm: (open: boolean) => void;
  calYear: number;
  calMonth: number;
  onMonthChange: (year: number, month: number) => void;
  selectedLeaveDays: number;
  onSubmit: () => void;
  requests: LayoutRequest[];
  onCancelPending?: (id: string) => void;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Leave management"
        subtitle="Apply leave for your child · routed to their class teacher"
        action={
          !showForm ? (
            <Button size="sm" onClick={() => onShowForm(true)}>
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
              <li>You receive an alert when status is approved or ignored.</li>
            </ol>
          </div>
        </div>
      </div>

      {!showMultiChild && (
        <p className="text-xs text-muted-foreground px-1">
          Leave for {childName} is routed to{" "}
          <span className="font-medium text-primary">{classTeacher}</span> (class teacher).
        </p>
      )}

      {showMultiChild && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Select child</span>
            <Select value={selectedChildId} onValueChange={onChildChange}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose child" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {childrenOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave for <span className="font-medium text-foreground">{childName}</span> goes to{" "}
            <span className="font-medium text-primary">{classTeacher}</span> (class teacher).
          </p>
        </section>
      )}

      <LeaveRequestCalendar
        year={calYear}
        month={calMonth}
        onMonthChange={onMonthChange}
        requests={requests}
        rangeStart={showForm ? leaveStartDate : undefined}
        rangeEnd={showForm ? leaveEndDate : undefined}
        minDate={minDate}
        interactive={showForm}
        onRangeSelect={(start, end) => {
          onLeaveStartChange(start);
          onLeaveEndChange(end);
        }}
      />

      {showForm && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarOff className="size-4 text-primary" />
            New leave application
          </h2>

          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 text-sm">
            <p className="font-semibold text-foreground">{childName}</p>
            <p className="text-muted-foreground">
              {childClassLabel} · Roll {rollNo}
            </p>
            <p className="mt-1 text-xs text-primary font-medium">
              Notification sent to {classTeacher} (class teacher)
            </p>
          </div>

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
              onLeaveStartChange(iso);
              if (leaveEndDate < iso) onLeaveEndChange(iso);
              syncCalendarMonthFromIso(iso, (y) => onMonthChange(y, calMonth), (m) =>
                onMonthChange(calYear, m),
              );
            }}
            onEndChange={(iso) => {
              onLeaveEndChange(iso);
              syncCalendarMonthFromIso(iso, (y) => onMonthChange(y, calMonth), (m) =>
                onMonthChange(calYear, m),
              );
            }}
            endMin={leaveStartDate || minDate}
            hint={`${selectedLeaveDays} day${selectedLeaveDays > 1 ? "s" : ""} selected`}
          />
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Reason / description</span>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="e.g. Family function, medical appointment, travel…"
              rows={4}
              className="resize-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSubmit}>Submit to class teacher</Button>
            <Button variant="outline" onClick={() => onShowForm(false)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <h2 className="mb-4 font-semibold">Leave requests · {childName.split(" ")[0]}</h2>
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
                  <LeaveStatusBadge status={toLeaveBadgeStatus(req.status)} />
                </div>
                <p className="mt-2 text-sm text-foreground/90">{req.description}</p>
                {req.teacherNote && (
                  <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Class teacher: </span>
                    {req.teacherNote}
                  </p>
                )}
                {req.status === "pending" && onCancelPending ? (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => onCancelPending(req.id)}>
                      Cancel request
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
