import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Pill,
  EmptyState,
  Modal,
  Field,
  TextArea,
} from "@lumenx/ui-admin";
import { Check, X, CheckCheck, MapPin, Users } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  approveAssignment,
  approveAssignments,
  approveStop,
  approveStops,
  loadPendingAssignmentRequests,
  loadPendingStopRequests,
  rejectAssignment,
  rejectStop,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
  type PendingAssignmentRequest,
  type PendingStopRequest,
} from "@/lib/transport-approval-store";

type Tab = "stops" | "assignments";

type DeclineTarget =
  | { kind: "stop"; id: string; name: string }
  | { kind: "assignment"; id: string; name: string };

const DEFAULT_STOP_REASON = "GPS location is inaccurate.";
const DEFAULT_ASSIGNMENT_REASON = "Student assignment needs correction.";

function formatSubmitted(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  /** When set, only show pending items for this Admin route id */
  routeId?: string | null;
  title?: string;
  hint?: string;
};

export function TransportApprovalPanel({
  routeId = null,
  title = "Pending requests",
  hint = "Review driver stop and student assignment submissions · Approve or Decline with a reason",
}: Props) {
  const notify = useAdminToast();
  const [tab, setTab] = useState<Tab>("stops");
  const [stops, setStops] = useState<PendingStopRequest[]>([]);
  const [assignments, setAssignments] = useState<PendingAssignmentRequest[]>([]);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [declineTarget, setDeclineTarget] = useState<DeclineTarget | null>(null);
  const [declineReason, setDeclineReason] = useState(DEFAULT_STOP_REASON);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const nextStops = loadPendingStopRequests().filter((s) =>
      routeId ? s.routeId === routeId : true,
    );
    const nextAssignments = loadPendingAssignmentRequests().filter((a) =>
      routeId ? a.routeId === routeId : true,
    );
    setStops(nextStops);
    setAssignments(nextAssignments);
  }, [routeId]);

  useEffect(() => {
    refresh();
    window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const openDeclineStop = (stop: PendingStopRequest) => {
    setDeclineTarget({ kind: "stop", id: stop.id, name: stop.name });
    setDeclineReason(DEFAULT_STOP_REASON);
    setDeclineError(null);
  };

  const openDeclineAssignment = (row: PendingAssignmentRequest) => {
    setDeclineTarget({ kind: "assignment", id: row.id, name: row.studentName });
    setDeclineReason(DEFAULT_ASSIGNMENT_REASON);
    setDeclineError(null);
  };

  const confirmDecline = () => {
    if (!declineTarget) return;
    const reason = declineReason.trim();
    if (!reason) {
      setDeclineError("A decline reason is required. The driver will see this text.");
      return;
    }
    if (declineTarget.kind === "stop") {
      rejectStop(declineTarget.id, reason);
      setSelectedStops((prev) => {
        const next = new Set(prev);
        next.delete(declineTarget.id);
        return next;
      });
      notify("Stop declined");
    } else {
      rejectAssignment(declineTarget.id, reason);
      setSelectedAssignments((prev) => {
        const next = new Set(prev);
        next.delete(declineTarget.id);
        return next;
      });
      notify("Assignment declined");
    }
    setDeclineTarget(null);
    refresh();
  };

  const handleApproveStop = (stopId: string) => {
    approveStop(stopId);
    refresh();
    setSelectedStops((prev) => {
      const next = new Set(prev);
      next.delete(stopId);
      return next;
    });
    notify("Stop approved · Active for driver");
  };

  const handleApproveAssignment = (id: string) => {
    approveAssignment(id);
    refresh();
    setSelectedAssignments((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    notify("Assignment approved");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={title} hint={hint} />
        <div className="flex gap-1 border-b border-border px-5 pb-3">
          <button
            type="button"
            onClick={() => setTab("stops")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "stops"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending stops ({stops.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("assignments")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "assignments"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending assignments ({assignments.length})
          </button>
        </div>

        <div className="px-5 py-4">
          {tab === "stops" ? (
            <StopsTab
              stops={stops}
              selected={selectedStops}
              onToggle={(id) =>
                setSelectedStops((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                })
              }
              onApprove={handleApproveStop}
              onDecline={openDeclineStop}
              onApproveSelected={() => {
                if (selectedStops.size === 0) return;
                approveStops(Array.from(selectedStops));
                refresh();
                setSelectedStops(new Set());
                notify(`${selectedStops.size} stop(s) approved`);
              }}
            />
          ) : (
            <AssignmentsTab
              assignments={assignments}
              selected={selectedAssignments}
              onToggle={(id) =>
                setSelectedAssignments((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                })
              }
              onApprove={handleApproveAssignment}
              onDecline={openDeclineAssignment}
              onApproveSelected={() => {
                if (selectedAssignments.size === 0) return;
                approveAssignments(Array.from(selectedAssignments));
                refresh();
                setSelectedAssignments(new Set());
                notify(`${selectedAssignments.size} assignment(s) approved`);
              }}
            />
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title="Decline request"
        subtitle={
          declineTarget
            ? `Driver will see Declined with your reason · ${declineTarget.name}`
            : undefined
        }
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDecline}>
              <X className="size-3.5" /> Decline
            </Button>
          </div>
        }
      >
        <Field label="Reason" required hint="Shown to the Transport driver for Edit & Resubmit">
          <TextArea
            value={declineReason}
            onChange={(e) => {
              setDeclineReason(e.target.value);
              setDeclineError(null);
            }}
            rows={3}
            placeholder={DEFAULT_STOP_REASON}
          />
        </Field>
        {declineError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {declineError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StopsTab({
  stops,
  selected,
  onToggle,
  onApprove,
  onDecline,
  onApproveSelected,
}: {
  stops: PendingStopRequest[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onDecline: (stop: PendingStopRequest) => void;
  onApproveSelected: () => void;
}) {
  if (stops.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="size-5" />}
        title="No pending stops"
        hint="Driver has not submitted any stops for review, or all have been reviewed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onApproveSelected}>
            <CheckCheck className="size-3.5" /> Approve {selected.size} selected
          </Button>
          <span className="text-xs text-muted-foreground">
            {selected.size} of {stops.length} selected
          </span>
        </div>
      ) : null}

      <ul className="space-y-3">
        {stops.map((stop) => (
          <li
            key={stop.id}
            className={`rounded-xl border p-3 transition-colors ${
              selected.has(stop.id) ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(stop.id)}
                onChange={() => onToggle(stop.id)}
                className="mt-1 shrink-0"
                aria-label={`Select ${stop.name}`}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{stop.name}</p>
                  <Pill tone="warning">Pending</Pill>
                  {stop.replacesStopId ? (
                    <Pill tone="neutral">Change request</Pill>
                  ) : null}
                </div>
                <dl className="space-y-1">
                  <DetailRow label="Driver" value={stop.driverName} />
                  <DetailRow label="Bus" value={stop.busNumber} />
                  <DetailRow
                    label="Route"
                    value={`${stop.routeCode} · ${stop.routeName}`}
                  />
                  <DetailRow label="Stop name" value={stop.name} />
                  <DetailRow
                    label="GPS"
                    value={`${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`}
                  />
                  <DetailRow
                    label="Location"
                    value={stop.locationLabel || "—"}
                  />
                  <DetailRow
                    label="Students"
                    value={
                      stop.studentLabels.length > 0
                        ? stop.studentLabels.join(", ")
                        : `${stop.studentIds.length} assigned`
                    }
                  />
                  <DetailRow
                    label="Submitted"
                    value={formatSubmitted(stop.submittedAt ?? stop.timestampCreated)}
                  />
                  <DetailRow label="Status" value="Pending approval" />
                </dl>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" variant="primary" onClick={() => onApprove(stop.id)}>
                  <Check className="size-3" /> Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDecline(stop)}>
                  <X className="size-3" /> Decline
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssignmentsTab({
  assignments,
  selected,
  onToggle,
  onApprove,
  onDecline,
  onApproveSelected,
}: {
  assignments: PendingAssignmentRequest[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onDecline: (row: PendingAssignmentRequest) => void;
  onApproveSelected: () => void;
}) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="No pending assignments"
        hint="Driver has not submitted student assignments, or all have been reviewed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onApproveSelected}>
            <CheckCheck className="size-3.5" /> Approve {selected.size} selected
          </Button>
          <span className="text-xs text-muted-foreground">
            {selected.size} of {assignments.length} selected
          </span>
        </div>
      ) : null}

      <ul className="space-y-3">
        {assignments.map((a) => (
          <li
            key={a.id}
            className={`rounded-xl border p-3 transition-colors ${
              selected.has(a.id) ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => onToggle(a.id)}
                className="mt-1 shrink-0"
                aria-label={`Select ${a.studentName}`}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{a.studentName}</p>
                  <Pill tone="warning">Pending</Pill>
                </div>
                <dl className="space-y-1">
                  <DetailRow label="Driver" value={a.driverName} />
                  <DetailRow label="Bus" value={a.busNumber} />
                  <DetailRow label="Route" value={`${a.routeCode} · ${a.routeName}`} />
                  <DetailRow label="Stop" value={a.stopName} />
                  <DetailRow label="Class" value={a.studentClass} />
                  <DetailRow label="Submitted" value={formatSubmitted(a.createdAt)} />
                  <DetailRow label="Status" value="Pending approval" />
                </dl>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" variant="primary" onClick={() => onApprove(a.id)}>
                  <Check className="size-3" /> Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDecline(a)}>
                  <X className="size-3" /> Decline
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
