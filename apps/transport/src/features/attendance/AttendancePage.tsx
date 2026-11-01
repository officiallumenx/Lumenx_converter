import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Flag,
  LogIn,
  LogOut,
  MapPinOff,
  Play,
  SearchX,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@lumenx/ui";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { OfflineTripBanner } from "@/components/app/offline-trip-banner";
import { ROUTES } from "@/constants";
import { useAttendanceStudents } from "@/hooks/use-attendance-students";
import { useDriverAssignmentQuery } from "@/lib/transport-queries";
import { useLocationTrack } from "@/hooks/use-trip-location-guard";
import { useTripSession } from "@/hooks/use-trip-session";
import {
  attendanceRepository,
  type AttendanceStudentState,
  type BoardingStatus,
  type DroppingStatus,
} from "@/lib/transport";
import { getRouteSetupSnapshot } from "@/lib/transport/route-setup/store";
import { listStopsMissingCoords } from "@/lib/transport/stops-missing-coords";
import {
  buildTripEndSummary,
  homeActionPrimaryLabel,
  isTripActive,
  nextStartSlot,
  tripKindForSlot,
  tripKindTitle,
  tripRepository,
} from "@/lib/transport/trip";

import { StudentAttendanceCard } from "./StudentAttendanceCard";
import {
  defaultAttendanceTabForSlot,
  requiresBoardedBeforeDrop,
  rosterForAttendanceTab,
  type AttendanceTabId,
} from "./roster-visibility";
import { EndTripSummaryGrid } from "../home/ActiveTripPanel";
import { StartTripReadinessDialog } from "../home/StartTripReadinessDialog";

type PendingConfirm =
  | {
      kind: "boarding";
      studentId: string;
      studentName: string;
      next: BoardingStatus;
      label: string;
    }
  | {
      kind: "dropping";
      studentId: string;
      studentName: string;
      next: DroppingStatus;
      label: string;
    };

const TAB_IDS = new Set<AttendanceTabId>(["boarding", "dropping"]);

function isTabId(value: string): value is AttendanceTabId {
  return TAB_IDS.has(value as AttendanceTabId);
}

function countBoarding(students: AttendanceStudentState[], status: BoardingStatus) {
  return students.filter((s) => s.boarding === status).length;
}

