import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { routeSetupRepository } from "@/lib/transport/route-setup";
import type { RouteSetupStop, SubmissionStatus } from "@/lib/transport/route-setup/types";
import {
  canEditStop,
  canRequestChangeStop,
  SUBMISSION_STATUS_HINT,
  SUBMISSION_STATUS_LABEL,
} from "@/lib/transport/route-setup/types";

import { SubmissionStatusChip } from "./SubmissionStatusChip";

type Props = {
  stops: RouteSetupStop[];
  filter: SubmissionStatus;
  locked: boolean;
  routeCode: string;
  routeName: string;
  driverName: string;
  busNumber: string;
  onEdit: (stop: RouteSetupStop) => void;
  onDelete: (stopId: string) => void;
  onRequestChange: (stop: RouteSetupStop) => void;
};

export function MyStopsPanel({
  stops,
  filter,
  locked,
  routeCode,
  routeName,
  driverName,
  busNumber,
  onEdit,
  onDelete,
  onRequestChange,
}: Props) {
  const filtered = stops.filter((s) => s.status === filter);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="My Stops"
        subtitle={`${SUBMISSION_STATUS_LABEL[filter]} · ${SUBMISSION_STATUS_HINT[filter]}`}
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No {filter === "pending" ? "stops waiting for Admin" : SUBMISSION_STATUS_LABEL[filter].toLowerCase() + " stops"} yet.
          {filter === "rejected"
            ? " If Admin declines a stop, fix it here and resubmit."
            : filter === "pending"
              ? " Add a stop to send it for approval."
              : ""}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((stop) => {
            const students = routeSetupRepository.studentsByIds(stop.studentIds);
            const editable = !locked && canEditStop(stop);
            const requestChange = !locked && canRequestChangeStop(stop);
            const hasPendingChange =
              stop.status === "approved" &&
              stops.some((s) => s.replacesStopId === stop.id && s.status === "pending");

            return (
              <li key={stop.id}>
                <Card>
                  <CardContent className="space-y-2 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                      <SubmissionStatusChip status={stop.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{stop.locationLabel}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                    </p>

                    {stop.status === "approved" ? (
                      <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                        <p>
                          <span className="font-medium text-foreground">Students assigned:</span>{" "}
                          {students.length > 0
                            ? students.map((s) => s.name).join(", ")
                            : "None"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Route:</span> {routeCode} ·{" "}
                          {routeName}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Driver:</span> {driverName}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Bus:</span> {busNumber}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {stop.studentIds.length} student assignment
                        {stop.studentIds.length === 1 ? "" : "s"}
                      </p>
                    )}

                    {stop.status === "rejected" && stop.rejectionReason ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                        <p className="text-xs font-semibold text-destructive">Declined</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reason: {stop.rejectionReason}
                        </p>
                      </div>
                    ) : null}

                    {hasPendingChange ? (
                      <p className="text-xs font-medium text-amber-600">
                        Change request pending Admin review
                      </p>
                    ) : null}

                    {!locked && (editable || requestChange) ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {requestChange ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onRequestChange(stop)}
                            disabled={hasPendingChange}
                          >
                            <Pencil className="size-3" aria-hidden />
                            Request Change
                          </Button>
                        ) : null}
                        {editable ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(stop)}
                            >
                              <Pencil className="size-3" aria-hidden />
                              {stop.status === "rejected" ? "Edit & Resubmit" : "Edit"}
                            </Button>
                            {stop.status !== "rejected" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => onDelete(stop.id)}
                              >
                                <Trash2 className="size-3" aria-hidden />
                                Remove
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
