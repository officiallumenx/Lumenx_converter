import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { ConfirmDialog } from "@/teacher-portal/core/widgets/ConfirmDialog";
import {
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { listExams } from "@/lib/exams";
import {
  loadTeacherMarkSheet,
  saveTeacherMarkSheet,
  submitTeacherMarkEntry,
  type ConnectMarkRow,
  type TeacherMarkSheetDto,
} from "@/lib/marks";
import {
  fetchMe,
  listSubjects,
  listTeacherAssignments,
} from "@/lib/teacher-classes/api";
import {
  getTeacherClassesFromCache,
  loadTeacherPortalApiData,
} from "@/lib/teacher-classes/load";
import { ApiMarksAnalytics, ApiMarksTable } from "./ApiMarksTable";

export function ApiTeacherMarksPage() {
  const { activeInstituteId } = useApp();
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; label: string }[]>([]);
  const [classNameFilter, setClassNameFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sheet, setSheet] = useState<TeacherMarkSheetDto | null>(null);
  const [rows, setRows] = useState<ConnectMarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [portalTick, setPortalTick] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const cachedClasses = useMemo(() => {
    void portalTick;
    return getTeacherClassesFromCache();
  }, [portalTick]);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await loadTeacherPortalApiData(activeInstituteId);
      if (cancelled) return;
      setPortalTick((t) => t + 1);
      const classes = getTeacherClassesFromCache();
      if (classes[0]) {
        setClassNameFilter(classes[0].className);
        setSectionFilter(classes[0].section);
      }
      const [examRows, subjectRows, me] = await Promise.all([
        listExams({ instituteId: activeInstituteId }),
        listSubjects(activeInstituteId),
        fetchMe(),
      ]);
      if (cancelled) return;
      const teacherId =
        me.identities.teachers.find((t) => t.instituteId === activeInstituteId)?.teacherId ??
        null;
      const assignments = teacherId
        ? await listTeacherAssignments({ instituteId: activeInstituteId, teacherId })
        : [];
      const subjectLabels = new Map(
        subjectRows.map((s) => [s.id, s.name?.trim() || s.code?.trim() || s.id]),
      );
      setSubjects(
        [...new Set(assignments.filter((a) => a.status === "active").map((a) => a.subjectId))].map(
          (id) => ({ id, label: subjectLabels.get(id) ?? id }),
        ),
      );
      setExams(examRows.map((e) => ({ id: e.id, name: e.name })));
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  const classNames = useMemo(
    () => uniqueSortedClassNames(cachedClasses),
    [cachedClasses],
  );

  const sections = useMemo(
    () => sectionsForClassName(cachedClasses, classNameFilter),
    [cachedClasses, classNameFilter],
  );

  const sectionId = useMemo(() => {
    const match = cachedClasses.find(
      (c) => c.className === classNameFilter && c.section === sectionFilter,
    );
    return match?.id ?? "";
  }, [cachedClasses, classNameFilter, sectionFilter]);

  useEffect(() => {
    if (sectionFilter !== "all" && sections.length > 0 && !sections.includes(sectionFilter)) {
      setSectionFilter(sections[0]!);
    }
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (!examId && exams[0]) setExamId(exams[0].id);
  }, [exams, examId]);

  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  useEffect(() => {
    if (!activeInstituteId || !sectionId || !examId || !subjectId) return;
    let cancelled = false;
    setLoading(true);
    void loadTeacherMarkSheet({
      instituteId: activeInstituteId,
      sectionId,
      examId,
      subjectId,
    }).then((result) => {
      if (cancelled) return;
      setSheet(result.sheet);
      setRows(result.rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, sectionId, examId, subjectId, reloadKey]);

  const update = (enrollmentId: string, marks: number | null) => {
    setRows((rs) => rs.map((r) => (r.enrollmentId === enrollmentId ? { ...r, marks } : r)));
  };

  const saveDraftFn = useCallback(async () => {
    if (!activeInstituteId || !sheet || !sectionId || !examId || !subjectId) return;
    const scores = rows.map((r) => ({ enrollmentId: r.enrollmentId, marks: r.marks }));
    const saved = await saveTeacherMarkSheet({
      entryId: sheet.entryId,
      createInput: sheet.entryId
        ? null
        : {
            instituteId: activeInstituteId,
            academicYearId: sheet.academicYearId,
            classId: sheet.classId,
            sectionId,
            examId,
            subjectId,
            maxMarks: sheet.maxMarks,
          },
      updateInput: { maxMarks: sheet.maxMarks, scores },
    });
    setSheet((prev) =>
      prev ? { ...prev, entryId: saved.id, status: saved.status, maxMarks: saved.maxMarks } : prev,
    );
    toast.success("Draft saved");
    refresh();
  }, [activeInstituteId, sheet, sectionId, examId, subjectId, rows, refresh]);

  const submitFn = useCallback(async () => {
    await saveDraftFn();
    const entryId = sheet?.entryId;
    if (!entryId) {
      refresh();
      return;
    }
    await submitTeacherMarkEntry(entryId);
    toast.success("Marks submitted to Admin for publishing");
    refresh();
  }, [saveDraftFn, sheet?.entryId, refresh]);

  const { run: saveDraft, pending: savingDraft } = useAsyncAction(saveDraftFn);
  const { run: submit, pending: submitting } = useAsyncAction(submitFn);

  const isPublished = sheet?.status === "published";
  const isSubmitted = sheet?.status === "submitted";
  const saving = savingDraft || submitting;
  const enteredCount = rows.filter((r) => r.marks != null).length;
  const exam = exams.find((e) => e.id === examId);
  const subject = subjects.find((s) => s.id === subjectId);

  if (loading && !sheet) return <PageSkeleton rows={5} />;

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Marks"
        subtitle="Enter marks and submit them to Admin for publishing"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => saveDraft()}
              disabled={saving || isPublished || isSubmitted}
            >
              <Save className="size-4" /> Save draft
            </Button>
            <Button
              className="rounded-xl gap-2 shadow-glow"
              onClick={() => setConfirmSubmit(true)}
              disabled={saving || isPublished || isSubmitted || enteredCount === 0}
            >
              <Send className="size-4" /> Submit to Admin
            </Button>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit marks to Admin?"
        description={`Marks for ${exam?.name ?? "this exam"} · ${subject?.label ?? "subject"} · Class ${classNameFilter}-${sectionFilter} will be locked for review.`}
        confirmLabel="Submit"
        onConfirm={() => {
          setConfirmSubmit(false);
          submit();
        }}
      />

      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
          <Field label="Class">
            <Select
              value={classNameFilter}
              onValueChange={(v) => {
                setClassNameFilter(v);
                const nextSections = cachedClasses
                  .filter((c) => c.className === v)
                  .map((c) => c.section);
                setSectionFilter(nextSections[0] ?? "");
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {classNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Exam">
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subject">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {sheet ? (
        <SectionCard
          title={`${sheet.examName} · ${sheet.subjectName} · Class ${classNameFilter}-${sectionFilter}`}
          action={
            <Badge variant="outline" className="rounded-md capitalize">
              {isPublished
                ? "Published"
                : isSubmitted
                  ? "Submitted"
                  : sheet.status === "none"
                    ? "Draft"
                    : sheet.status}
            </Badge>
          }
        >
          <ApiMarksAnalytics rows={rows} maxMarks={sheet.maxMarks} />
          <ApiMarksTable
            rows={rows}
            maxMarks={sheet.maxMarks}
            status={sheet.status}
            onUpdate={update}
            readOnly={isPublished || isSubmitted}
          />
        </SectionCard>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select class, exam, and subject to load the mark sheet.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
