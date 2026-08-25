import { ArrowDown, ArrowUp, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { routeSetupRepository } from "@/lib/transport/route-setup";
import type { RouteSetupStop } from "@/lib/transport/route-setup/types";
import { canEditStop, canRequestChangeStop } from "@/lib/transport/route-setup/types";
import { MODULE_COLORS } from "@/theme/colors";

import { SubmissionStatusChip } from "./SubmissionStatusChip";

type Props = {
  stops: RouteSetupStop[];
  locked: boolean;
  onEdit: (stop: RouteSetupStop) => void;
  onDelete: (stopId: string) => void;
  onRequestChange: (stop: RouteSetupStop) => void;
  onReorder: (stopId: string, direction: "up" | "down") => void;
};

export function RouteSetupStopList({
  stops,
  locked,
  onEdit,
  onDelete,
  onRequestChange,
  onReorder,
}: Props) {
  if (stops.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No stops yet. Tap + Add Stop to capture GPS and submit for Admin approval.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {stops.map((stop, index) => {
        const students = routeSetupRepository.studentsByIds(stop.studentIds);
        const editable = !locked && canEditStop(stop);
        const canRequest = !locked && canRequestChangeStop(stop);
        const canReorder = canRequest;
        const hasPendingChange =
          stop.status === "approved" &&
          stops.some((s) => s.replacesStopId === stop.id && s.status === "pending");

        return (
          <li key={stop.id}>
            <Card>
              <CardContent className="flex gap-3 p-3 sm:p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold"
                  style={{
                    color: MODULE_COLORS.transport.primary,
                    backgroundColor: MODULE_COLORS.transport.iconBackground,
                  }}
                >
                  {stop.routeOrder}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                    <SubmissionStatusChip status={stop.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{stop.locationLabel}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    {students.length > 0
                      ? students.map((s) => s.name).join(", ")
                      : "No students assigned"}
                  </p>
                  {stop.status === "rejected" && stop.rejectionReason ? (
                    <p className="text-xs text-destructive">
                      Declined · {stop.rejectionReason}
                    </p>
                  ) : null}
                  {hasPendingChange ? (
                    <p className="text-xs font-medium text-amber-600">
                      Change request pending Admin review
                    </p>
                  ) : null}
                  {editable || canReorder || canRequest ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {canRequest ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={hasPendingChange}
                          onClick={() => onRequestChange(stop)}
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
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canReorder ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === 0}
                            onClick={() => onReorder(stop.id, "up")}
                          >
                            <ArrowUp className="size-3" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === stops.length - 1}
                            onClick={() => onReorder(stop.id, "down")}
                          >
                            <ArrowDown className="size-3" aria-hidden />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
