import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock, MapPinned, Plus } from "lucide-react";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureHero } from "@/components/ui/feature-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { useRouteSetup } from "@/hooks/use-route-setup";
import { useTransportRealtimeRefresh } from "@/hooks/use-transport-realtime";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { captureCurrentGps } from "@/lib/transport/capture-gps";
import { routeSetupRepository } from "@/lib/transport/route-setup";
import { syncParkingStopToApi } from "@/lib/transport/route-setup/api-sync";
import { getRouteSetupDriverScope } from "@/lib/transport/route-setup/store";
import type { GpsFix, RouteSetupStop, SubmissionStatus } from "@/lib/transport/route-setup/types";
import {
  canEditStop,
  canRequestChangeStop,
  isParkingStop,
  isRouteEndpointStop,
  isSchoolStop,
  SUBMISSION_STATUS_LABEL,
} from "@/lib/transport/route-setup/types";
import {
  useDriverAssignmentQuery,
  useDriverRosterQuery,
  transportQueryKeys,
} from "@/lib/transport-queries";
import { MODULE_COLORS } from "@/theme/colors";

import { MyAssignmentsPanel } from "./MyAssignmentsPanel";
import { MyStopsPanel } from "./MyStopsPanel";
import { RouteSetupStopList } from "./RouteSetupStopList";
import { SaveStopForm } from "./SaveStopForm";

type WizardView = "hub" | "form";
type HubTab = "setup" | "stops" | "assignments";
type StatusTab = SubmissionStatus;

const STATUS_TABS: StatusTab[] = ["pending", "approved", "rejected"];

