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
  DROP_STOP_NOT_ASSIGNED_LABEL,
  isRouteEndpointStop,
  needsDropStopAssignment,
  needsPickupStopAssignment,
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
        (a) =>
          a.status !== "rejected" &&
          (needsPickupStopAssignment(a) || needsDropStopAssignment(a)),
      ),
    [assignments],
  );
  const filtered = assignments.filter(
    (a) =>
      a.status === filter &&
      !needsPickupStopAssignment(a) &&
      !needsDropStopAssignment(a),
  );
  const [draftStopByAssignment, setDraftStopByAssignment] = useState<Record<string, string>>(
    {},
  );
  const [draftDropByAssignment, setDraftDropByAssignment] = useState<Record<string, string>>(
    {},
  );

  const waypointOptions = useMemo(
    () => assignableStops.filter((s) => !isRouteEndpointStop(s)),
    [assignableStops],
  );

  const dropOptions = useMemo(() => dropAssignableStops, [dropAssignableStops]);

  const renderAssignmentCard = (assignment: StudentStopAssignment) => {
    const needsPickup = needsPickupStopAssignment(assignment);
    const needsDrop = needsDropStopAssignment(assignment);
    const draftStopId =
      draftStopByAssignment[assignment.id] ?? waypointOptions[0]?.id ?? "";
    const draftDropId =
      draftDropByAssignment[assignment.id] ?? dropOptions[0]?.id ?? "";
    const busy = assigningEnrollmentId === assignment.id;
    return (
      <li key={assignment.id}>
        <Card
          className={
            needsPickup || needsDrop ? "border-amber-500/40 bg-amber-500/5" : undefined
          }
        >
          <CardContent className="space-y-2 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{assignment.studentName}</p>
              <SubmissionStatusChip status={assignment.status} />
              {needsPickup ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Needs pickup stop
                </span>
              ) : null}
              {needsDrop && !needsPickup ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Needs drop stop
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {assignment.studentClass} · Pickup:{" "}
              <span className={needsPickup ? "font-medium text-foreground" : undefined}>
                {assignment.stopName || STOP_NOT_ASSIGNED_LABEL}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Drop:{" "}
              <span className={needsDrop ? "font-medium text-foreground" : undefined}>
                {assignment.dropStopName || DROP_STOP_NOT_ASSIGNED_LABEL}
              </span>
            </p>
            {assignment.status === "rejected" && assignment.rejectionReason ? (
              <p className="text-xs text-destructive">
                Declined · {assignment.rejectionReason}
              </p>
            ) : null}

            {needsPickup && !locked ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                {waypointOptions.length > 0 ? (
                  <>
                    <FormField
                      id={`assign-pickup-${assignment.id}`}
                      label="Assign Pickup Stop"
                    >
                      <select
                        id={`assign-pickup-${assignment.id}`}
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
                      Assign Pickup Stop
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Add a pickup stop on this route first, then assign it here. No stop is chosen
                    automatically.
                  </p>
                )}
              </div>
            ) : null}

            {needsDrop && !locked ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                {dropOptions.length > 0 ? (
                  <>
                    <FormField id={`assign-drop-${assignment.id}`} label="Assign Drop Stop">
                      <select
                        id={`assign-drop-${assignment.id}`}
                        className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                        value={draftDropId}
                        disabled={busy}
                        onChange={(e) =>
                          setDraftDropByAssignment((prev) => ({
                            ...prev,
                            [assignment.id]: e.target.value,
                          }))
                        }
                      >
                        {dropOptions.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={busy}
                      disabled={!draftDropId || busy}
                      onClick={() => {
                        if (!draftDropId) return;
                        onAssignDropStop(assignment.id, draftDropId);
                      }}
                    >
                      <MapPinned className="size-3" aria-hidden />
                      Assign Drop Stop
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ask Admin to set School, or add a drop stop first. No stop is chosen
                    automatically.
                  </p>
                )}
              </div>
            ) : null}

            {canEditAssignment(assignment) && !needsPickup ? (
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
