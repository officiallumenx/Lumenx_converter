import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  Flag,
  LogIn,
  LogOut,
  Play,
  SearchX,
  Users,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@lumenx/ui";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FeatureHero } from "@/components/ui/feature-hero";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { LocationTrackingBanner } from "@/components/app/location-tracking-banner";
import { OfflineTripBanner } from "@/components/app/offline-trip-banner";
import { ROUTES } from "@/constants";
import { useAttendanceStudents } from "@/hooks/use-attendance-students";
import { useDriverAssignment } from "@/hooks/use-driver-assignment";
import { useLocationTrack } from "@/hooks/use-trip-location-guard";
import { useTripSession } from "@/hooks/use-trip-session";
import {
  attendanceRepository,
  type AttendanceStudentState,
  type BoardingStatus,
  type DroppingStatus,
} from "@/lib/transport";
import {
  buildTripEndSummary,
  isTripActive,
  tripPhaseLabel,
  tripRepository,
} from "@/lib/transport/trip";
import { MODULE_COLORS } from "@/theme/colors";

import { StudentAttendanceCard } from "./StudentAttendanceCard";
import { ActiveTripPanel, EndTripSummaryGrid } from "../home/ActiveTripPanel";
import { StartTripReadinessDialog } from "../home/StartTripReadinessDialog";

type TabId = "boarding" | "dropping";

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

const TAB_IDS = new Set<TabId>(["boarding", "dropping"]);

function isTabId(value: string): value is TabId {
  return TAB_IDS.has(value as TabId);
}

function countBoarding(students: AttendanceStudentState[], status: BoardingStatus) {
  return students.filter((s) => s.boarding === status).length;
}

function countDropping(students: AttendanceStudentState[], status: DroppingStatus) {
  return students.filter((s) => s.dropping === status).length;
}

