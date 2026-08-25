import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bus,
  CheckCircle2,
  CircleDashed,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Route,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import { toast } from "sonner";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { tripRepository, isTripActive } from "@/lib/transport/trip";
import {
  createCheckingState,
  runTripReadinessChecks,
  type ReadinessCheck,
  type ReadinessKey,
} from "@/lib/transport/trip-readiness";
import type { AssignmentReadinessCheck } from "@/lib/transport/trip";
import { MODULE_COLORS, type ModuleColor } from "@/theme/colors";

const ICONS: Record<ReadinessKey, typeof Wifi> = {
  internet: Wifi,
  notifications: Bell,
  gps: MapPin,
};

const CHECK_COLORS: Record<ReadinessKey, ModuleColor> = {
  internet: MODULE_COLORS.primary,
  notifications: MODULE_COLORS.warning,
  gps: MODULE_COLORS.transport,
};

const ASSIGNMENT_ICONS: Record<AssignmentReadinessCheck["key"], typeof Bus> = {
  bus: Bus,
  route: Route,
  approved_stops: MapPin,
  students: Users,
};

function ServiceCheckRow({ check }: { check: ReadinessCheck }) {
  const Icon = ICONS[check.key];
  const color = CHECK_COLORS[check.key];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3",
        check.status === "on" && "border-success/30 bg-success/5",
        check.status === "off" && "border-destructive/30 bg-destructive/5",
        check.status === "checking" && "border-border bg-muted/40",
        check.status === "waiting" && "border-border/70 bg-card",
      )}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={
          check.status === "on"
            ? {
                color: MODULE_COLORS.success.primary,
                backgroundColor: MODULE_COLORS.success.iconBackground,
              }
            : check.status === "off"
              ? {
                  color: MODULE_COLORS.danger.primary,
                  backgroundColor: MODULE_COLORS.danger.iconBackground,
                }
              : {
                  color: color.primary,
                  backgroundColor: color.iconBackground,
                }
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-foreground">{check.label}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              check.status === "on" && "bg-success/15 text-success",
              check.status === "off" && "bg-destructive/15 text-destructive",
              (check.status === "checking" || check.status === "waiting") &&
                "bg-muted text-muted-foreground",
            )}
          >
            {check.status === "on"
              ? "Ready"
              : check.status === "off"
                ? "Not Ready"
                : check.status === "checking"
                  ? "Checking"
                  : "Waiting"}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.message}</p>
      </div>
      <span className="mt-1 shrink-0">
        {check.status === "waiting" ? (
          <CircleDashed className="size-4 text-muted-foreground/60" aria-hidden />
        ) : check.status === "checking" ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : check.status === "on" ? (
          <CheckCircle2 className="size-4 text-success" aria-hidden />
        ) : (
          <XCircle className="size-4 text-destructive" aria-hidden />
        )}
      </span>
    </div>
  );
}

function AssignmentCheckRow({ check }: { check: AssignmentReadinessCheck }) {
  const Icon = ASSIGNMENT_ICONS[check.key];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3",
        check.status === "on" ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
      )}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={
          check.status === "on"
            ? {
                color: MODULE_COLORS.success.primary,
                backgroundColor: MODULE_COLORS.success.iconBackground,
              }
            : {
                color: MODULE_COLORS.danger.primary,
                backgroundColor: MODULE_COLORS.danger.iconBackground,
              }
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-foreground">{check.label}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              check.status === "on" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {check.readyLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {check.reason ?? check.message}
        </p>
      </div>
      {check.status === "on" ? (
        <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden />
      ) : (
        <XCircle className="mt-1 size-4 shrink-0 text-destructive" aria-hidden />
      )}
    </div>
  );
}

