import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  attendanceMethodLabel,
  attendanceOwnerLabel,
  getSlotAttendance,
  notifyFromAttendanceSubmit,
  openAttendanceWorkflow,
  saveSlotAttendance,
  type AttendanceMarkStatus,
} from "@lumenx/module-attendance";
import { Check, ClipboardList } from "lucide-react";
import { AttendanceMarkRoster } from "./AttendanceMarkRoster";

import { useAuth } from "@/auth/AuthContext";
import {
  attendanceClassIdForSection,
  buildAdminAttendanceActor,
  isSectionKeyAllowed,
  resolveClassSection,
  sectionKeyForClassSection,
  type AttendanceModuleAccess,
} from "@/lib/attendance-coordinator-access";
import { attendancePeriodsForSectionDate } from "@/lib/attendance-timetable-periods";
import { listRosterStudentsForSection } from "./roster-students";
import {
  filterRosterByStatusAndSearch,
  marksFromRegister,
  summarizeMarks,
  type MarkKind,
} from "./mark-helpers";
import type {
  StudentAttendanceSummaryModel,
  StudentAttendanceWorkspaceState,
} from "./types";

export type StudentAttendanceMarkPanelProps = {
  state: StudentAttendanceWorkspaceState;
  access: AttendanceModuleAccess;
  onSummaryChange?: (summary: StudentAttendanceSummaryModel) => void;
};

/**
 * Mark sheet for Student Attendance — calls `openAttendanceWorkflow` + `saveSlotAttendance` only.
 * No duplicated method/owner logic.
 */
