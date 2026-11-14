import { useMemo, useState } from "react";
import { MapPinned, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { SectionHeader } from "@/components/ui/section-header";
import type {
  RouteSetupStop,
  StudentStopAssignment,
  SubmissionStatus,
} from "@/lib/transport/route-setup/types";
import {
  canEditAssignment,
  isRouteEndpointStop,
  needsStopAssignment,
  STOP_NOT_ASSIGNED_LABEL,
  SUBMISSION_STATUS_LABEL,
} from "@/lib/transport/route-setup/types";

import { SubmissionStatusChip } from "./SubmissionStatusChip";

type Props = {
  assignments: StudentStopAssignment[];
  pendingStops: RouteSetupStop[];
  /** Waypoints available for Assign Pickup Stop (not school/parking). */
  assignableStops: RouteSetupStop[];
  /** School + waypoints available for Assign Drop Stop. */
  dropAssignableStops: RouteSetupStop[];
  filter: SubmissionStatus;
  locked?: boolean;
  assigningEnrollmentId?: string | null;
  onRemove: (assignmentId: string) => void;
  onMove: (assignmentId: string, targetStopId: string) => void;
  onAssignPickupStop: (assignmentId: string, pickupStopId: string) => void;
  onAssignDropStop: (assignmentId: string, dropStopId: string) => void;
};

export function MyAssignmentsPanel({
  assignments,
  pendingStops,
  assignableStops,
  dropAssignableStops,
  filter,
  locked = false,
  assigningEnrollmentId = null,
  onRemove,
  onMove,
  onAssignPickupStop,
  onAssignDropStop,
}: Props) {
  const unassigned = useMemo(
    () =>
      assignments.filter(
        (a) => a.status !== "rejected" && needsStopAssignment(a),
      ),
    [assignments],
  );
  const filtered = assignments.filter(
    (a) => a.status === filter && !needsStopAssignment(a),
  );
  const [draftStopByAssignment, setDraftStopByAssignment] = useState<Record<string, string>>(
    {},
  );

  const waypointOptions = useMemo(
    () => assignableStops.filter((s) => !isRouteEndpointStop(s)),
    [assignableStops],
  );

  const renderAssignmentCard = (assignment: StudentStopAssignment) => {
    const needsStop = needsStopAssignment(assignment);
    const draftStopId =
      draftStopByAssignment[assignment.id] ?? waypointOptions[0]?.id ?? "";
    const busy = assigningEnrollmentId === assignment.id;
    const assignedStopName =
      assignment.stopName || assignment.dropStopName || STOP_NOT_ASSIGNED_LABEL;
    return (
      <li key={assignment.id}>
        <Card
          className={
            assignment.status === "rejected"
              ? "border-muted bg-muted/40 opacity-75"
              : needsStop
                ? "border-amber-500/40 bg-amber-500/5"
                : undefined
          }
        >
          <CardContent className="space-y-2 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={
                  assignment.status === "rejected"
                    ? "text-sm font-semibold text-muted-foreground"
                    : "text-sm font-semibold text-foreground"
                }
              >
                {assignment.studentName}
              </p>
              <SubmissionStatusChip status={assignment.status} />
              {needsStop ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Needs stop
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {assignment.studentClass} · Assigned stop:{" "}
              <span className={needsStop ? "font-medium text-foreground" : undefined}>
                {assignedStopName}
              </span>
            </p>
            {assignment.status === "rejected" ? (
              <p className="text-xs font-medium text-muted-foreground">
                Rejected
                {assignment.rejectionReason
                  ? ` · ${assignment.rejectionReason}`
                  : ""}
              </p>
            ) : null}

            {needsStop && !locked ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                {waypointOptions.length > 0 ? (
                  <>
                    <FormField
                      id={`assign-stop-${assignment.id}`}
                      label="Assign Stop"
                    >
                      <select
                        id={`assign-stop-${assignment.id}`}
                        className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                        value={draftStopId}
                        disabled={busy}
                        onChange={(e) =>
                          setDraftStopByAssignment((prev) => ({
                            ...prev,
                            [assignment.id]: e.target.value,
                          }))
                        }
                      >
                        {waypointOptions.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <Button
                      type="button"
                      size="sm"
                      variant="transport"
                      loading={busy}
                      disabled={!draftStopId || busy}
                      onClick={() => {
                        if (!draftStopId) return;
                        onAssignPickupStop(assignment.id, draftStopId);
                      }}
                    >
                      <MapPinned className="size-3" aria-hidden />
                      Assign Stop
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Add a stop on this route first, then assign it here. No stop is chosen
                    automatically.
                  </p>
                )}
              </div>
            ) : null}

            {canEditAssignment(assignment) && !needsStop ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                {pendingStops.length > 0 ? (
                  <FormField id={`move-${assignment.id}`} label="Change pending stop">
                    <select
                      id={`move-${assignment.id}`}
                      className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                      value={assignment.stopId ?? ""}
                      onChange={(e) => onMove(assignment.id, e.target.value)}
                    >
                      {pendingStops.map((stop) => (
                        <option key={stop.id} value={stop.id}>
                          {stop.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemove(assignment.id)}
                >
                  <Trash2 className="size-3" aria-hidden />
                  Remove
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </li>
    );
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        title="My Student Assignments"
        subtitle={
          unassigned.length > 0
            ? `${unassigned.length} enrolled without a pickup stop · ${SUBMISSION_STATUS_LABEL[filter]} links below`
            : `${SUBMISSION_STATUS_LABEL[filter]} student ↔ stop links`
        }
      />

      {unassigned.length > 0 ? (
        <ul className="space-y-2">{unassigned.map(renderAssignmentCard)}</ul>
      ) : null}

      {filtered.length === 0 && unassigned.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No {SUBMISSION_STATUS_LABEL[filter].toLowerCase()} assignments yet.
        </p>
      ) : filtered.length > 0 ? (
        <ul className="space-y-2">{filtered.map(renderAssignmentCard)}</ul>
      ) : null}
    </section>
  );
}
