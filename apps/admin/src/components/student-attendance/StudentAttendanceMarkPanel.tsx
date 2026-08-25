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

  const setMark = (studentId: string, kind: MarkKind) => {
    if (!canMarkActive) return;
    setMarks((prev) => ({ ...prev, [studentId]: kind }));
  };

  const markAllPresent = () => {
    if (!canMarkActive) return;
    const next: Record<string, MarkKind> = {};
    for (const student of students) next[student.id] = "present";
    setMarks(next);
  };

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
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeSlotId === slot.id
                      ? "border-primary bg-primary/10 text-primary"
                      : markable
                        ? "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                        : "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground/60"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={!canMarkActive} onClick={markAllPresent}>
            Mark all present
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canMarkActive || saving}
            onClick={() => handleSave(true)}
          >
            Save draft
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!canMarkActive || saving}
            onClick={() => handleSave(false)}
          >
            <Check className="size-3.5" /> Submit attendance
          </Button>
        </div>

        {message ? (
          <p
            className={`text-xs ${
              message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        {filteredStudents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No students match this class · section and filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Roll</th>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredStudents.map((student) => {
                  const kind = marks[student.id];
                  return (
                    <tr key={student.id} className="hover:bg-surface-hover/60">
                      <td className="px-3 py-2 font-mono text-xs">{student.roll}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-[10px] text-muted-foreground">{student.id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              ["present", "Present"],
                              ["absent", "Absent"],
                              ["leave", "Leave"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={!canMarkActive}
                              onClick={() => setMark(student.id, value)}
                              className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                                kind === value
                                  ? value === "present"
                                    ? "border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                                    : value === "absent"
                                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                                      : "border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-100"
                                  : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