function countDropping(students: AttendanceStudentState[], status: DroppingStatus) {
  return students.filter((s) => s.dropping === status).length;
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card px-3 py-2.5 shadow-soft",
        className,
      )}
    >
      <p className="transport-stat-label">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function AttendanceGate() {
  const [readinessOpen, setReadinessOpen] = useState(false);
  /** Locked when the sheet opens so Drop confirm cannot flip to Pickup. */
  const [readinessSlot, setReadinessSlot] = useState<"morning" | "evening">("morning");
  const navigate = useNavigate();
  const session = useTripSession();
  const action = session.homeAction;
  const startSlot = nextStartSlot(action);
  const upcomingKind =
    action === "start_drop" || action === "continue_drop"
      ? "drop"
      : action === "day_complete"
        ? tripKindForSlot(session.slot)
        : "pickup";
  const upcomingTitle = tripKindTitle(upcomingKind);

  // Pickup completed but Drop ready — show Start Drop, don't trap on completed chrome.
  // endSyncPending: local phase may still look active while end is flushing.
  if (
    action !== "start_drop" &&
    (action === "day_complete" ||
      session.phase === "completed" ||
      session.endSyncPending)
  ) {
    return (
      <div className="min-w-0 space-y-5">
        <SectionHeader
          as="h1"
          size="page"
          title="Transport Attendance"
          subtitle={`${upcomingTitle} already completed`}
        />
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-5">
            <p className="font-display text-base font-semibold text-foreground">
              {upcomingTitle} completed
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You cannot mark attendance on a completed trip. Open Home for the next action.
            </p>
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              onClick={() => void navigate({ to: ROUTES.home })}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStart = action === "start_pickup" || action === "start_drop";
  const startLabel = homeActionPrimaryLabel(action);

  return (
    <div className="min-w-0 space-y-5">
      <SectionHeader
        as="h1"
        size="page"
        title="Transport Attendance"
        subtitle="Upcoming trip"
      />
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-transport/[0.05]">
        <CardContent className="space-y-4 p-5">
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-transport">
            {upcomingTitle}
          </p>
          <p className="font-display text-base font-semibold text-foreground">Attendance</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {canStart
              ? `Start the ${upcomingKind === "drop" ? "Drop" : "Pickup"} trip, then mark students here.`
              : "Trip is not ready yet. Open Home to continue."}
          </p>
          {canStart ? (
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              className="min-h-12"
              onClick={() => {
                setReadinessSlot(
                  startSlot ?? (action === "start_drop" ? "evening" : "morning"),
                );
                setReadinessOpen(true);
              }}
            >
              <Play className="size-5" aria-hidden />
              {startLabel}
            </Button>
          ) : (
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              onClick={() => void navigate({ to: ROUTES.home })}
            >
              Back to Home
            </Button>
          )}
        </CardContent>
      </Card>

      <StartTripReadinessDialog
        open={readinessOpen}
        onOpenChange={setReadinessOpen}
        tripSlot={readinessSlot}
      />
    </div>
  );
}

export function AttendancePage() {
  const navigate = useNavigate();
  const assignment = useDriverAssignmentQuery();
  const session = useTripSession();
  const locationTrack = useLocationTrack();
  const students = useAttendanceStudents();
  const [tab, setTab] = useState<AttendanceTabId>(() =>
    defaultAttendanceTabForSlot(session.slot),
  );
  const [query, setQuery] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [endTripOpen, setEndTripOpen] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const locationBlocked = locationTrack.status === "off";

  // Keep Dropping selected for evening trips when the trip identity/slot changes.
  // Do not depend on phase — tab changes also PATCH phase and would fight the driver.
  useEffect(() => {
    const next = defaultAttendanceTabForSlot(session.slot);
    setTab(next);
    if (isTripActive(session.phase)) {
      void tripRepository.setLifecyclePhase(
        next === "boarding" ? "boarding" : "dropping",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on trip/slot
  }, [session.slot, session.tripId]);

  const routeStops = session.assignment?.route?.stops ?? [];
  const currentStop = routeStops[session.currentStopIndex] ?? null;
  const destinationStop =
    routeStops[routeStops.length - 1] ?? currentStop;

  // Full assigned roster for both legs (evening Drop must not depend on boarding marks).
  const boardingRoster = useMemo(
    () => rosterForAttendanceTab(students, "boarding"),
    [students],
  );
  const droppingRoster = useMemo(
    () => rosterForAttendanceTab(students, "dropping"),
    [students],
  );

  const tabStudents = tab === "boarding" ? boardingRoster : droppingRoster;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabStudents;
    return tabStudents.filter((s) => {
      const name = String(s.name ?? "").toLowerCase();
      const grade = String(s.grade ?? "").toLowerCase();
      const stopName = String(s.stopName ?? "").toLowerCase();
      const rollNo = String(s.rollNo ?? "").toLowerCase();
      return (
        name.includes(q) ||
        grade.includes(q) ||
        stopName.includes(q) ||
        rollNo.includes(q)
      );
    });
  }, [tabStudents, query]);

  const boardingStats = useMemo(
    () => ({
      total: boardingRoster.length,
      boarded: countBoarding(boardingRoster, "boarded"),
      notBoarded: countBoarding(boardingRoster, "not_boarded"),
      pending: countBoarding(boardingRoster, "pending"),
    }),
    [boardingRoster],
  );

  const droppingStats = useMemo(
    () => ({
      total: droppingRoster.length,
      dropped: countDropping(droppingRoster, "dropped"),
      notDropped: countDropping(droppingRoster, "not_dropped"),
      pending: countDropping(droppingRoster, "pending"),
    }),
    [droppingRoster],
  );

  const endSummary = useMemo(() => {
    const stopsTotal = routeStops.length;
    const stopsCompleted = Math.min(session.currentStopIndex + 1, stopsTotal);
    return buildTripEndSummary(students, stopsCompleted, stopsTotal);
  }, [students, routeStops.length, session.currentStopIndex]);

  const stopsMissingCoords = useMemo(() => {
    const setupStops = getRouteSetupSnapshot().stops ?? [];
    return listStopsMissingCoords(setupStops);
  }, [session.tripId, routeStops.length]);

  if (!isTripActive(session.phase) || session.endSyncPending) {
    return (
      <DriverAssignmentGate assignment={assignment} allowEmptyStudents={false}>
        <AttendanceGate />
      </DriverAssignmentGate>
    );
  }

  const activeKind = tripKindForSlot(session.slot);
  const activeTitle = tripKindTitle(activeKind);

  const syncPhaseFromTab = (nextTab: AttendanceTabId) => {
    void tripRepository.setLifecyclePhase(nextTab === "boarding" ? "boarding" : "dropping");
  };

  const applyBoarding = (
    id: string,
    status: BoardingStatus,
    options?: { confirmChange?: boolean },
  ) => {
    void attendanceRepository.markBoarding(id, status, options).then((result) => {
      if (!result.ok) {
        if (result.code === "busy") {
          toast.message(result.reason ?? "Already saving…");
          setLiveMessage(result.reason ?? "Already saving");
          return;
        }
        toast.error(result.reason ?? "Could not update boarding");
        setLiveMessage(result.reason ?? "Could not update boarding");
        return;
      }
      const name = result.student?.name ?? "Student";
      // Success toast fires only after outbox confirm (authoritative). Immediate feedback is pending/queued.
      const pendingMessage = result.queuedOffline
        ? `${name}: queued — will sync when online`
        : `${name}: saving…`;
      toast.message(pendingMessage);
      setLiveMessage(pendingMessage);
      void tripRepository.setLifecyclePhase("boarding");
    });
  };

  const applyDropping = (
    id: string,
    status: DroppingStatus,
    options?: { confirmChange?: boolean },
  ) => {
    void attendanceRepository.markDropping(id, status, options).then((result) => {
      if (!result.ok) {
        if (result.code === "busy") {
          toast.message(result.reason ?? "Already saving…");
          setLiveMessage(result.reason ?? "Already saving");
          return;
        }
        toast.error(result.reason ?? "Could not update dropping");
        setLiveMessage(result.reason ?? "Could not update dropping");
        return;
      }
      const name = result.student?.name ?? "Student";
      const pendingMessage = result.queuedOffline
        ? `${name}: queued — will sync when online`
        : `${name}: saving…`;
      toast.message(pendingMessage);
      setLiveMessage(pendingMessage);
      void tripRepository.setLifecyclePhase("dropping");
    });
  };

  const onBoardingTap = (id: string) => {
    if (locationBlocked) {
      toast.error("Turn on location", {
        description: "GPS must stay on while marking attendance.",
      });
      return;
    }
    const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
    if (!student) return;
    if (student.syncStatus === "syncing") {
      toast.message("Already saving…", {
        description: `Wait for ${student.name} to finish syncing.`,
      });
      return;
    }
    if (student.boarding === "pending") {
      applyBoarding(id, "boarded");
      return;
    }
    if (student.boarding === "boarded" || student.boarding === "not_boarded") {
      setConfirm({
        kind: "boarding",
        studentId: id,
        studentName: student.name,
        next: "pending",
        label: `Undo boarding for ${student.name}?`,
      });
    }
  };

  const onBoardingLongPress = (id: string) => {
    if (locationBlocked) {
      toast.error("Turn on location", {
        description: "GPS must stay on while marking attendance.",
      });
      return;
    }
    const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
    if (!student) return;
    if (student.syncStatus === "syncing") {
      toast.message("Already saving…", {
        description: `Wait for ${student.name} to finish syncing.`,
      });
      return;
    }
    if (student.boarding === "not_boarded") {
      toast.message(`${student.name} is already marked not boarded.`);
      return;
    }
    if (student.boarding === "pending") {
      applyBoarding(id, "not_boarded");
      return;
    }
    setConfirm({
      kind: "boarding",
      studentId: id,
      studentName: student.name,
      next: "not_boarded",
      label: `Change ${student.name} to not boarded?`,
    });
  };

  const onDroppingTap = (id: string) => {
    if (locationBlocked) {
      toast.error("Turn on location", {
        description: "GPS must stay on while marking attendance.",
      });
      return;
    }
    const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
    if (!student) return;
    if (student.syncStatus === "syncing") {
      toast.message("Already saving…", {
        description: `Wait for ${student.name} to finish syncing.`,
      });
      return;
    }
    if (
      requiresBoardedBeforeDrop(session.slot) &&
      student.boarding !== "boarded"
    ) {
      toast.error("Board first", {
        description: `${student.name} must be boarded before dropping.`,
      });
      return;
    }
    if (student.dropping === "pending") {
      applyDropping(id, "dropped");
      return;
    }
    setConfirm({
      kind: "dropping",
      studentId: id,
      studentName: student.name,
      next: "pending",
      label: `Undo dropping for ${student.name}?`,
    });
  };

  const onDroppingLongPress = (id: string) => {
    if (locationBlocked) {
      toast.error("Turn on location", {
        description: "GPS must stay on while marking attendance.",
      });
      return;
    }
    const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
    if (!student) return;
    if (student.syncStatus === "syncing") {
      toast.message("Already saving…", {
        description: `Wait for ${student.name} to finish syncing.`,
      });
      return;
    }
    if (
      requiresBoardedBeforeDrop(session.slot) &&
      student.boarding !== "boarded"
    ) {
      toast.error("Board first", {
        description: `${student.name} must be boarded before dropping.`,
      });
      return;
    }
    if (student.dropping === "not_dropped") {
      toast.message(`${student.name} is already marked not dropped.`);
      return;
    }
    if (student.dropping === "pending") {
      applyDropping(id, "not_dropped");
      return;
    }
    setConfirm({
      kind: "dropping",
      studentId: id,
      studentName: student.name,
      next: "not_dropped",
      label: `Change ${student.name} to not dropped?`,
    });
  };

  const handleConfirmChange = () => {
    if (!confirm) return;
    setConfirming(true);
    const finish = () => {
      setConfirming(false);
      setConfirm(null);
    };
    if (confirm.kind === "boarding") {
      void attendanceRepository
        .markBoarding(confirm.studentId, confirm.next, { confirmChange: true })
        .then((result) => {
          finish();
          if (!result.ok) {
            toast.error(result.reason ?? "Could not update boarding");
            return;
          }
          toast.message(
            result.queuedOffline
              ? `${confirm.studentName}: queued — will sync when online`
              : `${confirm.studentName}: saving…`,
          );
          void tripRepository.setLifecyclePhase("boarding");
        });
      return;
    }
    void attendanceRepository
      .markDropping(confirm.studentId, confirm.next, { confirmChange: true })
      .then((result) => {
        finish();
        if (!result.ok) {
          toast.error(result.reason ?? "Could not update dropping");
          return;
        }
        toast.message(
          result.queuedOffline
            ? `${confirm.studentName}: queued — will sync when online`
            : `${confirm.studentName}: saving…`,
        );
        void tripRepository.setLifecyclePhase("dropping");
      });
  };

  const handleAdvanceStop = () => {
    setAdvancing(true);
    void tripRepository.advanceStop().then((result) => {
      setAdvancing(false);
      if (!result.ok) {
        toast.message(result.reason);
        return;
      }
      toast.success("Moved to next stop");
    });
  };

  const handleEndTrip = () => {
    if (session.phase === "completed") {
      toast.error("Trip already completed", {
        description: "Open Home to review the summary.",
      });
      setEndTripOpen(false);
      return;
    }
    setEndingTrip(true);
    void tripRepository.endTrip(endSummary).then((result) => {
      setEndingTrip(false);
      if (!result.ok) {
        toast.error("Cannot end trip", { description: result.reason });
        return;
      }
      setEndTripOpen(false);
      toast.success("Trip completed", {
        description: "Attendance is shared with Admin and Connect on this device.",
      });
      void navigate({ to: ROUTES.home });
    });
  };

  const renderEndTripSection = () => (
    <div className="space-y-2 border-t border-border/80 pt-3">
      <Button
        type="button"
        variant="transport"
        size="lg"
        expanded
        className="transport-pressable"
        disabled={endingTrip}
        onClick={() => setEndTripOpen(true)}
      >
        <Flag className="size-5" aria-hidden />
        End Trip
      </Button>
    </div>
  );

  const renderStudentList = (
    mode: AttendanceTabId,
    onTap: (id: string) => void,
    onLongPress: (id: string) => void,
  ) => {
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          compact
          title={
            mode === "boarding" ? "No assigned students" : "No students for Drop"
          }
          description={
            query.trim()
              ? `Nothing matches “${query.trim()}”.`
              : "No students are assigned to this bus for today."
          }
        />
      );
    }

    return (
      <div className="space-y-2.5">
        {filtered.map((student) => (
          <StudentAttendanceCard
            key={student.id}
            student={student}
            mode={mode}
            onTap={() => onTap(student.id)}
            onLongPress={() => onLongPress(student.id)}
            disabled={locationBlocked || student.syncStatus === "syncing"}
          />
        ))}
      </div>
    );
  };

  const stops = session.assignment.route.stops;
  const canAdvance = session.currentStopIndex < Math.max(stops.length - 1, 0) && stops.length > 1;
  const stopLabel =
    tab === "boarding"
      ? (currentStop?.name ?? "Current stop")
      : (destinationStop?.name ?? "Destination");

  // Marking-only layout: no Active trip / SOS / FeatureHero / GPS-on banner.
  // Those stay on Home. This screen is Boarding → Dropping → students.
  return (
    <DriverAssignmentGate assignment={assignment} allowEmptyStudents={false}>
      <div className="min-w-0 space-y-3" data-attendance-layout="marking-only">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>

        {stopsMissingCoords.length > 0 ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="flex items-start gap-3 p-3">
              <MapPinOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {stopsMissingCoords.length === 1
                    ? "1 stop is missing GPS"
                    : `${stopsMissingCoords.length} stops are missing GPS`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Arrival alerts skip{" "}
                  {stopsMissingCoords
                    .slice(0, 3)
                    .map((s) => s.name)
                    .join(", ")}
                  {stopsMissingCoords.length > 3 ? "…" : ""}. Open Route Setup and
                  refresh location on those stops.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-transport">
              {activeTitle}
            </p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Attendance
            </h1>
            <p className="truncate text-sm text-muted-foreground">{stopLabel}</p>
          </div>
          {canAdvance ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              loading={advancing}
              disabled={advancing}
              onClick={handleAdvanceStop}
            >
              Next stop
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>

        <OfflineTripBanner />

        {locationBlocked ? (
          <div
            className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/8 px-3.5 py-3"
            role="alert"
          >
            <MapPinOff className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">Location is off</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Turn on GPS to mark boarding or dropping. Attendance taps stay disabled until
                location is ready.
                {locationTrack.message ? ` (${locationTrack.message})` : ""}
              </p>
            </div>
          </div>
        ) : null}

        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isTabId(value)) {
              setTab(value);
              syncPhaseFromTab(value);
            }
          }}
          className="min-w-0 space-y-3"
        >
          <TabsList className="h-12 w-full rounded-2xl border border-border bg-muted/60 p-1">
            <TabsTrigger
              value="boarding"
              className="h-10 flex-1 gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
            >
              <LogIn className="size-4" aria-hidden />
              Boarding
            </TabsTrigger>
            <TabsTrigger
              value="dropping"
              className="h-10 flex-1 gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
            >
              <LogOut className="size-4" aria-hidden />
              Dropping
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-3 gap-2">
            {tab === "boarding" ? (
              <>
                <StatPill label="Boarded" value={boardingStats.boarded} className="bg-success/8" />
                <StatPill
                  label="Not boarded"
                  value={boardingStats.notBoarded}
                  className="bg-destructive/8"
                />
                <StatPill label="Not marked" value={boardingStats.pending} />
              </>
            ) : (
              <>
                <StatPill label="Dropped" value={droppingStats.dropped} className="bg-success/8" />
                <StatPill
                  label="Not dropped"
                  value={droppingStats.notDropped}
                  className="bg-destructive/8"
                />
                <StatPill label="Not marked" value={droppingStats.pending} />
              </>
            )}
          </div>

          <SearchBar
            value={query}
            onChange={setQuery}
            label="Search students"
            placeholder="Search name or roll…"
          />

          <TabsContent value="boarding" className="mt-0 space-y-3 outline-none">
            {renderStudentList("boarding", onBoardingTap, onBoardingLongPress)}
            {renderEndTripSection()}
          </TabsContent>

          <TabsContent value="dropping" className="mt-0 space-y-3 outline-none">
            {renderStudentList("dropping", onDroppingTap, onDroppingLongPress)}
            {renderEndTripSection()}
          </TabsContent>
        </Tabs>

        <BottomSheet
          open={endTripOpen}
          onOpenChange={(open) => {
            if (endingTrip) return;
            setEndTripOpen(open);
          }}
          title="End trip?"
          description="Confirm to mark this trip Completed. Attendance stays shared for Admin and Connect."
          footer={
            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="transport"
                size="lg"
                expanded
                loading={endingTrip}
                disabled={endingTrip}
                onClick={handleEndTrip}
              >
                <Flag className="size-5" aria-hidden />
                {endingTrip ? "Ending…" : "Confirm End Trip"}
              </Button>
              <Button
                type="button"
                variant="outline"
                expanded
                disabled={endingTrip}
                onClick={() => setEndTripOpen(false)}
              >
                Keep going
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Trip summary</p>
            <EndTripSummaryGrid summary={endSummary} />
          </div>
        </BottomSheet>

        <BottomSheet
          open={Boolean(confirm)}
          onOpenChange={(open) => {
            if (confirming) return;
            if (!open) setConfirm(null);
          }}
          title="Confirm change"
          description={confirm?.label ?? "This updates a recorded boarding or dropping mark."}
          footer={
            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="transport"
                size="lg"
                expanded
                loading={confirming}
                disabled={confirming}
                onClick={handleConfirmChange}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                expanded
                disabled={confirming}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Recorded marks need confirmation before undo or change so Admin and Connect stay
            consistent.
          </p>
        </BottomSheet>
      </div>
    </DriverAssignmentGate>
  );
}
