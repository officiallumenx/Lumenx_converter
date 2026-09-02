import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { listEnrollments } from "@/lib/teacher-classes";
import { loadTeacherAttendancePortal } from "@/lib/attendance/load";
import {
  createAttendanceRegister,
  getAttendanceRegister,
  submitAttendanceRegister,
  updateAttendanceRegister,
} from "@/lib/attendance/api";
import type {
  AttendanceMarkStatus,
  PortalTeacherAttendanceSlotDto,
} from "@/lib/attendance/types";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@lumenx/ui";
import { Check, ClipboardCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { todayLocalIso } from "@lumenx/utils";

const MARK_OPTIONS: AttendanceMarkStatus[] = ["present", "absent", "leave"];

export function TeacherAttendanceApiPanel() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const defaultClass = portal.classes[0] ?? null;
  const [sectionId, setSectionId] = useState(defaultClass?.id ?? "");
  const [date, setDate] = useState(todayLocalIso());
  const [portalStatus, setPortalStatus] = useState<string>("loading");
  const [portalError, setPortalError] = useState<string | null>(null);
  const [slots, setSlots] = useState<PortalTeacherAttendanceSlotDto[]>([]);
  const [portalMeta, setPortalMeta] = useState<{
    classId: string;
    academicYearId: string;
    configVersionId: string | null;
  } | null>(null);
  const [activeSlotCode, setActiveSlotCode] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceMarkStatus>>({});
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<"draft" | "submitted" | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (portal.classes[0] && !sectionId) {
      setSectionId(portal.classes[0].id);
    }
  }, [portal.classes, sectionId]);

  useEffect(() => {
    if (!activeInstituteId || !sectionId) return;
    let cancelled = false;
    setPortalStatus("loading");
    void loadTeacherAttendancePortal({
      instituteId: activeInstituteId,
      sectionId,
      attendanceDate: date,
    }).then((result) => {
      if (cancelled) return;
      setPortalStatus(result.status);
      setPortalError(result.errorMessage);
      setSlots(result.portal?.slots ?? []);
      setPortalMeta(
        result.portal
          ? {
              classId: result.portal.classId,
              academicYearId: result.portal.academicYearId,
              configVersionId: result.portal.configVersionId,
            }
          : null,
      );
      const first = result.portal?.slots[0];
      setActiveSlotCode(first?.slotCode ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, sectionId, date, reloadKey]);

  const activeSlot = useMemo(
    () => slots.find((slot) => slot.slotCode === activeSlotCode) ?? null,
    [slots, activeSlotCode],
  );

  const [students, setStudents] = useState<
    Array<{ enrollmentId: string; name: string; rollNo: string }>
  >([]);

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
            name: row.studentName,
            rollNo: row.rollNo,
          })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, sectionId, reloadKey]);

  const initDefaultMarks = useCallback(() => {
    const next: Record<string, AttendanceMarkStatus> = {};
    for (const student of students) {
      next[student.enrollmentId] = "present";
    }
    setMarks(next);
  }, [students]);

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
    initDefaultMarks();
    setDetailLoading(false);
  }, [activeSlot, activeInstituteId, initDefaultMarks]);

  const selectedClass = portal.classes.find((item) => item.id === sectionId) ?? null;

  const saveMarks = async () => {
    if (!activeInstituteId || !activeSlot || !portalMeta?.configVersionId || saving) return;
    if (students.length === 0) {
      toast.error("No enrolled students for this section");
      return;
    }
    setSaving(true);
    try {
      const markPayload = students.map((student) => ({
        enrollmentId: student.enrollmentId,
        status: marks[student.enrollmentId] ?? "present",
      }));
      if (registerId && registerStatus === "draft") {
        await updateAttendanceRegister(registerId, { marks: markPayload });
        toast.success("Attendance saved");
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
          marks: markPayload,
        });
        setRegisterId(created.id);
        setRegisterStatus(created.status);
        toast.success("Attendance register created");
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const submitRegister = async () => {
    if (!registerId || registerStatus !== "draft" || saving) return;
    setSaving(true);
    try {
      await submitAttendanceRegister(registerId);
      toast.success("Attendance submitted");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit attendance");
    } finally {
      setSaving(false);
    }
  };

  if (portalStatus === "loading") {
    return (
      <div className="space-y-5">
        <PageHeader title="Attendance" subtitle="Mark class attendance via API" />
        <PageSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Mark and submit attendance for your assigned classes"
        action={
          portalStatus === "error" ? (
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="Class · Section" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            {portal.classes.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                Class {item.className} · {item.section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ConnectDatePicker value={date} onChange={setDate} />
      </div>

      {portalError ? (
        <p className="text-sm text-destructive">{portalError}</p>
      ) : null}

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
          {slots.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.slotCode}
                  type="button"
                  onClick={() => setActiveSlotCode(slot.slotCode)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    activeSlotCode === slot.slotCode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {slot.slotLabel}
                  {slot.registerStatus ? (
                    <span className="ml-1 opacity-70">· {slot.registerStatus}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {registerStatus ? (
              <Badge variant={registerStatus === "submitted" ? "default" : "outline"}>
                {registerStatus}
              </Badge>
            ) : (
              <Badge variant="outline">Not created</Badge>
            )}
            {registerStatus === "draft" ? (
              <>
                <Button size="sm" disabled={saving || detailLoading} onClick={saveMarks}>
                  <Save className="mr-1 size-3.5" /> Save
                </Button>
                <Button size="sm" disabled={saving || !registerId} onClick={submitRegister}>
                  <Check className="mr-1 size-3.5" /> Submit
                </Button>
              </>
            ) : registerStatus === "submitted" ? null : (
              <Button size="sm" disabled={saving || detailLoading} onClick={saveMarks}>
                <Save className="mr-1 size-3.5" /> Create register
              </Button>
            )}
          </div>

          {detailLoading ? (
            <PageSkeleton rows={4} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No students"
              description="No active enrollments in this section."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.enrollmentId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.rollNo}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={marks[student.enrollmentId] ?? "present"}
                          disabled={registerStatus === "submitted"}
                          onValueChange={(value) =>
                            setMarks((prev) => ({
                              ...prev,
                              [student.enrollmentId]: value as AttendanceMarkStatus,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[100]">
                            {MARK_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
