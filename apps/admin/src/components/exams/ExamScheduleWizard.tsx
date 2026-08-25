import { Button, Field, Modal, TextInput } from "@lumenx/ui-admin";
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { ExamDateCalendar } from "@/components/exams/ExamDateCalendar";
import { assignSubjectsToDates } from "@/lib/exam-calendar-utils";
import {
  buildExamHeader,
  createExamRecord,
  createExamTimetable,
  examClassDisplayLabel,
  examMarksLabel,
  sectionsFromClassSectionKeys,
  validateExamMarks,
  type ExamRecord,
  type ExamTimetable,
} from "@/lib/exam-timetable-data";
import type { ExamClassScope } from "@lumenx/module-exams";

export type ExamWizardResult = {
  exam: ExamRecord;
  /** Always created with the exam (draft until published). */
  timetable: ExamTimetable;
};

export function ExamScheduleWizard({
  open,
  onClose,
  onComplete,
  college,
  subjectOptions,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (result: ExamWizardResult) => void;
  college: boolean;
  subjectOptions: string[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [classScope, setClassScope] = useState<ExamClassScope>("all");
  /** Class · section keys (`Grade 10::A`). Empty when classScope is "all". */
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [headerOverride, setHeaderOverride] = useState<string | null>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [totalMarks, setTotalMarks] = useState("100");
  const [internalMarks, setInternalMarks] = useState("");
  const [externalMarks, setExternalMarks] = useState("");

  const autoHeader = useMemo(
    () => buildExamHeader(name, startDate, endDate || startDate),
    [name, startDate, endDate],
  );
  const header = headerOverride ?? autoHeader;

  const parsedMarks = useMemo(() => {
    const parseOpt = (raw: string): number | null => {
      const t = raw.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const totalRaw = totalMarks.trim();
    const total = totalRaw === "" ? null : Number(totalRaw);
    return {
      totalMarks: total != null && Number.isFinite(total) ? total : null,
      internalMarks: parseOpt(internalMarks),
      externalMarks: parseOpt(externalMarks),
    };
  }, [totalMarks, internalMarks, externalMarks]);

  const marksError = useMemo(() => validateExamMarks(parsedMarks), [parsedMarks]);

  const reset = () => {
    setStep(1);
    setName("");
    setClassScope("all");
    setClassSectionKeys([]);
    setStartDate("");
    setEndDate("");
    setSubjects([]);
    setStartTime("09:00");
    setEndTime("12:00");
    setHeaderOverride(null);
    setEditingHeader(false);
    setTotalMarks("100");
    setInternalMarks("");
    setExternalMarks("");
  };

  useEffect(() => {
    if (!open) return;
    setClassScope("all");
    setClassSectionKeys([]);
    setHeaderOverride(null);
    setEditingHeader(false);
    setTotalMarks("100");
    setInternalMarks("");
    setExternalMarks("");
  }, [open]);

  const classSelectionValid = classScope === "all" || classSectionKeys.length > 0;

  const step1Valid =
    header.trim().length > 0 &&
    name.trim().length > 0 &&
    classSelectionValid &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    endDate >= startDate &&
    !!startTime &&
    !!endTime &&
    subjects.length > 0 &&
    !marksError &&
    parsedMarks.totalMarks != null;

  const paperCount = useMemo(
    () => assignSubjectsToDates(startDate, endDate, subjects).length,
    [startDate, endDate, subjects],
  );

  const step2Valid = Boolean(startTime && endTime && paperCount === subjects.length);

  const handleClose = () => {
    reset();
    onClose();
  };

  const startHeaderEdit = () => {
    setHeaderOverride(header);
    setEditingHeader(true);
  };

  const resetHeaderAuto = () => {
    setHeaderOverride(null);
    setEditingHeader(false);
  };

  const finish = () => {
    if (!step1Valid || !step2Valid) return;

    const grades = classScope === "all" ? [] : classSectionKeys;
    const gradeLabel = examClassDisplayLabel(classScope, grades);
    const sectionParts = sectionsFromClassSectionKeys(classSectionKeys);
    const sectionLabel =
      classScope === "all"
        ? "All"
        : sectionParts.length === 0
          ? "All"
          : sectionParts.length === 1
            ? sectionParts[0]!
            : sectionParts.join(", ");

    const exam = createExamRecord({
      name,
      header,
      classScope,
      grades,
      startDate,
      endDate,
      startTime,
      endTime,
      subjects,
      totalMarks: parsedMarks.totalMarks!,
      internalMarks: parsedMarks.internalMarks,
      externalMarks: parsedMarks.externalMarks,
    });

    const timetable = createExamTimetable({
      exam,
      gradeScope: gradeLabel,
      startDate,
      endDate,
      subjectNames: subjects,
      section: sectionLabel,
      header,
      startTime,
      endTime,
      skipBlockedDays: true,
    });

    onComplete({ exam, timetable });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create exam"
      subtitle={
        step === 1
          ? "Step 1 of 2 · Exam details"
          : "Step 2 of 2 · Timetable is created automatically"
      }
      size="lg"
      footer={
        step === 1 ? (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}>
              Next <ChevronRight className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(1)}>
              <ChevronLeft className="size-3.5" /> Back
            </Button>
            <Button variant="primary" onClick={finish} disabled={!step2Valid}>
              <Wand2 className="size-3.5" /> Create exam & timetable
            </Button>
          </>
        )
      }
    >
      <div className="mb-5 flex items-center gap-2">
        <StepBadge n={1} label="Details" active={step === 1} done={step === 2} />
        <div className="h-px flex-1 bg-border" />
        <StepBadge n={2} label="Timetable" active={step === 2} done={false} />
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Exam name" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={college ? "e.g. Mid-semester Examination" : "e.g. Mid-Term Examination"}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" required>
              <TextInput
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </Field>
            <Field label="End date" required>
              <TextInput
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
            <Field label="Exam time · from" required>
              <TextInput
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="Exam time · to" required>
              <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>

          <Field label="Timetable header" required hint="Shown on the printed / published timetable">
            {editingHeader ? (
              <div className="space-y-2">
                <TextInput
                  value={headerOverride ?? ""}
                  onChange={(e) => setHeaderOverride(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setEditingHeader(false)}>
                    Done
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetHeaderAuto}>
                    <RotateCcw className="size-3.5" /> Reset auto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                  {header || (
                    <span className="font-normal text-muted-foreground">
                      Enter exam name and dates to auto-generate
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startHeaderEdit}
                  disabled={!name && !startDate}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>
            )}
          </Field>

          <ClassSectionAudienceField
            scope={classScope}
            selectedKeys={classSectionKeys}
            onScopeChange={setClassScope}
            onSelectedKeysChange={setClassSectionKeys}
            required
            hint="Students and parents in these classes can view exam dates and timetable in Connect"
          />

          <Field
            label="Marks"
            required
            hint="Total marks are required. Internal and external are optional (e.g. 100 = Int 20 + Ext 80)."
          >
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total · required
                </label>
                <TextInput
                  type="number"
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Internal · optional
                </label>
                <TextInput
                  type="number"
                  min={0}
                  value={internalMarks}
                  onChange={(e) => setInternalMarks(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  External · optional
                </label>
                <TextInput
                  type="number"
                  min={0}
                  value={externalMarks}
                  onChange={(e) => setExternalMarks(e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
            </div>
            {marksError ? (
              <p className="mt-2 text-[11px] text-destructive">{marksError}</p>
            ) : parsedMarks.totalMarks != null ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Scheme:{" "}
                <span className="font-medium text-foreground">
                  {examMarksLabel({
                    totalMarks: Math.round(parsedMarks.totalMarks),
                    internalMarks:
                      parsedMarks.internalMarks != null
                        ? Math.round(parsedMarks.internalMarks)
                        : null,
                    externalMarks:
                      parsedMarks.externalMarks != null
                        ? Math.round(parsedMarks.externalMarks)
                        : null,
                  })}
                </span>
              </p>
            ) : null}
          </Field>

          <Field label="Subjects / papers" required hint="One paper per working day in step 2">
            <div className="lx-chip-picker mt-1 flex flex-wrap gap-2 rounded-lg border border-border bg-background p-2">
              {subjectOptions.map((s) => (
                <label
                  key={s}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs select-none ${subjects.includes(s) ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(s)}
                    onChange={() =>
                      setSubjects((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                    className="size-3.5 shrink-0 accent-primary"
                  />
                  {s}
                </label>
              ))}
            </div>
          </Field>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Details preview
              </span>
              <Button size="sm" variant="outline" onClick={() => setStep(1)}>
                <Pencil className="size-3.5" /> Quick edit
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Header · </span>
                <span className="font-medium">{header || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Audience · </span>
                <span className="font-medium">
                  {examClassDisplayLabel(classScope, classSectionKeys)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Dates · </span>
                <span className="font-medium">
                  {startDate}
                  {endDate && endDate !== startDate ? ` to ${endDate}` : ""}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Exam time · </span>
                <span className="font-mono font-medium">
                  {startTime} – {endTime}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Marks · </span>
                <span className="font-medium">
                  {parsedMarks.totalMarks != null
                    ? examMarksLabel({
                        totalMarks: Math.round(parsedMarks.totalMarks),
                        internalMarks:
                          parsedMarks.internalMarks != null
                            ? Math.round(parsedMarks.internalMarks)
                            : null,
                        externalMarks:
                          parsedMarks.externalMarks != null
                            ? Math.round(parsedMarks.externalMarks)
                            : null,
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Exam time · from" required>
              <TextInput
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="Exam time · to" required>
              <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>

          <Field
            label="Exam calendar"
            hint="Sundays, second Saturdays, and holidays (e.g. Good Friday) are skipped automatically"
          >
            <ExamDateCalendar
              startDate={startDate}
              endDate={endDate}
              subjects={subjects}
              onQuickEdit={() => setStep(1)}
              onReorderSubjects={setSubjects}
            />
          </Field>

          {paperCount < subjects.length && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Only {paperCount} of {subjects.length} papers fit between {startDate} and {endDate}.
              Extend the end date or remove subjects so the timetable can be created.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function StepBadge({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          active
            ? "bg-primary text-primary-foreground"
            : done
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
