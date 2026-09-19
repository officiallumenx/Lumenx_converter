import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/PageHeader";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { listEnrollments } from "@/lib/teacher-classes";
import { useTeacherAttendancePortalQuery, useTeacherSelfAttendanceQuery } from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";
import { formatStaffCheckTime } from "@/lib/staff-attendance";
import type { TeacherSelfAttendanceSummary } from "@/lib/staff-attendance";
import {
  createAttendanceRegister,
  getAttendanceRegister,
  listAttendanceRegisters,
  submitAttendanceRegister,
  updateAttendanceRegister,
} from "@/lib/attendance/api";
import type {
  AttendanceMarkStatus,
  AttendanceRegisterDto,
  PortalTeacherAttendanceSlotDto,
} from "@/lib/attendance/types";
import { AttendanceRow } from "./AttendanceRow";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { ConfirmDialog } from "@/teacher-portal/core/widgets/ConfirmDialog";
import {
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@lumenx/ui";
import {
  Check,
  ClipboardCheck,
  History,
  RotateCcw,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { todayLocalIso } from "@lumenx/utils";
import type { TeacherStudent } from "@/lib/teacher/types";

type MarkView = "mark" | "history" | "reports" | "self";

type RosterStudent = {
  enrollmentId: string;
  name: string;
  rollNo: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function toTeacherStudent(row: RosterStudent): TeacherStudent {
  return {
    id: row.enrollmentId,
    name: row.name,
    roll: row.rollNo?.trim() || "—",
    classId: "",
    className: "",
    section: "",
    attendancePct: 0,
    homeworkSubmissionPct: 0,
    avgScore: 0,
    grade: "",
    avatarInitials: initialsFromName(row.name),
  };
}

function ownerLabel(
  owner: "class_teacher" | "current_period_teacher" | "attendance_incharge" | null,
): string {
  if (owner === "class_teacher") return "Class Teacher";
  if (owner === "current_period_teacher") return "Current Period Teacher";
  if (owner === "attendance_incharge") return "Attendance Coordinator";
  return "—";
}

function methodLabel(slots: PortalTeacherAttendanceSlotDto[]): string {
  if (slots.some((s) => s.slotKind === "period")) return "Period Wise";
  if (slots.some((s) => s.slotKind === "morning" || s.slotKind === "afternoon")) {
    return "Session Wise";
  }
  return "Day Wise";
}

function defaultPresentMarks(
  students: RosterStudent[],
): Record<string, AttendanceMarkStatus> {
  const next: Record<string, AttendanceMarkStatus> = {};
  for (const s of students) next[s.enrollmentId] = "present";
  return next;
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TeacherAttendanceApiPanel() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const queryClient = useQueryClient();
  const teacherClasses = portal.classes;
  const defaultClass = teacherClasses[0] ?? null;

  const [className, setClassName] = useState(defaultClass?.className ?? "");
  const [section, setSection] = useState(defaultClass?.section ?? "");
  const [sectionId, setSectionId] = useState(defaultClass?.id ?? "");
  const [date, setDate] = useState(todayLocalIso());
  const [view, setView] = useState<MarkView>("mark");
  const [q, setQ] = useState("");

  const [activeSlotCode, setActiveSlotCode] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceMarkStatus>>({});
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<"draft" | "submitted" | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<AttendanceRegisterDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [rosterReloadKey, setRosterReloadKey] = useState(0);

  const portalEnabled =
    Boolean(activeInstituteId) && Boolean(sectionId) && Boolean(date) && !portal.isLoading;
  const portalQuery = useTeacherAttendancePortalQuery(
    activeInstituteId,
    sectionId,
    date,
    portalEnabled,
  );

  const selfEnabled =
    view === "self" && Boolean(activeInstituteId) && !portal.isLoading;
  const selfQuery = useTeacherSelfAttendanceQuery(
    activeInstituteId,
    portal.teacherId,
    selfEnabled,
  );

  const portalStatus =
    portal.isLoading || (portalQuery.isLoading && !portalQuery.data)
      ? "loading"
      : !activeInstituteId || !sectionId
        ? "empty"
        : (portalQuery.data?.status ??
          (portalQuery.isError ? "error" : "loading"));
  const portalError =
    portalQuery.data?.errorMessage ??
    (portalQuery.isError ? "Failed to load attendance." : null);
  const slots = portalQuery.data?.portal?.slots ?? [];
  const portalMeta = portalQuery.data?.portal
    ? {
        classId: portalQuery.data.portal.classId,
        academicYearId: portalQuery.data.portal.academicYearId,
        configVersionId: portalQuery.data.portal.configVersionId,
        owner: portalQuery.data.portal.owner ?? null,
      }
    : null;

  const refreshPortal = useCallback(() => {
    if (!activeInstituteId || !sectionId || !date) return;
    void queryClient.invalidateQueries({
      queryKey: connectQueryKeys.attendanceTeacher(activeInstituteId, sectionId, date),
    });
    setRosterReloadKey((k) => k + 1);
  }, [activeInstituteId, sectionId, date, queryClient]);

  useEffect(() => {
    if (!teacherClasses.length) return;
    if (sectionId && teacherClasses.some((c) => c.id === sectionId)) return;
    const first = teacherClasses[0]!;
    setClassName(first.className);
    setSection(first.section);
    setSectionId(first.id);
  }, [teacherClasses, sectionId]);

  const classOptions = useMemo(
    () =>
      [...new Set(teacherClasses.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [teacherClasses],
  );

  const sectionOptions = useMemo(
    () =>
      [
        ...new Set(
          teacherClasses.filter((c) => c.className === className).map((c) => c.section),
        ),
      ].sort(),
    [teacherClasses, className],
  );

  const pickClass = (nextClassName: string) => {
    setClassName(nextClassName);
    const sections = teacherClasses
      .filter((c) => c.className === nextClassName)
      .map((c) => c.section);
    const nextSection = sections.includes(section) ? section : sections[0];
    if (nextSection) setSection(nextSection);
    const match = teacherClasses.find(
      (c) => c.className === nextClassName && c.section === (nextSection ?? section),
    );
    if (match) {
      setSectionId(match.id);
      setQ("");
    }
  };

  const pickSection = (nextSection: string) => {
    setSection(nextSection);
    const match = teacherClasses.find(
      (c) => c.className === className && c.section === nextSection,
    );
    if (match) {
      setSectionId(match.id);
      setQ("");
    }
  };

  useEffect(() => {
    const first = slots[0];
    setActiveSlotCode((prev) => {
      if (prev && slots.some((s) => s.slotCode === prev)) return prev;
      return first?.slotCode ?? "";
    });
  }, [slots]);

  const activeSlot = useMemo(
    () => slots.find((slot) => slot.slotCode === activeSlotCode) ?? null,
    [slots, activeSlotCode],
  );

  useEffect(() => {
    if (!activeInstituteId || !sectionId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    void listEnrollments({ instituteId: activeInstituteId, sectionId }).then((rows) => {
      if (cancelled) return;
      setStudents(
        rows
          .filter((row) => row.status === "active")
          .map((row) => ({
            enrollmentId: row.id,
            name: row.studentName?.trim() || "Student",
            rollNo: row.rollNo?.trim() || "—",
          })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, sectionId, rosterReloadKey]);

  useEffect(() => {
    if (!activeSlot || !activeInstituteId) return;
    if (activeSlot.registerId) {
      let cancelled = false;
      setDetailLoading(true);
      void getAttendanceRegister(activeSlot.registerId).then((register) => {
        if (cancelled) return;
        const next: Record<string, AttendanceMarkStatus> = {};
        for (const mark of register.marks ?? []) {
          next[mark.enrollmentId] = mark.status;
        }
        // Fill any roster students missing from register as present.
        for (const s of students) {
          if (!next[s.enrollmentId]) next[s.enrollmentId] = "present";
        }
        setMarks(next);
        setRegisterId(register.id);
        setRegisterStatus(register.status);
        setDetailLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    setRegisterId(null);
    setRegisterStatus(null);
    setMarks(defaultPresentMarks(students));
    setDetailLoading(false);
  }, [activeSlot, activeInstituteId, students]);

  useEffect(() => {
    if (view !== "history" && view !== "reports") return;
    if (!activeInstituteId || !sectionId) {
      setHistoryRows([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    void listAttendanceRegisters({
      instituteId: activeInstituteId,
      sectionId,
    })
      .then((rows) => {
        if (cancelled) return;
        setHistoryRows(
          [...rows].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
        );
      })
      .catch(() => {
        if (!cancelled) setHistoryRows([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, activeInstituteId, sectionId, rosterReloadKey]);

  const connectMarkingAllowed =
    portalMeta?.owner === "class_teacher" ||
    portalMeta?.owner === "current_period_teacher";
  const takenByAdmin = portalMeta?.owner === "attendance_incharge";
  const canMark =
    connectMarkingAllowed && registerStatus !== "submitted" && Boolean(portalMeta?.configVersionId);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        s.rollNo.toLowerCase().includes(t),
    );
  }, [students, q]);

  const presentCount = students.filter((s) => {
    const status = marks[s.enrollmentId] ?? "present";
    return status === "present";
  }).length;
  const absentCount = students.filter(
    (s) => (marks[s.enrollmentId] ?? "present") === "absent",
  ).length;
  const leaveCount = students.filter(
    (s) => (marks[s.enrollmentId] ?? "present") === "leave",
  ).length;

  const selectedClass = teacherClasses.find((c) => c.id === sectionId) ?? null;
  const classLabel = selectedClass
    ? `Class ${selectedClass.className}-${selectedClass.section}`
    : "Class";

  const markPayload = useCallback(() => {
    return students.map((student) => ({
      enrollmentId: student.enrollmentId,
      status: marks[student.enrollmentId] ?? ("present" as AttendanceMarkStatus),
    }));
  }, [students, marks]);

  const saveDraft = async () => {
    if (!activeInstituteId || !activeSlot || !portalMeta?.configVersionId || saving) return;
    if (!connectMarkingAllowed) {
      toast.error("Attendance is taken by the Attendance Coordinator in Admin");
      return;
    }
    if (students.length === 0) {
      toast.error("No enrolled students for this section");
      return;
    }
    setSaving(true);
    try {
      const payload = markPayload();
      if (registerId && registerStatus === "draft") {
        await updateAttendanceRegister(registerId, { marks: payload });
        toast.success("Draft saved");
      } else if (!registerId) {
        const created = await createAttendanceRegister({
          instituteId: activeInstituteId,
          academicYearId: portalMeta.academicYearId,
          classId: portalMeta.classId,
          sectionId,
          configVersionId: portalMeta.configVersionId,
          attendanceDate: date,
          slotKind: activeSlot.slotKind,
          slotCode: activeSlot.slotCode,
          periodIndex: activeSlot.periodIndex,
          timetableSlotId: activeSlot.timetableSlotId,
          slotLabel: activeSlot.slotLabel,
          subjectLabel: activeSlot.subjectLabel,
          startsAt: activeSlot.startsAt,
          endsAt: activeSlot.endsAt,
          marks: payload,
        });
        setRegisterId(created.id);
        setRegisterStatus(created.status);
        toast.success("Draft saved");
      }
      refreshPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const submitRegister = async () => {
    if (!activeInstituteId || !activeSlot || !portalMeta?.configVersionId || saving) return;
    if (!connectMarkingAllowed) {
      toast.error("Attendance is taken by the Attendance Coordinator in Admin");
      return;
    }
    if (students.length === 0) {
      toast.error("No enrolled students for this section");
      return;
    }
    setSaving(true);
    try {
      const payload = markPayload();
      let id = registerId;
      if (id && registerStatus === "draft") {
        await updateAttendanceRegister(id, { marks: payload });
      } else if (!id) {
        const created = await createAttendanceRegister({
          instituteId: activeInstituteId,
          academicYearId: portalMeta.academicYearId,
          classId: portalMeta.classId,
          sectionId,
          configVersionId: portalMeta.configVersionId,
          attendanceDate: date,
          slotKind: activeSlot.slotKind,
          slotCode: activeSlot.slotCode,
          periodIndex: activeSlot.periodIndex,
          timetableSlotId: activeSlot.timetableSlotId,
          slotLabel: activeSlot.slotLabel,
          subjectLabel: activeSlot.subjectLabel,
          startsAt: activeSlot.startsAt,
          endsAt: activeSlot.endsAt,
          marks: payload,
        });
        id = created.id;
        setRegisterId(created.id);
        setRegisterStatus(created.status);
      }
      if (!id) throw new Error("Register was not created");
      await submitAttendanceRegister(id);
      toast.success("Attendance submitted");
      setSubmitConfirmOpen(false);
      refreshPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit attendance");
    } finally {
      setSaving(false);
    }
  };

  const setAllPresent = () => {
    setMarks((prev) => {
      const next = { ...prev };
      for (const s of students) {
        if (next[s.enrollmentId] === "leave") continue;
        next[s.enrollmentId] = "present";
      }
      return next;
    });
  };

  const setAllAbsent = () => {
    setMarks((prev) => {
      const next = { ...prev };
      for (const s of students) {
        if (next[s.enrollmentId] === "leave") continue;
        next[s.enrollmentId] = "absent";
      }
      return next;
    });
  };

  const clearMarks = () => {
    setMarks(defaultPresentMarks(students));
    toast.info("Cleared — all students marked present");
  };

  if (portal.isLoading || portalStatus === "loading") {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Attendance"
          subtitle="Period Wise · Mark present or absent, then submit."
        />
        <PageSkeleton rows={6} />
      </div>
    );
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Attendance" subtitle="Mark class attendance" />
        <EmptyState
          icon={ClipboardCheck}
          title={portal.errorMessage ? "Unable to load classes" : "No classes assigned"}
          description={
            portal.errorMessage ??
            "Ask admin to assign you as class teacher or subject teacher for a section before marking attendance."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        subtitle={`${methodLabel(slots)} · Taken by: ${ownerLabel(portalMeta?.owner ?? null)}${
          canMark
            ? " · Mark present or absent, then submit."
            : takenByAdmin
              ? " · Marking is done in Admin."
              : " · Marking disabled for this configuration."
        }`}
        action={
          portalStatus === "error" ? (
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={refreshPortal}
            >
              Retry
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["mark", "Take attendance"],
            ["history", "History"],
            ["reports", "Reports"],
            ["self", "My attendance"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              view === id
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "self" ? (
        selfQuery.isLoading && !selfQuery.data ? (
          <PageSkeleton rows={5} />
        ) : selfQuery.data?.status === "error" || selfQuery.isError ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Could not load attendance"
            description={
              selfQuery.data?.errorMessage ??
              (selfQuery.error instanceof Error
                ? selfQuery.error.message
                : "Failed to load your attendance.")
            }
            action={
              <button
                type="button"
                className="text-sm text-primary underline"
                onClick={() =>
                  void queryClient.invalidateQueries({
                    queryKey: connectQueryKeys.attendanceTeacherSelf(
                      activeInstituteId ?? "_",
                      portal.teacherId ?? "_",
                    ),
                  })
                }
              >
                Retry
              </button>
            }
          />
        ) : !selfQuery.data?.summary || selfQuery.data.status === "empty" ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records yet"
            description="When Admin submits your staff attendance, days and your attendance percentage appear here."
          />
        ) : (
          <TeacherSelfAttendanceApiView summary={selfQuery.data.summary} />
        )
      ) : view === "reports" ? (
        historyLoading ? (
          <PageSkeleton rows={4} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border bg-card p-3 text-center">
                <div className="text-2xl font-semibold tabular-nums">{historyRows.length}</div>
                <div className="text-[11px] text-muted-foreground">Registers</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center">
                <div className="text-2xl font-semibold tabular-nums text-success">
                  {historyRows.filter((r) => r.status === "submitted").length}
                </div>
                <div className="text-[11px] text-muted-foreground">Submitted</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center">
                <div className="text-2xl font-semibold tabular-nums">
                  {historyRows.filter((r) => r.status === "draft").length}
                </div>
                <div className="text-[11px] text-muted-foreground">Drafts</div>
              </div>
            </div>
            {historyRows.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No reports yet"
                description="Submit attendance to see section report counts here."
              />
            ) : null}
          </div>
        )
      ) : view === "history" ? (
        historyLoading ? (
          <PageSkeleton rows={5} />
        ) : historyRows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No attendance history"
            description="Saved and submitted registers for this class will appear here."
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {historyRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{row.attendanceDate}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.slotLabel}
                    {row.subjectLabel ? ` · ${row.subjectLabel}` : ""}
                  </div>
                </div>
                <Badge variant={row.status === "submitted" ? "default" : "outline"}>
                  {row.status}
                </Badge>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          {takenByAdmin ? (
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              Taken By is Attendance Coordinator. Mark attendance in the Admin app for this
              class · section.
            </div>
          ) : null}

          {!portalMeta?.owner &&
          (portalStatus === "ready" || portalStatus === "empty") ? (
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              No attendance configuration is effective for this date. Ask Admin to set
              attendance settings first.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-3">
            <Field label="Class">
              <Select value={className} onValueChange={pickClass}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {classOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      Class {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Section">
              <Select
                value={section}
                onValueChange={pickSection}
                disabled={!sectionOptions.length}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {sectionOptions.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      Section {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Find student" className="col-span-2 sm:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 rounded-xl pl-9"
                  placeholder="Name or roll…"
                />
              </div>
            </Field>
          </div>

          <ConnectDatePicker label="Attendance date" value={date} onChange={setDate} />

          {portalError ? <p className="text-sm text-destructive">{portalError}</p> : null}

          {!portalMeta?.configVersionId ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No attendance configuration"
              description="Administration must configure attendance before marking."
            />
          ) : slots.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No slots for this date"
              description={
                selectedClass
                  ? `No attendance slots for Class ${selectedClass.className}-${selectedClass.section} on ${date}.`
                  : "Select a class to mark attendance."
              }
            />
          ) : (
            <>
              {slots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const active = activeSlotCode === slot.slotCode;
                    const label = slot.subjectLabel
                      ? `${slot.slotLabel} · ${slot.subjectLabel}`
                      : slot.slotLabel;
                    return (
                      <button
                        key={slot.slotCode}
                        type="button"
                        onClick={() => setActiveSlotCode(slot.slotCode)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {label}
                        {slot.registerStatus ? (
                          <span className="ml-1 opacity-70">· {slot.registerStatus}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  disabled={!canMark}
                  onClick={setAllPresent}
                >
                  <UserCheck className="size-4" /> All present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5 border-destructive/40 text-destructive"
                  disabled={!canMark}
                  onClick={setAllAbsent}
                >
                  <UserX className="size-4" /> All absent
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl gap-1.5"
                  disabled={!canMark}
                  onClick={clearMarks}
                >
                  <RotateCcw className="size-4" /> Clear
                </Button>
              </div>

              {detailLoading ? (
                <PageSkeleton rows={5} />
              ) : students.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No students"
                  description="No active enrollments in this section."
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
                    <span className="text-sm font-semibold">{classLabel}</span>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="border-0 bg-success text-success-foreground">
                        {presentCount} present
                      </Badge>
                      {leaveCount > 0 ? (
                        <Badge className="border-0 bg-warning text-warning-foreground">
                          {leaveCount} on leave
                        </Badge>
                      ) : null}
                      <Badge className="border-0 bg-destructive text-destructive-foreground">
                        {absentCount} absent
                      </Badge>
                    </div>
                  </div>

                  <ul className="divide-y divide-border">
                    {filtered.map((s) => {
                      const status = marks[s.enrollmentId] ?? "present";
                      return (
                        <li key={s.enrollmentId}>
                          <AttendanceRow
                            student={toTeacherStudent(s)}
                            isAbsent={status === "absent"}
                            isOnLeave={status === "leave"}
                            disabled={!canMark}
                            onToggle={() => {
                              if (!canMark || status === "leave") return;
                              setMarks((prev) => ({
                                ...prev,
                                [s.enrollmentId]:
                                  status === "absent" ? "present" : "absent",
                              }));
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>

                  {!filtered.length ? (
                    <EmptyState
                      icon={ClipboardCheck}
                      title="No students match"
                      className="border-0 py-8"
                    />
                  ) : null}

                  <div className="border-t border-border bg-primary/[0.04] px-4 py-4 sm:px-5">
                    <p className="mb-3 text-center text-xs text-muted-foreground sm:text-left">
                      <span className="font-semibold text-foreground">{presentCount}</span>{" "}
                      present
                      <span className="mx-1.5 text-border">·</span>
                      <span className="font-semibold text-destructive">{absentCount}</span>{" "}
                      absent
                      {leaveCount > 0 ? (
                        <>
                          <span className="mx-1.5 text-border">·</span>
                          <span className="font-semibold text-warning-foreground">
                            {leaveCount}
                          </span>{" "}
                          on leave
                        </>
                      ) : null}
                      <span className="mx-1.5 text-border">·</span>
                      {students.length} total
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        disabled={saving || !students.length || !canMark}
                        className="h-11 w-full rounded-xl"
                        onClick={() => setSubmitConfirmOpen(true)}
                      >
                        <Check className="mr-1.5 size-4" />
                        {saving ? "Submitting…" : "Submit attendance"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={saving || !students.length || !canMark}
                        className="h-11 w-full rounded-xl"
                        onClick={() => void saveDraft()}
                      >
                        {saving ? "Saving…" : "Save draft"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title="Submit attendance?"
        description={`${presentCount} present · ${absentCount} absent · ${students.length} total. Submitted attendance is locked.`}
        confirmLabel="Submit"
        onConfirm={() => void submitRegister()}
      />
    </div>
  );
}

function statusBadgeClass(status: string): string {
  return cn(
    "border-0 capitalize",
    status === "present" && "bg-success text-success-foreground",
    status === "late" && "bg-warning text-warning-foreground",
    status === "absent" && "bg-destructive text-destructive-foreground",
    status === "leave" && "bg-muted text-foreground",
    status === "half-day" && "bg-warning/80 text-warning-foreground",
  );
}

function TeacherSelfAttendanceApiView({
  summary,
}: {
  summary: TeacherSelfAttendanceSummary;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-3 text-center sm:col-span-1">
          <div className="text-2xl font-semibold tabular-nums text-primary">
            {summary.attendancePct}%
          </div>
          <div className="text-[11px] text-muted-foreground">Attendance</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-semibold tabular-nums text-success">
            {summary.present + summary.late + summary.half}
          </div>
          <div className="text-[11px] text-muted-foreground">Present days</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-semibold tabular-nums text-destructive">
            {summary.absent}
          </div>
          <div className="text-[11px] text-muted-foreground">Absent</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-semibold tabular-nums">{summary.leave}</div>
          <div className="text-[11px] text-muted-foreground">Leave</div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Based on {summary.days} submitted day{summary.days === 1 ? "" : "s"} in the last 90 days
        {summary.half > 0 ? ` · ${summary.half} half-day` : ""}
        {summary.late > 0 ? ` · ${summary.late} late` : ""}.
      </p>

      {summary.records.length === 0 ? (
        <EmptyState
          icon={History}
          title="No days recorded"
          description="Submitted staff attendance from Admin will list here."
        />
      ) : (
        <ul className="space-y-2">
          {summary.records.map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{record.attendanceDate}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {record.dayStatus === "draft" ? (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Draft
                    </Badge>
                  ) : null}
                  <Badge className={statusBadgeClass(record.status)}>
                    {record.status}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                In: {formatStaffCheckTime(record.checkIn)} · Out:{" "}
                {formatStaffCheckTime(record.checkOut)}
              </p>
              {record.note ? (
                <p className="mt-2 text-sm text-muted-foreground">{record.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

