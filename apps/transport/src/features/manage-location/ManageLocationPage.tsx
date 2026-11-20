import { useMemo, useState } from "react";
import { MapPin, Users } from "lucide-react";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { useDriverAssignmentQuery, useDriverRosterQuery } from "@/lib/transport-queries";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { getApiDriverRoster } from "@/lib/transport/api-roster";
import { reassignCommonLocation } from "@/lib/transport-api";
import { routeSetupRepository } from "@/lib/transport/route-setup";
import { SUBMISSION_STATUS_LABEL } from "@/lib/transport/route-setup/types";
import { cn } from "@lumenx/ui";

type Step = "locations" | "students" | "choose" | "confirm";

export function ManageLocationPage() {
  const assignment = useDriverAssignmentQuery();
  const { user } = useTransportAuth();
  const instituteId = user?.instituteId ?? null;
  const rosterQuery = useDriverRosterQuery(instituteId, Boolean(instituteId));
  const roster = getApiDriverRoster();
  const setup = routeSetupRepository.getSnapshot();

  const [step, setStep] = useState<Step>("locations");
  const [sourceStopId, setSourceStopId] = useState<string | null>(null);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [targetStopId, setTargetStopId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stops = useMemo(() => {
    const fromSetup = (setup.stops ?? []).filter(
      (s) => s.kind !== "parking" && s.status !== "rejected",
    );
    if (fromSetup.length > 0) return fromSetup;
    return (rosterQuery.data?.stops ?? [])
      .filter((s) => s.approvalStatus !== "rejected")
      .map((s) => ({
        id: s.id,
        name: s.name,
        locationLabel: s.locationLabel,
        status: s.approvalStatus as "pending" | "approved" | "rejected" | "draft",
        studentIds: [] as string[],
      }));
  }, [setup.stops, rosterQuery.data?.stops]);

  const studentsAtSource = useMemo(() => {
    if (!sourceStopId) return [];
    return roster.students.filter(
      (s) =>
        s.stopId === sourceStopId ||
        (!s.stopId && false) ||
        s.dropStopId === sourceStopId,
    );
  }, [roster.students, sourceStopId]);

  const sourceStop = stops.find((s) => s.id === sourceStopId) ?? null;
  const targetStop = stops.find((s) => s.id === targetStopId) ?? null;

  const countForStop = (stopId: string) =>
    roster.students.filter(
      (s) => s.stopId === stopId || s.dropStopId === stopId,
    ).length;

  const toggleStudent = (enrollmentId: string) => {
    setSelectedEnrollmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEnrollmentIds(new Set(studentsAtSource.map((s) => s.id)));
  };

  const clearSelection = () => setSelectedEnrollmentIds(new Set());

  const openConfirm = () => {
    if (!targetStopId || selectedEnrollmentIds.size === 0) {
      toast.error("Select students and a new location");
      return;
    }
    if (targetStopId === sourceStopId) {
      toast.message("Choose a different location");
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    if (!instituteId || !targetStopId || selectedEnrollmentIds.size === 0) return;
    setSaving(true);
    try {
      const result = await reassignCommonLocation({
        instituteId,
        enrollmentIds: [...selectedEnrollmentIds],
        newStopId: targetStopId,
      });
      const modeLabel =
        result.effectiveMode === "next_trip"
          ? "Applies from the next trip"
          : "Updated for the next trip start";
      toast.success(`Location updated for ${result.updatedCount} student(s)`, {
        description: modeLabel,
      });
      setConfirmOpen(false);
      setStep("locations");
      setSourceStopId(null);
      setSelectedEnrollmentIds(new Set());
      setTargetStopId("");
      void rosterQuery.refresh();
    } catch (err) {
      toast.error("Could not save location change", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverAssignmentGate assignment={assignment} allowEmptyStudents={false}>
      <div className="min-w-0 space-y-5">
        <SectionHeader
          as="h1"
          size="page"
          title="Manage Location"
          subtitle="Move students to another stop. Changes apply from the next trip."
        />

        {step === "locations" ? (
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tap a location to see who is assigned there.
            </p>
            <ul className="space-y-2">
              {stops.map((stop) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    className="transport-pressable w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
                    onClick={() => {
                      setSourceStopId(stop.id);
                      setSelectedEnrollmentIds(new Set());
                      setStep("students");
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold text-foreground">
                          {stop.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {"locationLabel" in stop
                            ? String(stop.locationLabel ?? "—")
                            : "—"}
                        </p>
                      </div>
                      <StatusChip
                        label={
                          SUBMISSION_STATUS_LABEL[
                            stop.status as keyof typeof SUBMISSION_STATUS_LABEL
                          ] ?? stop.status
                        }
                        tone={stop.status === "approved" ? "success" : "neutral"}
                      />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      {countForStop(stop.id)} student
                      {countForStop(stop.id) === 1 ? "" : "s"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            {stops.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  No stops yet. Add stops in Route Setup first.
                </CardContent>
              </Card>
            ) : null}
          </section>
        ) : null}

        {step === "students" && sourceStop ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-transport">
                  Students at
                </p>
                <p className="font-display text-lg font-semibold">{sourceStop.name}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("locations")}>
                Back
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <p className="self-center text-xs text-muted-foreground">
                {selectedEnrollmentIds.size} selected
              </p>
            </div>
            <ul className="space-y-2">
              {studentsAtSource.map((student) => {
                const rejected = student.approvalStatus === "rejected";
                const checked = selectedEnrollmentIds.has(student.id);
                return (
                  <li key={student.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-3",
                        rejected
                          ? "border-muted bg-muted/40 opacity-75"
                          : "border-border bg-card",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4"
                        checked={checked}
                        disabled={rejected}
                        onChange={() => toggleStudent(student.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{student.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.studentClass} · {student.rollNo}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden />
                          {student.stopName || "Stop not assigned"}
                        </p>
                        {rejected ? (
                          <p className="mt-1 text-xs font-medium text-muted-foreground">
                            <span className="font-semibold text-destructive">Rejected</span>
                            {student.rejectionReason
                              ? ` · ${student.rejectionReason}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
            {studentsAtSource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students at this location.</p>
            ) : null}
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              disabled={selectedEnrollmentIds.size === 0}
              onClick={() => setStep("choose")}
            >
              Change location ({selectedEnrollmentIds.size})
            </Button>
          </section>
        ) : null}

        {step === "choose" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-lg font-semibold">New location</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("students")}>
                Back
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose an existing stop. To create a brand-new stop with GPS, use Route Setup,
              then return here.
            </p>
            <ul className="space-y-2">
              {stops
                .filter((s) => s.id !== sourceStopId)
                .map((stop) => (
                  <li key={stop.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-2xl border p-3 text-left",
                        targetStopId === stop.id
                          ? "border-transport bg-transport/10"
                          : "border-border bg-card",
                      )}
                      onClick={() => setTargetStopId(stop.id)}
                    >
                      <p className="font-semibold">{stop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {"locationLabel" in stop
                          ? String(stop.locationLabel ?? "")
                          : ""}
                      </p>
                    </button>
                  </li>
                ))}
            </ul>
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              disabled={!targetStopId}
              onClick={openConfirm}
            >
              Review change
            </Button>
          </section>
        ) : null}

        <BottomSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm location change"
        >
          <div className="space-y-3 p-1">
            <p className="text-sm text-foreground">
              Change location for {selectedEnrollmentIds.size} selected student
              {selectedEnrollmentIds.size === 1 ? "" : "s"}?
            </p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Previous</dt>
                <dd className="font-medium">{sourceStop?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">New</dt>
                <dd className="font-medium">{targetStop?.name ?? "—"}</dd>
              </div>
            </dl>
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              The new location will apply from the next trip. Any trip currently in progress
              will continue using the existing location.
            </p>
            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save change"}
            </Button>
          </div>
        </BottomSheet>
      </div>
    </DriverAssignmentGate>
  );
}
