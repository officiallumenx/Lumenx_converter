import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarOff, BellRing } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { LeaveRequestCard } from "@/components/app/leave/LeaveRequestCard";
import {
  DateRangePickerRow,
} from "@/components/app/attendance/AttendanceDatePicker";
import { LeaveStatusBadge } from "@/components/app/leave/LeaveStatusBadge";
import { leaveStore } from "@/lib/leave-store";
import { teacherLeaveStore } from "@/lib/teacher-leave-store";
import {
  formatLeaveRequestDates,
  isValidLeaveRange,
  leaveDayCount,
  minLeaveDateIso,
  sortLeaveRequests,
} from "@/lib/leave-utils";
import { alertStore } from "@/lib/alert-store";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "@lumenx/ui";
import type { TeacherLeaveRequest } from "@/lib/teacher/types";
import { toast } from "sonner";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";

export function TeacherLeavePage() {
  const portal = useTeacherPortal();
  const [tab, setTab] = useState<"my-leave" | "requests">("requests");
  const [type, setType] = useState<TeacherLeaveRequest["type"]>("casual");
  const [approver, setApprover] = useState<TeacherLeaveRequest["to"]>("admin");
  const minDate = minLeaveDateIso();
  const [fromDate, setFromDate] = useState(minDate);
  const [toDate, setToDate] = useState(minDate);
  const [reason, setReason] = useState("");

  useEffect(() => {
    leaveStore.init();
    teacherLeaveStore.init();
  }, []);

  const requests = useSyncExternalStore(leaveStore.subscribe, leaveStore.getAll, leaveStore.getAll);
  const myRequests = useSyncExternalStore(
    teacherLeaveStore.subscribe,
    teacherLeaveStore.getAll,
    teacherLeaveStore.getAll,
  );

  const pending = useMemo(
    () => sortLeaveRequests(requests.filter((request) => request.status === "pending")),
    [requests],
  );
  const history = useMemo(
    () => sortLeaveRequests(requests.filter((r) => r.status !== "pending")),
    [requests],
  );
  const allAlerts = useSyncExternalStore(
    alertStore.subscribe,
    alertStore.getItems,
    alertStore.getItems,
  );
  const leaveAlerts = useMemo(
    () => allAlerts.filter((alert) => alert.category === "leave"),
    [allAlerts],
  );

  const submitTeacherLeave = () => {
    if (!portal.isTeacher || !portal.profile) {
      toast.error("Teacher profile not loaded yet.");
      return;
    }
    if (!isValidLeaveRange(fromDate, toDate)) {
      toast.error("Invalid dates", {
        description: "Choose valid dates with end on or after start (earliest start: tomorrow).",
      });
      return;
    }
    if (reason.trim().length < 8) {
      toast.error("Add a valid reason (minimum 8 characters).");
      return;
    }

    teacherLeaveStore.submit({
      teacherId: portal.profile.id,
      teacherName: portal.profile.name,
      type,
      to: approver,
      fromDate,
      toDate,
      reason: reason.trim(),
    });

    const days = leaveDayCount({ leaveStartDate: fromDate, leaveEndDate: toDate });
    toast.success("Leave request sent to school office.", {
      description: `${days} day${days > 1 ? "s" : ""} · Pending ${approver === "admin" ? "admin" : "principal"} approval.`,
    });
    setReason("");
    setFromDate(minDate);
    setToDate(minDate);
  };

  if (!portal.isTeacher) {
    return <PageSkeleton rows={5} />;
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        title="Leave management"
        subtitle="Request your own leave or review parent applications from your classes"
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "requests" as const, label: "Parent leave requests" },
            { id: "my-leave" as const, label: "My leave requests" },
          ] satisfies { id: "my-leave" | "requests"; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn("teacher-filter-chip", tab === item.id && "is-active")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "my-leave" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="mb-4 font-semibold">Request leave to Admin / Principal</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Leave type">
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as TeacherLeaveRequest["type"])}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Leave type" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="permission">Short Permission</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Send to">
                <Select
                  value={approver}
                  onValueChange={(value) => setApprover(value as TeacherLeaveRequest["to"])}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Send to" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="admin">School Admin</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3">
              <DateRangePickerRow
                startLabel="From date"
                endLabel="To date"
                startValue={fromDate}
                endValue={toDate}
                startMin={minDate}
                onStartChange={(iso) => {
                  setFromDate(iso);
                  if (toDate < iso) setToDate(iso);
                }}
                onEndChange={setToDate}
                endMin={fromDate || minDate}
                hint={`${leaveDayCount({ leaveStartDate: fromDate, leaveEndDate: toDate })} day${
                  leaveDayCount({ leaveStartDate: fromDate, leaveEndDate: toDate }) > 1 ? "s" : ""
                } selected`}
              />
            </div>
            <Textarea
              rows={4}
              className="mt-3 rounded-xl"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for leave request"
            />
            <div className="mt-3">
              <Button onClick={submitTeacherLeave} className="rounded-xl">
                Submit leave request
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="mb-4 font-semibold">My request history</h2>
            {myRequests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No leave requests raised yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {request.type.toUpperCase()} · {request.fromDate}
                        {request.fromDate !== request.toDate ? ` to ${request.toDate}` : ""}
                      </p>
                      <LeaveStatusBadge status={request.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sent to {request.to === "admin" ? "Admin" : "Principal"} ·{" "}
                      {request.submittedAt}
                    </p>
                    <p className="mt-2 text-sm">{request.reason}</p>
                    {request.reviewedNote ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Note: {request.reviewedNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "requests" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-warning/35 bg-warning/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">
                Pending
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Awaiting your decision</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Leave alerts
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{leaveAlerts.length}</p>
              <Link
                to="/alerts"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View in Alerts <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Processed
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{history.length}</p>
              <p className="text-xs text-muted-foreground">Approved, rejected, or dismissed</p>
            </div>
          </div>

          <section className="rounded-2xl border border-warning/30 bg-card p-4 shadow-soft sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2">
                <BellRing className="size-4 text-warning-foreground" />
                Pending leave alerts
                {pending.length > 0 && (
                  <Badge variant="outline" className="border-warning/40 text-warning-foreground">
                    {pending.length} new
                  </Badge>
                )}
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                All caught up — no leave requests waiting for approval.
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((req) => (
                  <LeaveRequestCard key={req.id} request={req} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="mb-4 font-semibold flex items-center gap-2">
              <CalendarOff className="size-4 text-primary" />
              Recent decisions
            </h2>
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No processed requests yet.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {req.childName} · {formatLeaveRequestDates(req)}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {req.description}
                      </p>
                    </div>
                    <LeaveStatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