function matchesCurrentStop(
  student: AttendanceStudentState,
  stop: { id: string; name: string } | null,
): boolean {
  if (!stop) return false;
  if (student.stopId && student.stopId === stop.id) return true;
  return student.stopName.trim().toLowerCase() === stop.name.trim().toLowerCase();
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

function AttendanceGate({ completed }: { completed?: boolean }) {
  const [readinessOpen, setReadinessOpen] = useState(false);
  const navigate = useNavigate();

  if (completed) {
    return (
      <div className="min-w-0 space-y-5">
        <SectionHeader
          as="h1"
          size="page"
          title="Attendance"
          subtitle="This trip is already completed"
        />
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-5">
            <p className="font-display text-base font-semibold text-foreground">Trip completed</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You cannot mark attendance on a completed trip. Open Home to review the summary or
              start a new trip after dismissing it.
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

  return (
    <div className="min-w-0 space-y-5">
      <SectionHeader
        as="h1"
        size="page"
        title="Attendance"
        subtitle="Start the trip before marking students"
      />
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-transport/[0.05]">
        <CardContent className="space-y-4 p-5">
          <p className="font-display text-base font-semibold text-foreground">Trip not started</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pass readiness checks (GPS, Internet, Notifications, bus, route, and approved stops),
            then confirm Start Trip.
          </p>
          <Button
            type="button"
            variant="transport"
            size="lg"
            expanded
            onClick={() => setReadinessOpen(true)}
          >
            <Play className="size-5" aria-hidden />
            Start Trip
          </Button>
        </CardContent>
      </Card>

      <StartTripReadinessDialog open={readinessOpen} onOpenChange={setReadinessOpen} />
    </div>
  );
}

export function AttendancePage() {
  const navigate = useNavigate();
  const assignment = useDriverAssignment();
  const session = useTripSession();
  const locationTrack = useLocationTrack();
  const students = useAttendanceStudents();
  const [tab, setTab] = useState<TabId>("boarding");
  const [query, setQuery] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [endTripOpen, setEndTripOpen] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const locationBlocked = locationTrack.status === "off";

  const currentStop =
    session.assignment.route.stops[session.currentStopIndex] ?? null;
  const destinationStop =
    session.assignment.route.stops[session.assignment.route.stops.length - 1] ?? currentStop;

  const atCurrentStop = useMemo(
    () => students.filter((s) => matchesCurrentStop(s, currentStop)),
    [students, currentStop],
  );

  const droppingRoster = useMemo(
    () => students.filter((s) => s.boarding === "boarded"),
    [students],
  );

  const tabStudents = tab === "boarding" ? atCurrentStop : droppingRoster;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabStudents;
    return tabStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.stopName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q),
    );
  }, [tabStudents, query]);

  const boardingStats = useMemo(
    () => ({
      total: atCurrentStop.length,
      boarded: countBoarding(atCurrentStop, "boarded"),
      notBoarded: countBoarding(atCurrentStop, "not_boarded"),
      pending: countBoarding(atCurrentStop, "pending"),
    }),
    [atCurrentStop],
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
    const stopsTotal = session.assignment.route.stops.length;
    const stopsCompleted = Math.min(session.currentStopIndex + 1, stopsTotal);
    return buildTripEndSummary(students, stopsCompleted, stopsTotal);
  }, [students, session.assignment.route.stops.length, session.currentStopIndex]);

  if (!isTripActive(session.phase)) {
    return (
      <DriverAssignmentGate assignment={assignment} allowEmptyStudents={false}>
        <AttendanceGate completed={session.phase === "completed"} />
      </DriverAssignmentGate>
    );
  }

  const syncPhaseFromTab = (nextTab: TabId) => {
    void tripRepository.setLifecyclePhase(nextTab === "boarding" ? "boarding" : "dropping");
  };

  const applyBoarding = (
    id: string,
    status: BoardingStatus,
    options?: { confirmChange?: boolean },
  ) => {
    void attendanceRepository.markBoarding(id, status, options).then((result) => {
      if (!result.ok) {
        if (result.code === "finalized") {
          const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
          setConfirm({
            kind: "boarding",
            studentId: id,
            studentName: student?.name ?? "Student",
            next: status,
            label: result.reason,
          });
          return;
        }
        toast.error(result.reason);
        setLiveMessage(result.reason);
        return;
      }
      const name = result.student?.name ?? "Student";
      const message =
        status === "boarded"
          ? `${name} boarded`
          : status === "pending"
            ? `${name} boarding undone`
            : `${name} marked not boarded`;
      if (status === "boarded") toast.success(message);
      else toast.message(message);
      setLiveMessage(message);
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
        if (result.code === "finalized") {
          const student = attendanceRepository.getSnapshot().find((s) => s.id === id);
          setConfirm({
            kind: "dropping",
            studentId: id,
            studentName: student?.name ?? "Student",
            next: status,
            label: result.reason,
          });
          return;
        }
        toast.error(result.reason);
        setLiveMessage(result.reason);
        return;
      }
      const name = result.student?.name ?? "Student";
      const message =
        status === "dropped"
          ? `${name} dropped`
          : status === "pending"
            ? `${name} dropping undone`
            : `${name} marked not dropped`;
      if (status === "dropped") toast.success(message);
      else toast.message(message);
      setLiveMessage(message);
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
    if (student.boarding !== "boarded") {
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
    if (student.boarding !== "boarded") {
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
            toast.error(result.reason);
            return;
          }
          toast.message(`${confirm.studentName} updated`);
          void tripRepository.setLifecyclePhase("boarding");
        });
      return;
    }
    void attendanceRepository
      .markDropping(confirm.studentId, confirm.next, { confirmChange: true })
      .then((result) => {
        finish();
        if (!result.ok) {
          toast.error(result.reason);
          return;
        }
        toast.message(`${confirm.studentName} updated`);
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
      <p className="text-sm text-muted-foreground">
        Review the end-of-trip summary before confirming. Marks sync to Admin and Connect.
      </p>
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
    mode: TabId,
    onTap: (id: string) => void,
    onLongPress: (id: string) => void,
  ) => {
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          compact
          title={mode === "boarding" ? "No students at this stop" : "No boarded students"}
          description={
            query.trim()
              ? `Nothing matches “${query.trim()}”.`
              : mode === "boarding"
                ? currentStop
                  ? `No students assigned to ${currentStop.name}.`
                  : "No current stop."
                : "Board students first, then drop them at the destination."
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
            disabled={locationBlocked}
          />
        ))}
      </div>
    );
  };

  const stops = session.assignment.route.stops;
  const canAdvance = session.currentStopIndex < Math.max(stops.length - 1, 0) && stops.length > 1;

  return (
    <DriverAssignmentGate assignment={assignment} allowEmptyStudents={false}>
      <div className="min-w-0 space-y-4">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>

        <div className="flex items-start justify-between gap-3">
          <SectionHeader
            as="h1"
            size="page"
            title="Attendance"
            subtitle={`${session.assignment.route.code} · ${session.assignment.bus.label}`}
          />
          <StatusChip label={tripPhaseLabel(session.phase)} tone="success" className="mt-1 shrink-0" />
        </div>

        <OfflineTripBanner />
        <LocationTrackingBanner />

        <ActiveTripPanel
          session={session}
          boarded={countBoarding(students, "boarded")}
          dropped={countDropping(students, "dropped")}
          totalStudents={students.length}
          endingTrip={endingTrip}
          onEndTrip={() => setEndTripOpen(true)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => void navigate({ to: ROUTES.home })}
          >
            <ArrowLeft aria-hidden />
            Back to Home
          </Button>
          {canAdvance ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={advancing}
              disabled={advancing}
              onClick={handleAdvanceStop}
            >
              Next stop
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>

        <FeatureHero
          icon={Bus}
          moduleColor={MODULE_COLORS.success}
          title={tab === "boarding" ? currentStop?.name ?? "Current stop" : destinationStop?.name ?? "Destination"}
          subtitle={
            tab === "boarding"
              ? "Tap student = Boarded · Hold = Not boarded"
              : "Tap student = Dropped · Hold = Not dropped"
          }
          action={
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-card/90 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-soft">
              <Users className="size-3.5 text-muted-foreground" aria-hidden />
              <span aria-label={`${filtered.length} students`}>{filtered.length}</span>
            </div>
          }
        />

        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isTabId(value)) {
              setTab(value);
              syncPhaseFromTab(value);
            }
          }}
          className="min-w-0 space-y-4"
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
            placeholder="Search students, stop, or roll…"
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
