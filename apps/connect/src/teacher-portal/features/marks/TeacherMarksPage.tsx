import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { MarksAnalytics, MarksTable } from "./MarksTable";
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
import type { MarkEntry, TeacherExam } from "@/lib/teacher/types";

export function TeacherMarksPage() {
  const portal = useTeacherPortal();
  const search = useSearch({ strict: false }) as { examId?: string; classId?: string };
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [examId, setExamId] = useState(search.examId ?? "");
  const initialClass = portal.classes[0];
  const [classNameFilter, setClassNameFilter] = useState(initialClass?.className ?? "");
  const [sectionFilter, setSectionFilter] = useState(initialClass?.section ?? "");
  const [rows, setRows] = useState<MarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const classNames = useMemo(
    () => uniqueSortedClassNames(portal.classes),
    [portal.classes],
  );

  const sections = useMemo(
    () => sectionsForClassName(portal.classes, classNameFilter),
    [portal.classes, classNameFilter],
  );

  const classId = useMemo(() => {
    const matches = portal.classes.filter(
      (c) => c.className === classNameFilter && c.section === sectionFilter,
    );
    return (matches.find((c) => c.isClassTeacher) ?? matches[0])?.id ?? "";
  }, [portal.classes, classNameFilter, sectionFilter]);

  useEffect(() => {
    if (!sections.includes(sectionFilter) && sections[0]) {
      setSectionFilter(sections[0]);
    }
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (!portal.isTeacher || !classId) return;
    teacherRepository.getExams(classId).then((e) => {
      setExams(e);
      if (!examId) setExamId(e.find((x) => x.marksStatus === "draft")?.id ?? e[0]?.id ?? "");
    });
  }, [classId, portal.isTeacher]);

  useEffect(() => {
    if (search.examId) setExamId(search.examId);
    if (search.classId) {
      const cls = portal.classes.find((c) => c.id === search.classId);
      if (cls) {
        setClassNameFilter(cls.className);
        setSectionFilter(cls.section);
      }
    }
  }, [search.examId, search.classId, portal.classes]);

  useEffect(() => {
    if (!examId || !portal.isTeacher) return;
    setLoading(true);
    teacherRepository.getMarkEntries(examId, classId).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [examId, classId, portal.isTeacher]);

  const update = (studentId: string, key: "internal" | "exam", v: number | null) => {
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, [key]: v } : r)));
  };

  const saveDraftFn = useCallback(async () => {
    await teacherRepository.saveMarkEntries(examId, classId, rows);
    toast.success("Draft saved");
  }, [examId, classId, rows]);

  const submitFn = useCallback(async () => {
    await teacherRepository.saveMarkEntries(examId, classId, rows);
    await teacherRepository.submitMarks(examId, classId);
    setRows((rs) => rs.map((r) => ({ ...r, status: "submitted" })));
    toast.success("Marks submitted to Admin for publishing");
  }, [examId, classId, rows]);

  const { run: saveDraft, pending: savingDraft } = useAsyncAction(saveDraftFn);
  const { run: submit, pending: submitting } = useAsyncAction(submitFn);

  const [confirmSubmit, setConfirmSubmit] = useState(false);

  if (!portal.isTeacher) return null;

  const exam = exams.find((e) => e.id === examId);
  const cls = portal.classes.find((c) => c.id === classId);
  const isPublished = rows[0]?.status === "published";
  const isSubmitted = rows[0]?.status === "submitted";
  const saving = savingDraft || submitting;
  const enteredCount = rows.filter((r) => r.exam != null || r.internal != null).length;

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
        description={`Marks for ${exam?.name ?? "this exam"} · Class ${cls?.className ?? ""}-${cls?.section ?? ""} will be locked for review. Admin will publish them to students and parents.`}
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
                const nextSections = portal.classes
                  .filter((c) => c.className === v)
                  .map((c) => c.section);
                if (!nextSections.includes(sectionFilter)) {
                  setSectionFilter(nextSections[0] ?? "");
                }
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
                  {e.name} ({e.marksStatus})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {loading ? (
        <PageSkeleton rows={5} />
      ) : (
        <SectionCard
          title={`${exam?.name ?? "Exam"} · Class ${cls?.className}-${cls?.section} · ${exam?.subject ?? cls?.subject ?? ""}`}
          action={
            <Badge variant="outline" className="rounded-md capitalize">
              {isPublished ? "Published" : isSubmitted ? "Submitted" : "Draft"}
            </Badge>
          }
        >
          <MarksAnalytics rows={rows} />
          <MarksTable rows={rows} onUpdate={update} readOnly={isPublished || isSubmitted} />
        </SectionCard>
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
