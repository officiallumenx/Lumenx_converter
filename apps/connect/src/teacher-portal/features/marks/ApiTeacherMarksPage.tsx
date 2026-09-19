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
import {
  saveTeacherMarkSheet,
  submitTeacherMarkEntry,
  type ConnectMarkRow,
} from "@/lib/marks";
import {
  useTeacherMarksCatalogQuery,
  useTeacherMarkSheetQuery,
} from "@/lib/connect-queries/hooks";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { ApiMarksAnalytics, ApiMarksTable } from "./ApiMarksTable";

export function ApiTeacherMarksPage() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const [classNameFilter, setClassNameFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<ConnectMarkRow[]>([]);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const cachedClasses = portal.classes;

  const catalogQuery = useTeacherMarksCatalogQuery(
    activeInstituteId,
    portal.teacherId,
    Boolean(activeInstituteId) && !portal.isLoading,
  );

  const exams = useMemo(
    () => (catalogQuery.data?.examRows ?? []).map((e) => ({ id: e.id, name: e.name })),
    [catalogQuery.data?.examRows],
  );

  const subjects = useMemo(() => {
    const subjectRows = catalogQuery.data?.subjectRows ?? [];
    const assignments = catalogQuery.data?.assignments ?? [];
    const subjectLabels = new Map(
      subjectRows.map((s) => [s.id, s.name?.trim() || s.code?.trim() || s.id]),
    );
    return [...new Set(assignments.filter((a) => a.status === "active").map((a) => a.subjectId))].map(
      (id) => ({ id, label: subjectLabels.get(id) ?? id }),
    );
  }, [catalogQuery.data?.subjectRows, catalogQuery.data?.assignments]);

  useEffect(() => {
    if (!classNameFilter && portal.classes[0]) {
      setClassNameFilter(portal.classes[0].className);
      setSectionFilter(portal.classes[0].section);
    }
  }, [portal.classes, classNameFilter]);

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

  const sheetEnabled =
    Boolean(activeInstituteId) && Boolean(sectionId) && Boolean(examId) && Boolean(subjectId);
  const sheetQuery = useTeacherMarkSheetQuery(
    activeInstituteId,
    sectionId,
    examId,
    subjectId,
    sheetEnabled,
  );

  const sheet = sheetQuery.data?.sheet ?? null;
  const refreshSheet = sheetQuery.refresh;

  useEffect(() => {
    if (sheetQuery.data?.rows) {
      setRows(sheetQuery.data.rows);
    }
  }, [sheetQuery.data]);

  const update = (
    enrollmentId: string,
    patch: {
      internalMarks: number | null;
      externalMarks: number | null;
      marks: number | null;
    },
  ) => {
    setRows((rs) =>
      rs.map((r) => (r.enrollmentId === enrollmentId ? { ...r, ...patch } : r)),
    );
  };

  const saveDraftFn = useCallback(async () => {
    if (!activeInstituteId || !sheet || !sectionId || !examId || !subjectId) return;
    const scores = rows.map((r) => ({
      enrollmentId: r.enrollmentId,
      marks: r.marks,
      internalMarks: r.internalMarks,
      externalMarks: r.externalMarks,
    }));
    await saveTeacherMarkSheet({
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
    toast.success("Draft saved");
    refreshSheet();
  }, [activeInstituteId, sheet, sectionId, examId, subjectId, rows, refreshSheet]);

  const submitFn = useCallback(async () => {
    const incomplete = rows.filter(
      (r) => r.internalMarks == null || r.externalMarks == null || r.marks == null,
    );
    if (incomplete.length > 0) {
      toast.error(
        `Enter internal and external marks for all students (${incomplete.length} incomplete)`,
      );
      return;
    }
    if (!activeInstituteId || !sheet || !sectionId || !examId || !subjectId) return;
    try {
      const scores = rows.map((r) => ({
        enrollmentId: r.enrollmentId,
        marks: r.marks,
        internalMarks: r.internalMarks,
        externalMarks: r.externalMarks,
      }));
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
      await submitTeacherMarkEntry(saved.id);
      toast.success("Marks submitted to Admin for verification");
      refreshSheet();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit marks");
    }
  }, [rows, activeInstituteId, sheet, sectionId, examId, subjectId, refreshSheet]);

  const { run: saveDraft, pending: savingDraft } = useAsyncAction(saveDraftFn);
  const { run: submit, pending: submitting } = useAsyncAction(submitFn);

  const isPublished = sheet?.status === "published";
  const isSubmitted = sheet?.status === "submitted";
  const saving = savingDraft || submitting;
  const completeCount = rows.filter(
    (r) => r.internalMarks != null && r.externalMarks != null && r.marks != null,
  ).length;
  const exam = exams.find((e) => e.id === examId);
  const subject = subjects.find((s) => s.id === subjectId);

  const catalogLoading = catalogQuery.isLoading && !catalogQuery.data;
  const sheetLoading = sheetEnabled && sheetQuery.isLoading && !sheetQuery.data;
  if (catalogLoading || (sheetLoading && !sheet)) return <PageSkeleton rows={5} />;

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
              disabled={saving || isPublished || isSubmitted || completeCount < rows.length}
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
            internalMax={sheet.internalMax}
            externalMax={sheet.externalMax}
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
