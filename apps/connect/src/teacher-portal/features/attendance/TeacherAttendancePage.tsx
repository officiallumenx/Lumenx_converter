import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { leaveStore } from "@/lib/leave-store";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { ConfirmDialog } from "@/teacher-portal/core/widgets/ConfirmDialog";
import { AttendanceRow } from "./AttendanceRow";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
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
  Save,
  UserCheck,
  UserX,
  Search,
  RotateCcw,
  ClipboardCheck,
  History,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AttendanceRecord,
  AttendanceReport,
  TeacherClass,
  TeacherSelfAttendanceRecord,
  TeacherStudent,
} from "@/lib/teacher/types";
import { todayLocalIso } from "@lumenx/utils";
import {
  buildAttendanceActor,
  useAttendanceWorkflow,
} from "./useAttendanceWorkflow";

export function TeacherAttendancePage() {
  const portal = useTeacherPortal();
  const search = useSearch({ strict: false }) as { classId?: string };
  const teacherClasses = portal.isTeacher ? portal.classes : [];
  const defaultClass = teacherClasses[0] ?? null;
  const [className, setClassName] = useState(defaultClass?.className ?? "10");
  const [section, setSection] = useState(defaultClass?.section ?? "B");
  const [classId, setClassId] = useState(search.classId ?? defaultClass?.id ?? "cls-10b-math");
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [onLeave, setOnLeave] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportTab, setReportTab] = useState<AttendanceReport["period"]>("daily");
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [view, setView] = useState<"mark" | "history" | "reports" | "self">("mark");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [baselineAbsent, setBaselineAbsent] = useState<string[]>([]);
  const [hasSavedRecord, setHasSavedRecord] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [selfAttendance, setSelfAttendance] = useState<TeacherSelfAttendanceRecord[]>([]);
  const [activeSlotId, setActiveSlotId] = useState("slot:day");
  const loadSeqRef = useRef(0);

  const markDate = editingDate ?? todayLocalIso();
  const selectedClass = portal.isTeacher
    ? portal.classes.find((c) => c.id === classId) ?? null
    : null;
  const { workflow, methodLabel, ownerLabel, sectionKey, markGate } = useAttendanceWorkflow({
    date: markDate,
    selectedClass,
    profile: portal.profile,
    teacherClasses: portal.isTeacher ? portal.classes : [],
  });

  useEffect(() => {
    if (!workflow?.slots.length) return;
    if (!workflow.slots.some((s) => s.id === activeSlotId)) {
      setActiveSlotId(workflow.markableSlotIds[0] ?? workflow.slots[0]!.id);
    }
  }, [workflow, activeSlotId]);

  const canMarkActiveSlot = Boolean(
    markGate.markingEnabled && workflow?.markableSlotIds.includes(activeSlotId),
  );

  useEffect(() => {
    leaveStore.init();
  }, []);

  useEffect(() => {
    if (!portal.isTeacher || !teacherClasses.length) return;
    if (search.classId) {
      const fromSearch = teacherClasses.find((c) => c.id === search.classId);
      if (fromSearch) {
        setClassName(fromSearch.className);
        setSection(fromSearch.section);
        setClassId(fromSearch.id);
      }
      return;
    }
    const match = teacherClasses.find((c) => c.className === className && c.section === section);
    if (match) setClassId(match.id);
  }, [search.classId, portal.isTeacher, teacherClasses, className, section]);

  const classOptions = useMemo(
    () =>
      [...new Set(teacherClasses.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [teacherClasses],
  );

  const sectionOptions = useMemo(
    () =>
      [...new Set(teacherClasses.filter((c) => c.className === className).map((c) => c.section))].sort(),
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
      setClassId(match.id);
      setEditingDate(null);
      setQ("");
    }
  };

  const pickSection = (nextSection: string) => {
    setSection(nextSection);
    const match = teacherClasses.find((c) => c.className === className && c.section === nextSection);
    if (match) {
      setClassId(match.id);
      setEditingDate(null);
      setQ("");
    }
  };

  const loadStudents = useCallback(async () => {
    if (!portal.isTeacher) return;
    const my = ++loadSeqRef.current;
    setLoading(true);
    const slotId = activeSlotId;
    const [s, r, h, existing] = await Promise.all([
      teacherRepository.getStudents(classId),
      teacherRepository.getAttendanceReports(classId),
      teacherRepository.getAllAttendanceHistory(),
      teacherRepository.getAttendanceRecord(classId, editingDate ?? undefined, slotId),
    ]);
    // Drop stale responses when the class/date changed before this load resolved.
    if (loadSeqRef.current !== my) return;
    setStudents(s);
    setReports(r);
    setHistory(h);
    if (existing) {
      setAbsent(new Set(existing.absentIds));
      setOnLeave(new Set(existing.leaveIds ?? []));
      setBaselineAbsent([...existing.absentIds]);
      setHasSavedRecord(true);
    } else {
      setAbsent(new Set());
      setOnLeave(new Set());
      setBaselineAbsent([]);
      setHasSavedRecord(false);
    }
    setLoading(false);
  }, [classId, portal.isTeacher, editingDate, activeSlotId]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    teacherRepository.getTeacherSelfAttendance().then(setSelfAttendance);
  }, [portal.isTeacher]);

  const resetToSaved = useCallback(() => {
    if (hasSavedRecord) {
      setAbsent(new Set(baselineAbsent));
      void teacherRepository
        .getAttendanceRecord(classId, editingDate ?? undefined, activeSlotId)
        .then((r) => {
          if (r) setOnLeave(new Set(r.leaveIds ?? []));
        });
      toast.info("Restored last saved attendance", {
        description: "Unsaved changes were discarded.",
      });
    } else {
      setAbsent(new Set());
      setOnLeave(new Set());
      toast.info("No saved record yet", { description: "All students marked present." });
    }
  }, [baselineAbsent, hasSavedRecord, classId, editingDate, activeSlotId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // React to leave approvals (which update stored attendance records) so the roster's
  // on-leave state reflects the latest decisions without a manual reload.
  useEffect(() => {
    const unsub = leaveStore.subscribe(() => {
      void loadStudents();
    });
    return () => {
      void unsub();
    };
  }, [loadStudents]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return students;
    return students.filter((s) => s.name.toLowerCase().includes(t) || s.roll.includes(t));
  }, [students, q]);

  const leaveCount = students.filter((s) => onLeave.has(s.id)).length;
  const presentCount = students.filter((s) => !absent.has(s.id) && !onLeave.has(s.id)).length;
  const absentCount = students.filter((s) => absent.has(s.id) && !onLeave.has(s.id)).length;
  const classLabel = selectedClass
    ? `Class ${selectedClass.className}-${selectedClass.section}`
    : "Class";

  const submitFn = useCallback(
    async (draft = false) => {
      if (!workflow || !portal.profile || !selectedClass) {
        toast.error("Attendance workflow is not available");
        return;
      }
      if (!markGate.markingEnabled) {
        toast.error(markGate.banner ?? "You cannot mark attendance");
        return;
      }
      if (!canMarkActiveSlot) {
        toast.error(workflow.blockedReason ?? "You cannot mark this slot");
        return;
      }
      const absentIds = students
        .filter((s) => absent.has(s.id) && !onLeave.has(s.id))
        .map((s) => s.id);
      const leaveIds = [...onLeave];
      const recordDate = editingDate ?? undefined;
      const actor = buildAttendanceActor(portal.profile, selectedClass);
      await teacherRepository.saveAttendance(
        classId,
        absentIds,
        draft,
        recordDate,
        leaveIds,
        {
          workflow,
          actor,
          slotId: activeSlotId,
          classLabel: selectedClass.className,
          section: selectedClass.section,
          sectionKey,
        },
      );
      const slotLabel =
        workflow.slots.find((s) => s.id === activeSlotId)?.label ?? "Attendance";
      toast.success(draft ? "Draft saved" : "Attendance submitted", {
        description: `${slotLabel} · ${presentCount} present · ${absentCount} absent${leaveCount ? ` · ${leaveCount} on leave` : ""}`,
      });
      if (!draft && portal.isTeacher) portal.refresh();
      setEditingDate(null);
      void loadStudents();
    },
    [
      absent,
      onLeave,
      students,
      classId,
      portal,
      loadStudents,
      editingDate,
      presentCount,
      absentCount,
      leaveCount,
      workflow,
      selectedClass,
      canMarkActiveSlot,
      activeSlotId,
      sectionKey,
      markGate,
    ],
  );

  const { run: submit, pending: saving } = useAsyncAction(submitFn);

  const openHistoryRecord = async (record: AttendanceRecord) => {
    if (!markGate.markingEnabled) {
      toast.error(markGate.banner ?? "You cannot edit attendance under this configuration");
      return;
    }
    const cls = teacherClasses.find((c) => c.id === record.classId);
    if (cls) {
      setClassName(cls.className);
      setSection(cls.section);
    }
    setClassId(record.classId);
    setEditingDate(record.date);
    setActiveSlotId(record.slotId ?? "slot:day");
    setQ("");
    // Read the freshest record (the history row may predate later leave approvals).
    const fresh =
      (await teacherRepository.getAttendanceRecord(
        record.classId,
        record.date,
        record.slotId ?? "slot:day",
      )) ?? record;
    setAbsent(new Set(fresh.absentIds));
    setOnLeave(new Set(fresh.leaveIds ?? []));
    setBaselineAbsent([...fresh.absentIds]);
    setHasSavedRecord(true);
    setView("mark");
  };

  if (!portal.isTeacher) return null;

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={`${methodLabel} · Taken by: ${ownerLabel}${
          markGate.markingEnabled
            ? " · Mark present or absent, then submit."
            : " · Marking disabled for this configuration."
        }`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["mark", "Take attendance"],
            ["history", "History"],
            ["reports", "Reports"],
            ["self", "My attendance"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              view === v
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "reports" ? (
        <ReportsView reports={reports} tab={reportTab} onTab={setReportTab} />
      ) : view === "self" ? (
        <TeacherSelfAttendanceView records={selfAttendance} />
      ) : view === "history" ? (
        <HistoryView
          history={history}
          classes={teacherClasses}
          onEdit={openHistoryRecord}
          canEdit={markGate.markingEnabled}
        />
      ) : loading ? (
        <PageSkeleton rows={6} />
      ) : (
        <div className="space-y-4">
          {editingDate && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <Pencil className="size-4 shrink-0 text-primary" />
              Editing record for {editingDate}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto rounded-lg"
                onClick={() => {
                  setEditingDate(null);
                  void loadStudents();
                }}
              >
                Cancel edit
              </Button>
            </div>
          )}

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

          {workflow && workflow.slots.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {workflow.slots.map((slot) => {
                const markable =
                  markGate.markingEnabled && workflow.markableSlotIds.includes(slot.id);
                const active = activeSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!markable}
                    onClick={() => setActiveSlotId(slot.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : markable
                          ? "bg-muted text-foreground"
                          : "bg-muted/50 text-muted-foreground opacity-60",
                    )}
                    title={
                      markable
                        ? slot.label
                        : markGate.markingEnabled
                          ? "Not assigned to you for this slot"
                          : markGate.banner ?? "Marking disabled"
                    }
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {markGate.banner ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-sm text-foreground",
                markGate.bannerTone === "info"
                  ? "border-primary/30 bg-primary/5"
                  : "border-warning/40 bg-warning/10",
              )}
              role="status"
            >
              {markGate.banner}
            </div>
          ) : !canMarkActiveSlot && workflow?.blockedReason ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              {workflow.blockedReason}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5"
              disabled={!canMarkActiveSlot}
              onClick={() => setAbsent(new Set())}
            >
              <UserCheck className="size-4" /> All present
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 border-destructive/40 text-destructive"
              disabled={!canMarkActiveSlot}
              onClick={() =>
                setAbsent(new Set(students.filter((s) => !onLeave.has(s.id)).map((s) => s.id)))
              }
            >
              <UserX className="size-4" /> All absent
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl gap-1.5"
              disabled={!canMarkActiveSlot}
              onClick={resetToSaved}
            >
              <RotateCcw className="size-4" /> {hasSavedRecord ? "Reset to saved" : "Clear"}
            </Button>
          </div>

          {/* Student list + integrated action footer */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
              <span className="text-sm font-semibold">{classLabel}</span>
              <div className="flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-success text-success-foreground">
                  {presentCount} present
                </Badge>
                {leaveCount > 0 && (
                  <Badge className="border-0 bg-warning text-warning-foreground">
                    {leaveCount} on leave
                  </Badge>
                )}
                <Badge className="border-0 bg-destructive text-destructive-foreground">
                  {absentCount} absent
                </Badge>
              </div>
            </div>

            <ul className="divide-y divide-border">
              {filtered.map((s) => (
                <li key={s.id}>
                  <AttendanceRow
                    student={s}
                    isAbsent={absent.has(s.id)}
                    isOnLeave={onLeave.has(s.id)}
                    disabled={!canMarkActiveSlot}
                    onToggle={() => {
                      if (!canMarkActiveSlot) return;
                      if (onLeave.has(s.id)) return;
                      setAbsent((p) => {
                        const n = new Set(p);
                        if (n.has(s.id)) n.delete(s.id);
                        else n.add(s.id);
                        return n;
                      });
                    }}
                  />
                </li>
              ))}
            </ul>

            {!filtered.length && (
              <EmptyState
                icon={ClipboardCheck}
                title="No students match"
                className="border-0 py-8"
              />
            )}

            <div className="border-t border-border bg-primary/[0.04] px-4 py-4 sm:px-5">
              <p className="mb-3 text-center text-xs text-muted-foreground sm:text-left">
                <span className="font-semibold text-foreground">{presentCount}</span> present
                <span className="mx-1.5 text-border">·</span>
                <span className="font-semibold text-destructive">{absentCount}</span> absent
                {leaveCount > 0 && (
                  <>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="font-semibold text-warning-foreground">{leaveCount}</span> on
                    leave
                  </>
                )}
                <span className="mx-1.5 text-border">·</span>
                {students.length} total
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  disabled={saving || !students.length || !canMarkActiveSlot}
                  className="h-11 w-full rounded-xl sm:w-auto sm:min-w-[9.5rem]"
                  onClick={() => submit(true)}
                >
                  {saving ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  disabled={saving || !students.length || !canMarkActiveSlot}
                  className="h-11 w-full gap-2 rounded-xl font-semibold shadow-glow sm:min-w-[11.5rem] sm:w-auto"
                  onClick={() => setSubmitConfirmOpen(true)}
                >
                  <Save className="size-4" />
                  Submit attendance
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title="Submit attendance?"
        description={`${presentCount} present and ${absentCount} absent for ${classLabel}. Once submitted, this record is finalized for today.`}
        confirmLabel="Yes, submit"
        onConfirm={() => {
          setSubmitConfirmOpen(false);
          void submit(false);
        }}
      />
    </>
  );
}

function TeacherSelfAttendanceView({ records }: { records: TeacherSelfAttendanceRecord[] }) {
  if (!records.length) {
    return (
      <EmptyState
        icon={History}
        title="No teacher attendance records"
        description="Admin-marked daily attendance for teachers will appear here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{record.date}</p>
            <Badge
              className={cn(
                "border-0",
                record.status === "present" && "bg-success text-success-foreground",
                record.status === "late" && "bg-warning text-warning-foreground",
                record.status === "absent" && "bg-destructive text-destructive-foreground",
                record.status === "leave" && "bg-muted text-foreground",
              )}
            >
              {record.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            In: {record.inTime} · Out: {record.outTime} · Marked by {record.markedBy}
          </p>
          {record.note ? <p className="mt-2 text-sm">{record.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function formatHistoryDateParts(iso: string): { dayName: string; dateLabel: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(dt.getTime())) {
    return { dayName: "", dateLabel: iso };
  }
  return {
    dayName: dt.toLocaleDateString("en-IN", { weekday: "long" }),
    dateLabel: dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

function HistoryView({
  history,
  classes,
  onEdit,
  canEdit = true,
}: {
  history: AttendanceRecord[];
  classes: TeacherClass[];
  onEdit: (r: AttendanceRecord) => void;
  canEdit?: boolean;
}) {
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  /** YYYY-MM-DD or empty = all dates */
  const [filterDate, setFilterDate] = useState("");

  const classById = useMemo(() => {
    const map = new Map<string, TeacherClass>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const classOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [classes],
  );

  const sectionOptions = useMemo(() => {
    const list =
      filterClass === "all"
        ? classes
        : classes.filter((c) => c.className === filterClass);
    return [...new Set(list.map((c) => c.section))].sort();
  }, [classes, filterClass]);

  useEffect(() => {
    if (filterSection !== "all" && !sectionOptions.includes(filterSection)) {
      setFilterSection("all");
    }
  }, [filterSection, sectionOptions]);

  const filtered = useMemo(() => {
    return history.filter((r) => {
      const cls = classById.get(r.classId);
      if (filterClass !== "all" && cls?.className !== filterClass) return false;
      if (filterSection !== "all" && cls?.section !== filterSection) return false;
      if (filterDate && r.date !== filterDate) return false;
      return true;
    });
  }, [history, classById, filterClass, filterSection, filterDate]);

  const groups = useMemo(() => {
    const byDate = new Map<string, AttendanceRecord[]>();
    for (const r of filtered) {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const filters = (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={filterClass}
        onValueChange={(v) => {
          setFilterClass(v);
          setFilterSection("all");
        }}
      >
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder="Class" />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[100]">
          <SelectItem value="all">All classes</SelectItem>
          {classOptions.map((name) => (
            <SelectItem key={name} value={name}>
              Class {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filterSection}
        onValueChange={setFilterSection}
        disabled={filterClass !== "all" && !sectionOptions.length}
      >
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder="Section" />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[100]">
          <SelectItem value="all">All sections</SelectItem>
          {sectionOptions.map((sec) => (
            <SelectItem key={sec} value={sec}>
              Section {sec}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative min-w-0">
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-10 rounded-xl pr-8"
          aria-label="Filter by date"
          title="Pick a date or type YYYY-MM-DD. Clear to show all."
        />
        {filterDate ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setFilterDate("")}
            aria-label="Clear date filter"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );

  if (!history.length)
    return (
      <div className="space-y-4">
        {filters}
        <EmptyState
          icon={History}
          title="No attendance history"
          description="Submitted records will appear here, grouped by date."
        />
      </div>
    );

  return (
    <div className="space-y-4">
      {filters}
      {groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="No matching records"
          description="Try another class, section, or date."
        />
      ) : (
        groups.map(([date, records]) => {
          const { dayName, dateLabel } = formatHistoryDateParts(date);
          return (
            <section
              key={date}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/25 px-3 py-2.5 sm:px-4">
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold leading-tight text-foreground">{dateLabel}</p>
                  <p className="text-xs font-medium text-muted-foreground">{dayName}</p>
                </div>
                <p className="shrink-0 text-xs font-medium text-muted-foreground">
                  {records.length} {records.length === 1 ? "class" : "classes"} marked
                </p>
              </div>
              <ul className="divide-y divide-border/60">
                {records.map((r) => {
                  const cls = classById.get(r.classId);
                  const classLabel = cls ? `${cls.className}-${cls.section}` : r.classId;
                  const leaveN = r.leaveIds?.length ?? 0;
                  return (
                    <li
                      key={`${r.classId}-${r.date}-${r.slotId ?? "slot:day"}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-lg bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">
                            Class {classLabel}
                          </span>
                          {r.slotLabel ? (
                            <span className="text-xs text-muted-foreground">{r.slotLabel}</span>
                          ) : cls?.subject ? (
                            <span className="text-xs text-muted-foreground">{cls.subject}</span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {r.absentIds.length} absent
                          {leaveN > 0 ? ` · ${leaveN} on leave` : ""}
                          {" · "}
                          <span className="capitalize">{r.status}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg gap-1"
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? "Edit this record"
                            : "Editing disabled under current attendance configuration"
                        }
                        onClick={() => onEdit(r)}
                      >
                        <Pencil className="size-3" /> Edit
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function ReportsView({
  reports,
  tab,
  onTab,
}: {
  reports: AttendanceReport[];
  tab: AttendanceReport["period"];
  onTab: (p: AttendanceReport["period"]) => void;
}) {
  const current = reports.find((r) => r.period === tab);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onTab(p)}
            className={cn(
              "rounded-full px-4 py-2 text-sm capitalize",
              tab === p ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      {current && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
            {[
              ["Present", current.present, "success"],
              ["Absent", current.absent, "destructive"],
              ["Attendance %", `${current.rate}%`, "primary"],
              ["Working days", current.workingDays ?? "—", "neutral"],
            ].map(([l, v, t]) => (
              <div
                key={String(l)}
                className={cn(
                  "lx-metric-chip",
                  t === "success" && "border-success/30 bg-success/10",
                  t === "destructive" && "border-destructive/30 bg-destructive/10",
                  t === "primary" && "border-primary/30 bg-primary/10",
                  t === "neutral" && "border-border bg-muted/40",
                )}
              >
                <div className="lx-metric-chip__label">{l}</div>
                <div className="lx-metric-chip__value">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Historical reports use the Attendance Method frozen on each day&apos;s
            marks (e.g. Morning+Afternoon before September, Period Wise after).
            Changing configuration never rewrites past attendance.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