export function RouteSetupPage() {
  const record = useRouteSetup();
  const assignment = useDriverAssignmentQuery();
  const { user } = useTransportAuth();
  const queryClient = useQueryClient();

  useDriverRosterQuery(user?.instituteId, assignment.status === "ready");

  const refreshFromRealtime = useCallback(() => {
    if (!user?.instituteId) return;
    void queryClient.invalidateQueries({
      queryKey: transportQueryKeys.roster(user.instituteId),
    });
  }, [queryClient, user?.instituteId]);

  useTransportRealtimeRefresh(user?.instituteId, refreshFromRealtime);
  const driverId = user?.id ?? assignment.account?.id ?? "";
  const vehicleId = assignment.bus?.vehicleId ?? "";
  const busLabel = assignment.bus?.busNumber ?? "—";
  const driverName = assignment.driver?.name ?? user?.name ?? "Driver";

  const [view, setView] = useState<WizardView>("hub");
  const [hubTab, setHubTab] = useState<HubTab>("setup");
  const [stopsTab, setStopsTab] = useState<StatusTab>("pending");
  const [assignmentsTab, setAssignmentsTab] = useState<StatusTab>("pending");
  const [capturing, setCapturing] = useState(false);
  const [pendingGps, setPendingGps] = useState<GpsFix | null>(null);
  const [editing, setEditing] = useState<RouteSetupStop | null>(null);
  const [isChangeRequest, setIsChangeRequest] = useState(false);

  const locked = record.lockedByAdmin;
  const configured = record.status === "configured" && !record.setupInProgress;
  const nextStopNumber =
    record.stops.filter((s) => !isRouteEndpointStop(s)).length + 1;
  const progressOf = Math.max(
    record.targetStopCount,
    record.stops.filter((s) => !isRouteEndpointStop(s)).length,
    1,
  );
  const pendingStops = record.stops.filter((s) => canEditStop(s));
  const waypointStops = record.stops.filter((s) => !isRouteEndpointStop(s));
  const schoolStop = record.stops.find((s) => isSchoolStop(s)) ?? null;
  const parkingStop = record.stops.find((s) => isParkingStop(s)) ?? null;

  const openStopForm = (stop: RouteSetupStop | null, changeRequest: boolean) => {
    if (locked) return;
    if (stop) {
      if (changeRequest) {
        if (!canRequestChangeStop(stop)) return;
      } else if (!canEditStop(stop)) {
        return;
      }
    }
    setEditing(stop);
    setIsChangeRequest(changeRequest);
    setPendingGps(
      stop
        ? {
            latitude: stop.latitude,
            longitude: stop.longitude,
            accuracyM: null,
            capturedAt: stop.timestampCreated,
            source: "device",
          }
        : null,
    );
    setView("form");
  };

  const saveCurrentStop = async () => {
    if (locked) {
      toast.message("Route is locked", {
        description: "Admin locked this route. You cannot add or edit stops.",
      });
      return;
    }
    if (!record.setupInProgress) {
      await routeSetupRepository.startSetup(driverId);
    }
    setCapturing(true);
    try {
      const fix = await captureCurrentGps({ allowDemo: false });
      setPendingGps(fix);
      setEditing(null);
      setIsChangeRequest(false);
      setView("form");
      toast.success("Location captured");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not get GPS. Turn on location and try again.";
      toast.error("Location needed", { description: message });
    } finally {
      setCapturing(false);
    }
  };

  const saveBusParkLocation = async () => {
    if (locked) {
      toast.message("Route is locked", {
        description: "Admin locked this route. You cannot edit the bus park end.",
      });
      return;
    }
    const scope = getRouteSetupDriverScope();
    if (!scope?.instituteId) {
      toast.error("Open Route Setup after signing in to set bus park.");
      return;
    }
    setCapturing(true);
    try {
      const fix = await captureCurrentGps({ allowDemo: false });
      await syncParkingStopToApi(scope, fix);
      toast.success("Bus park saved", {
        description: "This is your start / evening end. School end is set by Admin.",
      });
      if (user?.instituteId) {
        void queryClient.invalidateQueries({
          queryKey: transportQueryKeys.roster(user.instituteId),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save bus park location.";
      toast.error("Bus park not saved", { description: message });
    } finally {
      setCapturing(false);
    }
  };

  const openEdit = (stop: RouteSetupStop) => openStopForm(stop, false);
  const openRequestChange = (stop: RouteSetupStop) => openStopForm(stop, true);

  const handleSaveForm = async (data: {
    name: string;
    locationLabel: string;
    studentIds: string[];
    latitude: number;
    longitude: number;
  }) => {
    if (locked) {
      toast.message("Route is locked", {
        description: "Admin locked this route. You cannot submit stop changes.",
      });
      return;
    }
    try {
      await routeSetupRepository.saveStop(
        {
          id: editing?.id,
          name: data.name,
          locationLabel: data.locationLabel,
          studentIds: data.studentIds,
          latitude: data.latitude,
          longitude: data.longitude,
          refreshGps: Boolean(editing),
        },
        driverId,
      );
      toast.success(
        isChangeRequest
          ? "Change request submitted · Waiting for Admin"
          : editing?.status === "rejected"
            ? "Resubmitted · Waiting for Admin"
            : "Stop submitted · Waiting for Admin",
      );
      setView("hub");
      setHubTab("stops");
      setStopsTab("pending");
      setEditing(null);
      setPendingGps(null);
      setIsChangeRequest(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save stop.";
      toast.error(message);
    }
  };

  const finishSetup = async () => {
    if (locked) return;
    if (waypointStops.length === 0) {
      toast.error("Add at least one pickup stop before finishing");
      return;
    }
    await routeSetupRepository.finishSetup();
    toast.success("Stops saved", {
      description: "Stops still waiting for Admin must be approved before you can start a trip.",
    });
  };

  if (view === "form" && pendingGps) {
    const progressLabel = isChangeRequest
      ? `Request change · ${editing?.name ?? "stop"}`
      : editing
        ? editing.status === "rejected"
          ? `Edit & resubmit · ${editing.name}`
          : `Edit stop ${editing.routeOrder} · ${SUBMISSION_STATUS_LABEL[editing.status]}`
        : `Add stop · ${nextStopNumber} of ${progressOf}`;

    return (
      <DriverAssignmentGate assignment={assignment}>
        <SaveStopForm
          progressLabel={progressLabel}
          initialName={editing?.name ?? ""}
          initialLocationLabel={editing?.locationLabel}
          initialStudentIds={editing?.studentIds ?? []}
          initialGps={pendingGps}
          allowGpsRefresh
          submitLabel={
            isChangeRequest
              ? "Send change to Admin"
              : editing?.status === "rejected"
                ? "Resubmit to Admin"
                : "Send to Admin"
          }
          vehicleId={vehicleId}
          busNumber={busLabel}
          excludeStopId={editing?.id}
          isChangeRequest={isChangeRequest}
          onCancel={() => {
            setView("hub");
            setEditing(null);
            setPendingGps(null);
            setIsChangeRequest(false);
          }}
          onSave={handleSaveForm}
        />
      </DriverAssignmentGate>
    );
  }

  return (
    <DriverAssignmentGate assignment={assignment}>
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <FeatureHero
        icon={MapPinned}
        moduleColor={MODULE_COLORS.transport}
        title={record.routeCode}
        subtitle={record.routeName}
        action={
          <StatusChip
            label={
              locked
                ? "Locked"
                : configured
                  ? "Configured"
                  : record.setupInProgress
                    ? "Setup in progress"
                    : "Not configured"
            }
            tone={
              locked
                ? "warning"
                : configured
                  ? "success"
                  : record.setupInProgress
                    ? "transport"
                    : "neutral"
            }
          />
        }
      />

      {locked ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Route setup is locked by Admin.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You cannot add or edit stops while locked. You can still review My Stops and
                assignments.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(
          [
            ["setup", "Setup"],
            ["stops", "My Stops"],
            ["assignments", "My Assignments"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setHubTab(id)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              hubTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {hubTab === "setup" ? (
        <>
          <Card className="border-transport/30 bg-transport/5">
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold text-foreground">
                {busLabel} · {driverName}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Waiting for Admin</span> = sent, not
                approved yet · <span className="font-medium text-foreground">Active</span> = ready
                for trips · <span className="font-medium text-foreground">Declined</span> = fix and
                resubmit.
              </p>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <SectionHeader
              title="Progress"
              subtitle={
                waypointStops.length === 0
                  ? `Aim for about ${record.targetStopCount} stops`
                  : `${waypointStops.length} pickup stop(s) · ${record.assignments.filter((a) => a.status === "pending").length} waiting for Admin`
              }
            />
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-transport transition-all"
                style={{
                  width: `${Math.min(100, (waypointStops.length / progressOf) * 100)}%`,
                }}
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Route ends"
              subtitle="School is set by Admin. Bus park is your start / evening end."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <EndpointCard
                title="School (boarding end)"
                stop={schoolStop}
                emptyHint="Ask Admin to set School location in Transport Settings."
              />
              <EndpointCard
                title="Bus park (start end)"
                stop={parkingStop}
                emptyHint="Tap Set bus park below to save your depot GPS."
              />
            </div>
          </section>

          {!locked ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="transport"
                size="lg"
                expanded
                loading={capturing}
                onClick={() => void saveCurrentStop()}
              >
                <Plus className="size-5" aria-hidden />
                Add Stop
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                expanded
                loading={capturing}
                onClick={() => void saveBusParkLocation()}
              >
                <MapPinned className="size-5" aria-hidden />
                Set bus park (start end)
              </Button>
              {waypointStops.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  expanded
                  onClick={() => void finishSetup()}
                >
                  <CheckCircle2 className="size-5" aria-hidden />
                  Done adding stops
                </Button>
              ) : null}
            </div>
          ) : null}

          <section className="space-y-3">
            <SectionHeader
              title="Pickup stops on this route"
              subtitle="Waiting, active, and declined stay here"
            />
            <RouteSetupStopList
              stops={waypointStops}
              locked={locked}
              onEdit={openEdit}
              onRequestChange={openRequestChange}
              onDelete={(id) => {
                void routeSetupRepository.deleteStop(id).then(() => toast.message("Stop removed"));
              }}
              onReorder={(id, dir) => {
                void routeSetupRepository.reorderStop(id, dir);
              }}
            />
          </section>
        </>
      ) : null}

      {hubTab === "stops" ? (
        <>
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStopsTab(tab)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  stopsTab === tab
                    ? "bg-transport/15 text-foreground ring-1 ring-transport/30"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {SUBMISSION_STATUS_LABEL[tab]}
              </button>
            ))}
          </div>
          <MyStopsPanel
            stops={waypointStops}
            filter={stopsTab}
            locked={locked}
            routeCode={record.routeCode}
            routeName={record.routeName}
            driverName={driverName}
            busNumber={busLabel}
            onEdit={openEdit}
            onRequestChange={openRequestChange}
            onDelete={(id) => {
              void routeSetupRepository.deleteStop(id).then(() => toast.message("Stop removed"));
            }}
          />
        </>
      ) : null}

      {hubTab === "assignments" ? (
        <>
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAssignmentsTab(tab)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  assignmentsTab === tab
                    ? "bg-transport/15 text-foreground ring-1 ring-transport/30"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {SUBMISSION_STATUS_LABEL[tab]}
              </button>
            ))}
          </div>
          <MyAssignmentsPanel
            assignments={record.assignments}
            pendingStops={pendingStops}
            filter={assignmentsTab}
            onRemove={(id) => {
              void routeSetupRepository
                .removeAssignment(id)
                .then(() => toast.message("Pending assignment removed"));
            }}
            onMove={(id, stopId) => {
              void routeSetupRepository
                .moveAssignment(id, stopId)
                .then(() => toast.message("Pending stop assignment updated"));
            }}
          />
        </>
      ) : null}
    </div>
    </DriverAssignmentGate>
  );
}

function EndpointCard({
  title,
  stop,
  emptyHint,
}: {
  title: string;
  stop: RouteSetupStop | null;
  emptyHint: string;
}) {
  return (
    <Card className={stop ? "border-transport/30 bg-transport/5" : "border-dashed"}>
      <CardContent className="space-y-1 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {stop ? (
          <>
            <p className="text-sm font-semibold text-foreground">{stop.name}</p>
            <p className="text-xs text-muted-foreground">{stop.locationLabel}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        )}
      </CardContent>
    </Card>
  );
}
