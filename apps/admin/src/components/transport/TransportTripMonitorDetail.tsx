import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageToolbar,
  Pill,
  Textarea,
} from "@lumenx/ui-admin";
import {
  classifyGpsFreshness,
  formatGpsAgeLabel,
  isGpsShownAsLive,
} from "@lumenx/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTransportDailyException,
  createTransportDailyException,
  getTransportTrip,
  getTripEffectiveParticipants,
  resolveTransportEmergencyApi,
  type EffectiveTripParticipantDto,
} from "@/lib/transport/ops-api";
import { updateVehicle, updateDriver, updateRoute, deleteStop } from "@/lib/transport/mutations";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import {
  formatTimelineClock,
  sortTimelineChronological,
} from "@/lib/transport/monitor-helpers";
import type { TransportEmergencyDto, TransportTripDto } from "@/lib/transport/types";
import { useTransportBoardingMarksQuery } from "@/lib/admin-queries";

type Props = {
  instituteId: string;
  trip: TransportTripDto;
  emergencies: TransportEmergencyDto[];
  writesEnabled?: boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
  onChanged: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function formatDistance(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function TransportTripMonitorDetail({
  instituteId,
  trip: tripProp,
  emergencies,
  writesEnabled = true,
  onClose,
  onNotify,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const tripQuery = useQuery({
    queryKey: adminQueryKeys.transport(instituteId, `trip:${tripProp.id}`),
    queryFn: () => getTransportTrip(tripProp.id),
    initialData: tripProp,
    staleTime: 10_000,
  });
  const participantsQuery = useQuery({
    queryKey: adminQueryKeys.transport(
      instituteId,
      `trip-participants:${tripProp.id}`,
    ),
    queryFn: () => getTripEffectiveParticipants(tripProp.id),
    staleTime: 15_000,
  });
  const boardingQuery = useTransportBoardingMarksQuery(
    instituteId,
    tripProp.tripDate,
  );

  const trip = tripQuery.data ?? tripProp;
  const participants = participantsQuery.data?.participants ?? [];
  const boardingByStudent = useMemo(() => {
    const map = new Map<
      string,
      { boardingStatus: string; droppingStatus: string }
    >();
    for (const mark of boardingQuery.data ?? []) {
      if (mark.tripId !== trip.id) continue;
      map.set(mark.studentId, {
        boardingStatus: mark.boardingStatus,
        droppingStatus: mark.droppingStatus,
      });
    }
    return map;
  }, [boardingQuery.data, trip.id]);

  const openEmergency =
    emergencies.find(
      (e) =>
        (e.status === "active" || e.status === "acknowledged") &&
        (e.tripId === trip.id || e.vehicleId === trip.vehicleId),
    ) ?? null;

  const freshness =
    trip.gpsFreshness ??
    classifyGpsFreshness(trip.latestLocation?.capturedAt ?? null);
  const showCoords =
    trip.latestLocation &&
    isGpsShownAsLive(freshness) &&
    Number.isFinite(trip.latestLocation.latitude);

  const plan = [...(trip.pickupStopPlan ?? [])].sort(
    (a, b) => a.routeOrder - b.routeOrder,
  );
  const completedStops = plan.slice(0, Math.max(0, trip.currentStopIndex));
  const remainingStops = plan.slice(Math.max(0, trip.currentStopIndex));
  const timeline = sortTimelineChronological(trip.timeline);

  useEffect(() => {
    void tripQuery.refetch();
    void participantsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripProp.id, tripProp.updatedAt]);

  const removeToday = async (p: EffectiveTripParticipantDto) => {
    if (!writesEnabled || p.notRidingToday) return;
    setBusyId(p.studentId);
    try {
      await createTransportDailyException({
        instituteId,
        studentId: p.studentId,
        serviceDate: trip.tripDate,
        notes: "Admin removed from today's trip",
      });
      onNotify?.(`${p.studentName} removed from today's trip`);
      await participantsQuery.refetch();
      onChanged();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not remove student");
    } finally {
      setBusyId(null);
    }
  };

  const cancelException = async (p: EffectiveTripParticipantDto) => {
    if (!writesEnabled || !p.exceptionId) return;
    setBusyId(p.studentId);
    try {
      await cancelTransportDailyException(p.exceptionId);
      onNotify?.(`${p.studentName} restored for today`);
      await participantsQuery.refetch();
      onChanged();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not cancel exception");
    } finally {
      setBusyId(null);
    }
  };

  const resolveEmergency = async () => {
    if (!writesEnabled || !openEmergency) return;
    setBusyId("sos");
    try {
      await resolveTransportEmergencyApi(
        openEmergency.id,
        resolveNote.trim() || null,
      );
      onNotify?.("Emergency resolved");
      setResolveNote("");
      onChanged();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  };

  const deactivate = async (kind: "vehicle" | "driver" | "route" | "stop") => {
    if (!writesEnabled) return;
    setBusyId(kind);
    try {
      if (kind === "vehicle") {
        await updateVehicle(trip.vehicleId, { status: "inactive" });
        onNotify?.("Bus deactivated (history preserved)");
      } else if (kind === "driver") {
        await updateDriver(trip.driverId, { status: "inactive" });
        onNotify?.("Driver deactivated (history preserved)");
      } else if (kind === "route") {
        await updateRoute(trip.routeId, { status: "inactive" });
        onNotify?.("Route deactivated (history preserved)");
      } else {
        if (!trip.currentStopId) {
          onNotify?.("No current stop to deactivate");
          return;
        }
        await deleteStop(trip.currentStopId);
        onNotify?.("Stop deactivated (soft-deleted; history preserved)");
      }
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.transport(instituteId, "vehicles"),
      });
      onChanged();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {trip.vehicleNumber ?? "Bus"} · {trip.routeName ?? "Route"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Live trip detail · observer / correction only
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <DetailRow label="Driver" value={trip.driverName ?? "—"} />
        <DetailRow label="Vehicle" value={trip.vehicleNumber ?? "—"} />
        <DetailRow label="Route" value={trip.routeName ?? "—"} />
        <DetailRow label="Trip phase" value={trip.phase} />
        <DetailRow label="Current stop" value={trip.currentStopName ?? "—"} />
        <DetailRow label="Next stop" value={trip.nextStopName ?? "—"} />
        <DetailRow
          label="Distance"
          value={formatDistance(trip.distanceToNextStopM)}
        />
        <DetailRow
          label="ETA"
          value={
            trip.etaToNextStopMinutes != null
              ? `~${trip.etaToNextStopMinutes} min`
              : "—"
          }
        />
        <DetailRow
          label="Live GPS"
          value={
            showCoords
              ? `${trip.latestLocation!.latitude.toFixed(5)}, ${trip.latestLocation!.longitude.toFixed(5)}`
              : formatGpsAgeLabel(trip.latestLocation?.capturedAt ?? null)
          }
        />
        <DetailRow label="GPS freshness" value={freshness.toUpperCase()} />
        <DetailRow
          label="Emergency"
          value={
            openEmergency
              ? `${openEmergency.emergencyType} · ${openEmergency.status}`
              : "None"
          }
        />
        <DetailRow
          label="Slot / date"
          value={`${trip.slot} · ${trip.tripDate}`}
        />
      </div>

      <Card>
        <CardHeader title="Stops" hint={`${plan.length} on pickup plan`} />
        <div className="space-y-2 px-4 pb-4 text-sm">
          <p>
            <span className="text-muted-foreground">Completed: </span>
            {completedStops.length
              ? completedStops.map((s) => s.name).join(" → ")
              : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Remaining: </span>
            {remainingStops.length
              ? remainingStops.map((s) => s.name).join(" → ")
              : "—"}
          </p>
          {(trip.dropStopPlan?.length ?? 0) > 0 ? (
            <p>
              <span className="text-muted-foreground">Drop plan: </span>
              {trip.dropStopPlan!.map((s) => s.name).join(" → ")}
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Students"
          hint={`${participantsQuery.data?.expectedOnboardCount ?? "…"} expected onboard · ${participantsQuery.data?.notRidingCount ?? 0} not riding`}
        />
        <ul className="max-h-56 space-y-2 overflow-y-auto px-4 pb-4">
          {participants.length === 0 ? (
            <li className="text-sm text-muted-foreground">No enrolled students on this route.</li>
          ) : (
            participants.map((p) => {
              const mark = boardingByStudent.get(p.studentId);
              return (
                <li
                  key={p.studentId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{p.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      Boarding: {mark?.boardingStatus ?? "pending"} · Drop:{" "}
                      {mark?.droppingStatus ?? "pending"}
                      {p.notRidingToday ? " · Not riding today" : ""}
                    </p>
                  </div>
                  {writesEnabled ? (
                    p.notRidingToday ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === p.studentId}
                        onClick={() => void cancelException(p)}
                      >
                        Cancel exception
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === p.studentId}
                        onClick={() => void removeToday(p)}
                      >
                        Remove today
                      </Button>
                    )
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Timeline" hint="Real event timestamps only" />
        {timeline.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            No timeline events yet for this trip.
          </p>
        ) : (
          <ol className="max-h-72 space-y-2 overflow-y-auto px-4 pb-4">
            {timeline.map((evt) => (
              <li key={evt.id} className="flex gap-3 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                  {formatTimelineClock(evt.at)}
                </span>
                <span className="text-foreground">
                  {evt.label}
                  {evt.note ? (
                    <span className="text-muted-foreground"> — {evt.note}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {openEmergency ? (
        <Card>
          <CardHeader
            title="Emergency"
            action={<Pill tone="danger">{openEmergency.status}</Pill>}
          />
          <div className="space-y-2 px-4 pb-4">
            <p className="text-sm text-foreground">
              {openEmergency.emergencyType}
              {openEmergency.note ? ` · ${openEmergency.note}` : ""}
            </p>
            {writesEnabled ? (
              <>
                <Textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Resolve note (optional)"
                  rows={2}
                />
                <Button
                  size="sm"
                  disabled={busyId === "sos"}
                  onClick={() => void resolveEmergency()}
                >
                  Resolve emergency
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      {writesEnabled ? (
        <Card>
          <CardHeader
            title="Deactivate (soft)"
            hint="Sets status inactive — does not delete permanent history"
          />
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === "vehicle"}
              onClick={() => void deactivate("vehicle")}
            >
              Deactivate bus
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === "driver"}
              onClick={() => void deactivate("driver")}
            >
              Deactivate driver
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === "route"}
              onClick={() => void deactivate("route")}
            >
              Deactivate route
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === "stop" || !trip.currentStopId}
              onClick={() => void deactivate("stop")}
            >
              Deactivate current stop
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
