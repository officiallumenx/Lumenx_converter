import { Trash2 } from "lucide-react";

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
  SUBMISSION_STATUS_LABEL,
} from "@/lib/transport/route-setup/types";

import { SubmissionStatusChip } from "./SubmissionStatusChip";

type Props = {
  assignments: StudentStopAssignment[];
  pendingStops: RouteSetupStop[];
  filter: SubmissionStatus;
  onRemove: (assignmentId: string) => void;
  onMove: (assignmentId: string, targetStopId: string) => void;
};

export function MyAssignmentsPanel({
  assignments,
  pendingStops,
  filter,
  onRemove,
  onMove,
}: Props) {
  const filtered = assignments.filter((a) => a.status === filter);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="My Student Assignments"
        subtitle={`${SUBMISSION_STATUS_LABEL[filter]} student ↔ stop links`}
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No {SUBMISSION_STATUS_LABEL[filter].toLowerCase()} assignments yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((assignment) => (
            <li key={assignment.id}>
              <Card>
                <CardContent className="space-y-2 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{assignment.studentName}</p>
                    <SubmissionStatusChip status={assignment.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {assignment.studentClass} · Stop: {assignment.stopName}
                  </p>
                  {assignment.status === "rejected" && assignment.rejectionReason ? (
                    <p className="text-xs text-destructive">
                      Declined · {assignment.rejectionReason}
                    </p>
                  ) : null}
                  {canEditAssignment(assignment) ? (
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                      {pendingStops.length > 0 ? (
                        <FormField id={`move-${assignment.id}`} label="Change pending stop">
                          <select
                            id={`move-${assignment.id}`}
                            className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                            value={assignment.stopId}
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
          ))}
        </ul>
      )}
    </section>
  );
}