export function StudentAttendanceMarkPanel({
  state,
  access,
  onSummaryChange,
}: StudentAttendanceMarkPanelProps) {
  const { user } = useAuth();
  const [activeSlotId, setActiveSlotId] = useState("");
  const [marks, setMarks] = useState<Record<string, MarkKind>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const [registerStatus, setRegisterStatus] = useState<AttendanceMarkStatus | null>(null);

  const sectionRow = useMemo(
    () => resolveClassSection(state.classId, state.sectionId),
    [state.classId, state.sectionId],
  );

  const sectionKey = sectionRow ? sectionKeyForClassSection(sectionRow) : "";
  const classLabel = sectionRow ? attendanceClassIdForSection(sectionRow) : "";
  const section = sectionRow?.section?.trim().toUpperCase() || "";
  const inScope = Boolean(sectionKey && isSectionKeyAllowed(sectionKey, access));

  const actor = useMemo(() => {
    if (!user || !sectionKey) return null;
    return buildAdminAttendanceActor(user, { sectionKey });
  }, [user, sectionKey]);

  /** Timetable periods for Period Wise — same engine input as Teacher Connect. */
  const periods = useMemo(() => {
    if (!sectionRow || !state.date) return [];
    return attendancePeriodsForSectionDate(
      sectionRow.timetableGrade || sectionRow.name,
      sectionRow.section,
      state.date,
    );
  }, [sectionRow, state.date]);

  const workflow = useMemo(() => {
    if (!actor || !sectionRow || !state.date || !inScope) return null;
    return openAttendanceWorkflow(
      {
        date: state.date,
        classLabel,
        section,
        sectionKey,
        periods,
      },
      actor,
    );
  }, [
    actor,
    sectionRow,
    state.date,
    inScope,
    classLabel,
    section,
    sectionKey,
    periods,
  ]);

  const students = useMemo(() => {
    if (!sectionRow) return [];
    return listRosterStudentsForSection(classLabel, section);
  }, [sectionRow, classLabel, section]);

  useEffect(() => {
    if (!workflow) {
      setActiveSlotId((prev) => (prev ? "" : prev));
      return;
    }
    const preferred =
      workflow.markableSlotIds[0] ?? workflow.slots[0]?.id ?? "";
    setActiveSlotId((prev) =>
      workflow.slots.some((s) => s.id === prev) ? prev : preferred,
    );
  }, [workflow]);

  useEffect(() => {
    if (!sectionKey || !state.date || !activeSlotId) {
      setMarks((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setRegisterStatus(null);
      return;
    }
    const existing = getSlotAttendance(sectionKey, state.date, activeSlotId);
    setMarks(marksFromRegister(existing, students));
    setRegisterStatus(existing?.status ?? null);
    setMessage(null);
  }, [sectionKey, state.date, activeSlotId, students]);

  const filteredStudents = useMemo(
    () => filterRosterByStatusAndSearch(students, marks, state.status, state.search),
    [students, marks, state.search, state.status],
  );

  const summary = useMemo(
    () => summarizeMarks(students, marks),
    [students, marks],
  );

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [summary, onSummaryChange]);

  const canMarkActive =
    Boolean(workflow?.canMarkAny) &&
    Boolean(activeSlotId) &&
    Boolean(workflow?.markableSlotIds.includes(activeSlotId)) &&
    access.canMark &&
    inScope;

  const toggleMark = (studentId: string) => {
    if (!canMarkActive) return;
    setMarks((prev) => {
      const current = prev[studentId] ?? "present";
      if (current === "leave") return prev;
      return { ...prev, [studentId]: current === "absent" ? "present" : "absent" };
    });
  };

  const markAllPresent = () => {
    if (!canMarkActive) return;
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of students) {
        if (next[student.id] === "leave") continue;
        next[student.id] = "present";
      }
      return next;
    });
  };

  const markAllAbsent = () => {
    if (!canMarkActive) return;
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of students) {
        if (next[student.id] === "leave") continue;
        next[student.id] = "absent";
      }
      return next;
    });
  };

  const clearMarks = () => {
    markAllPresent();
    setMessage({ tone: "ok", text: "Cleared — all students marked present" });
  };

  const rosterItems = useMemo(
    () =>
      filteredStudents.map((student) => ({
        id: student.id,
        name: student.name,
        roll: student.roll,
        status: (marks[student.id] ?? "present") as MarkKind,
      })),
    [filteredStudents, marks],
  );

  const handleSave = (draft: boolean) => {
    if (!user || !actor || !workflow || !sectionRow || !activeSlotId) return;
    if (!canMarkActive) {
      setMessage({
        tone: "err",
        text: workflow.blockedReason ?? "You cannot mark this attendance slot.",
      });
      return;
    }
    if (!draft) {
      const unmarked = students.filter((s) => marks[s.id] !== "present" && marks[s.id] !== "absent" && marks[s.id] !== "leave");
      if (unmarked.length > 0) {
        setMessage({
          tone: "err",
          text: `Mark every student before submitting (${unmarked.length} unmarked).`,
        });
        return;
      }
    }
    setSaving(true);
    setMessage(null);
    const absentIds = students
      .filter((s) => marks[s.id] === "absent")
      .map((s) => s.id);
    const leaveIds = students.filter((s) => marks[s.id] === "leave").map((s) => s.id);
    // Unmarked students are treated as present on submit (same convention as Teacher portal default).
    const result = saveSlotAttendance({
      workflow,
      actor,
      sectionKey,
      classLabel,
      section,
      date: state.date,
      slotId: activeSlotId,
      absentIds,
      leaveIds,
      draft,
    });
    setSaving(false);
    if (!result.ok) {
      setMessage({ tone: "err", text: result.error });
      return;
    }
    setRegisterStatus(result.register.status);
    const filled: Record<string, MarkKind> = {};
    for (const student of students) {
      if (result.register.leaveIds.includes(student.id)) filled[student.id] = "leave";
      else if (result.register.absentIds.includes(student.id)) filled[student.id] = "absent";
      else filled[student.id] = "present";
    }
    setMarks(filled);
    if (!draft && absentIds.length > 0) {
      const slot = workflow.slots.find((s) => s.id === activeSlotId);
      notifyFromAttendanceSubmit({
        date: state.date,
        sectionKey,
        classLabel,
        section,
        slotId: activeSlotId,
        slotLabel: slot?.label ?? "Attendance",
        slotKind: slot?.kind ?? "day",
        absentStudents: students
          .filter((s) => absentIds.includes(s.id))
          .map((s) => ({ id: s.id, name: s.name })),
      });
    }
    setMessage({
      tone: "ok",
      text: draft
        ? "Draft saved via Attendance Engine."
        : "Attendance submitted via Attendance Engine.",
    });
  };

  if (!state.classId || !state.sectionId) {
    return (
      <Card>
        <CardHeader title="Student roster" hint="Select class and section" />
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
            <ClipboardList className="size-5" aria-hidden />
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            Select a class and section to open the attendance mark sheet.
          </p>
        </div>
      </Card>
    );
  }

  if (!sectionRow || !inScope) {
    return (
      <Card>
        <CardHeader title="Student roster" hint="Out of scope" />
        <p className="px-4 pb-5 text-sm text-muted-foreground sm:px-5">
          This class · section is not in your assigned Attendance Coordinator scope.
        </p>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card>
        <CardHeader title="Student roster" hint="Configuration" />
        <p className="px-4 pb-5 text-sm text-muted-foreground sm:px-5">
          Attendance is not configured for this date. Set method and Taken By in Attendance
          settings.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Mark attendance"
        hint={`${attendanceMethodLabel(workflow.method)} · Taken by ${attendanceOwnerLabel(workflow.owner)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {registerStatus ? (
              <Pill tone={registerStatus === "submitted" ? "success" : "warning"}>
                {registerStatus}
              </Pill>
            ) : (
              <Pill tone="neutral">Not saved</Pill>
            )}
            <Pill tone="info">Shared engine</Pill>
          </div>
        }
      />

      <div className="space-y-4 px-4 pb-5 sm:px-5">
        {!workflow.canMarkAny ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {workflow.blockedReason ??
              "You cannot mark attendance under the current configuration."}
          </div>
        ) : null}

        {workflow.slots.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {workflow.slots.map((slot) => {
              const markable = workflow.markableSlotIds.includes(slot.id);
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!markable}
                  onClick={() => setActiveSlotId(slot.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeSlotId === slot.id
                      ? "bg-primary text-primary-foreground"
                      : markable
                        ? "bg-muted text-foreground"
                        : "cursor-not-allowed bg-muted/40 text-muted-foreground/60"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {message ? (
          <p
            className={`text-xs ${
              message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      {students.length === 0 ? (
        <p className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
          No students match this class · section and filters.
        </p>
      ) : (
        <AttendanceMarkRoster
          title={`${classLabel}${section ? ` · ${section}` : ""}`}
          items={rosterItems}
          canMark={canMarkActive}
          onToggle={toggleMark}
          onAllPresent={markAllPresent}
          onAllAbsent={markAllAbsent}
          onClear={clearMarks}
          emptyHint="No students match this class · section and filters."
          footer={
            canMarkActive ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  className="h-11 w-full rounded-xl"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                >
                  <Check className="mr-1.5 size-4" />
                  {saving ? "Submitting…" : "Submit attendance"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                >
                  {saving ? "Saving…" : "Save draft"}
                </Button>
              </div>
            ) : null
          }
        />
      )}
    </Card>
  );
}