export function StartTripReadinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<ReadinessCheck[]>(createCheckingState);
  const [assignmentChecks, setAssignmentChecks] = useState<AssignmentReadinessCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [servicesOn, setServicesOn] = useState(false);
  const [assignmentOn, setAssignmentOn] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const runIdRef = useRef(0);

  const allReady = servicesOn && assignmentOn;

  const refreshAssignment = () => {
    const result = tripRepository.getAssignmentReadiness();
    setAssignmentChecks(result.checks);
    setAssignmentOn(result.allOn);
    return result;
  };

  const runChecks = async (requestPermissions = false) => {
    const runId = ++runIdRef.current;
    setStarting(false);
    setConfirmOpen(false);
    setChecking(true);
    setServicesOn(false);
    setChecks(createCheckingState());
    refreshAssignment();

    const result = await runTripReadinessChecks(
      (nextChecks) => {
        if (runId === runIdRef.current) setChecks(nextChecks);
      },
      { requestNotifications: requestPermissions, requestLocation: requestPermissions },
    );
    if (runId !== runIdRef.current) return;

    const assignment = refreshAssignment();
    setChecks(result.checks);
    setServicesOn(result.allOn);
    setChecking(false);

    if (!result.allOn || !assignment.allOn) {
      const reasons = [
        ...result.checks.filter((c) => c.status === "off").map((c) => c.label),
        ...assignment.checks.filter((c) => c.status === "off").map((c) => c.label),
      ];
      toast.message("Not ready to start", {
        description:
          reasons.length > 0
            ? `Fix: ${reasons.join(", ")}.`
            : "Complete all readiness checks before starting.",
      });
    }
  };

  const handleConfirmStart = async () => {
    const session = tripRepository.getSessionSnapshot();
    if (isTripActive(session.phase)) {
      toast.error("Trip already running", {
        description: "Continue attendance or end the current trip first.",
      });
      onOpenChange(false);
      void navigate({ to: ROUTES.attendance });
      return;
    }
    if (session.phase === "completed") {
      toast.error("Trip already completed", {
        description: "Dismiss the completed trip on Home before starting a new one.",
      });
      onOpenChange(false);
      return;
    }

    setStarting(true);
    const begin = await tripRepository.beginStartTrip();
    if (!begin.ok) {
      setStarting(false);
      toast.error("Cannot start trip", { description: begin.reason });
      return;
    }

    const result = await tripRepository.confirmStartTrip();
    setStarting(false);
    if (!result.ok) {
      toast.error("Cannot start trip", { description: result.reason });
      return;
    }

    toast.success("Trip started", {
      description: "Trip is running. Opening Attendance…",
    });
    setConfirmOpen(false);
    onOpenChange(false);
    void navigate({ to: ROUTES.attendance, replace: true });
  };

  useEffect(() => {
    if (!open) {
      setStarting(false);
      setConfirmOpen(false);
      setServicesOn(false);
      return;
    }
    void runChecks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when sheet opens
  }, [open]);

  return (
    <>
      <BottomSheet
        open={open && !confirmOpen}
        onOpenChange={(next) => {
          if (starting) return;
          onOpenChange(next);
        }}
        title="Before you start"
        description="All services and assignment checks must be Ready."
        footer={
          <div className="flex w-full flex-col gap-2">
            {allReady && !checking ? (
              <Button
                type="button"
                variant="transport"
                size="lg"
                expanded
                disabled={checking || starting}
                onClick={() => setConfirmOpen(true)}
              >
                <Play className="size-4" aria-hidden />
                Start Trip
              </Button>
            ) : (
              <Button
                type="button"
                variant="transport"
                size="lg"
                expanded
                loading={checking}
                disabled={checking || starting || allReady}
                onClick={() => void runChecks(true)}
              >
                <RefreshCw className="size-4" aria-hidden />
                Fix & check again
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              expanded
              disabled={checking || starting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-2.5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Services
          </p>
          {checks.map((check) => (
            <ServiceCheckRow key={check.key} check={check} />
          ))}

          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assignment
          </p>
          {assignmentChecks.map((check) => (
            <AssignmentCheckRow key={check.key} check={check} />
          ))}

          {!checking && !allReady ? (
            <p className="rounded-2xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs leading-relaxed text-warning-foreground">
              Turn on GPS and internet if needed, or wait for Admin to approve stops — then check
              again.
            </p>
          ) : null}

          {allReady && !checking ? (
            <p className="rounded-2xl border border-success/30 bg-success/10 px-3.5 py-3 text-xs leading-relaxed text-success">
              All checks Ready. Confirm to start the trip.
            </p>
          ) : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmOpen}
        onOpenChange={(next) => {
          if (starting) return;
          setConfirmOpen(next);
        }}
        title="Start this trip?"
        description="GPS tracking and attendance will begin after you confirm."
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              loading={starting}
              disabled={starting}
              onClick={() => void handleConfirmStart()}
            >
              <Play className="size-4" aria-hidden />
              {starting ? "Starting…" : "Confirm Start Trip"}
            </Button>
            <Button
              type="button"
              variant="outline"
              expanded
              disabled={starting}
              onClick={() => setConfirmOpen(false)}
            >
              Go back
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          After confirmation the trip moves to Running. You can mark boarding and dropping on
          Attendance.
        </div>
      </BottomSheet>
    </>
  );
}
