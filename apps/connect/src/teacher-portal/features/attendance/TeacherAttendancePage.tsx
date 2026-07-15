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
} from "lucide-react";
import { toast } from "sonner";
import type {
  AttendanceRecord,
  AttendanceReport,
  TeacherSelfAttendanceRecord,
  TeacherStudent,
} from "@/lib/teacher/types";

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
  const loadSeqRef = useRef(0);

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
    const [s, r, h, existing] = await Promise.all([
      teacherRepository.getStudents(classId),
      teacherRepository.getAttendanceReports(),
      teacherRepository.getAttendanceHistory(classId),
      teacherRepository.getAttendanceRecord(classId, editingDate ?? undefined),
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
  }, [classId, portal.isTeacher, editingDate]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    teacherRepository.getTeacherSelfAttendance().then(setSelfAttendance);
  }, [portal.isTeacher]);

  const resetToSaved = useCallback(() => {
    if (hasSavedRecord) {
      setAbsent(new Set(baselineAbsent));
      void teacherRepository.getAttendanceRecord(classId, editingDate ?? undefined).then((r) => {
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
  }, [baselineAbsent, hasSavedRecord, classId, editingDate]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // React to leave approvals (which update stored attendance records) so the roster's
  // on-leave state reflects the latest decisions without a manual reload.
  useEffect(() => {
    const unsub = leaveStore.subscribe(() => {
      void loadStudents();
    });
    return unsub;
  }, [loadStudents]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return students;
    return students.filter((s) => s.name.toLowerCase().includes(t) || s.roll.includes(t));
  }, [students, q]);

  const selectedClass = portal.isTeacher ? portal.classes.find((c) => c.id === classId) : null;
  const leaveCount = students.filter((s) => onLeave.has(s.id)).length;
  const presentCount = students.filter((s) => !absent.has(s.id) && !onLeave.has(s.id)).length;
  const absentCount = students.filter((s) => absent.has(s.id) && !onLeave.has(s.id)).length;
  const classLabel = selectedClass
    ? `Class ${selectedClass.className}-${selectedClass.section}`
    : "Class";

  const submitFn = useCallback(
    async (draft = false) => {
      const absentIds = students
        .filter((s) => absent.has(s.id) && !onLeave.has(s.id))
        .map((s) => s.id);
      const leaveIds = [...onLeave];
      const recordDate = editingDate ?? undefined;
      await teacherRepository.saveAttendance(classId, absentIds, draft, recordDate, leaveIds);
      toast.success(draft ? "Draft saved" : "Attendance submitted", {
        description: `${presentCount} present · ${absentCount} absent${leaveCount ? ` · ${leaveCount} on leave` : ""}`,
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
    ],
  );

  const { run: submit, pending: saving } = useAsyncAction(submitFn);

  const openHistoryRecord = async (record: AttendanceRecord) => {
    const cls = teacherClasses.find((c) => c.id === record.classId);
    if (cls) {
      setClassName(cls.className);
      setSection(cls.section);
    }
    setClassId(record.classId);
    setEditingDate(record.date);
    setQ("");
    // Read the freshest record (the history row may predate later leave approvals).
    const fresh =
      (await teacherRepository.getAttendanceRecord(record.classId, record.date)) ?? record;
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
        subtitle="Mark students present or absent, save a draft, then submit."
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
        <HistoryView history={history} onEdit={openHistoryRecord} />
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

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5"
              onClick={() => setAbsent(new Set())}
            >
              <UserCheck className="size-4" /> All present
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 border-destructive/40 text-destructive"
              onClick={() =>
                setAbsent(new Set(students.filter((s) => !onLeave.has(s.id)).map((s) => s.id)))
              }
            >
              <UserX className="size-4" /> All absent
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl gap-1.5" onClick={resetToSaved}>
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
                    onToggle={() => {
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
                  disabled={saving || !students.length}
                  className="h-11 w-full rounded-xl sm:w-auto sm:min-w-[9.5rem]"
                  onClick={() => submit(true)}
                >
                  {saving ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  disabled={saving || !students.length}
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

function HistoryView({
  history,
  onEdit,
}: {
  history: AttendanceRecord[];
  onEdit: (r: AttendanceRecord) => void;
}) {
  if (!history.length)
    return (
      <EmptyState
        icon={History}
        title="No attendance history"
        description="Submitted records will appear here."
      />
    );
  return (
    <ul className="space-y-2">
      {history.map((r) => (
        <li
          key={`${r.classId}-${r.date}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4"
        >
          <div>
            <p className="font-medium">{r.date}</p>
            <p className="text-xs text-muted-foreground">
              {r.absentIds.length} absent
              {(r.leaveIds?.length ?? 0) > 0 && ` · ${r.leaveIds!.length} on leave`}
              {" · "}
              {r.status}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg gap-1"
            onClick={() => onEdit(r)}
          >
            <Pencil className="size-3" /> Edit
          </Button>
        </li>
      ))}
    </ul>
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
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Present", current.present, "success"],
            ["Absent", current.absent, "destructive"],
            ["Rate", `${current.rate}%`, "primary"],
          ].map(([l, v, t]) => (
            <div
              key={String(l)}
              className={cn(
                "rounded-2xl border p-4 text-center",
                t === "success" && "border-success/30 bg-success/10",
                t === "destructive" && "border-destructive/30 bg-destructive/10",
                t === "primary" && "border-primary/30 bg-primary/10",
              )}
            >
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="font-display text-2xl font-semibold">{v}</div>
            </div>
          ))}
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
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
