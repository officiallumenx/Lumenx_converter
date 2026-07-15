import { Button, Field, Modal, Select, TextInput } from "@lumenx/ui-admin";
import { ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExamDateCalendar } from "@/components/exams/ExamDateCalendar";
import { assignSubjectsToDates } from "@/lib/exam-calendar-utils";
import {
  createExamRecord,
  createExamTimetable,
  type ExamRecord,
  type ExamTimetable,
} from "@/lib/exam-timetable-data";

const SECTION_OPTIONS = ["All", "A", "B", "C", "D"];

export type ExamWizardResult = {
  exam: ExamRecord;
  timetable: ExamTimetable | null;
};

export function ExamScheduleWizard({
  open,
  onClose,
  onComplete,
  college,
  gradeOptions,
  subjectOptions,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (result: ExamWizardResult) => void;
  college: boolean;
  gradeOptions: string[];
  subjectOptions: string[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [header, setHeader] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(gradeOptions[0] ?? "Grade 10");
  const [section, setSection] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const reset = () => {
    setStep(1);
    setHeader("");
    setName("");
    setGrade(gradeOptions[0] ?? "Grade 10");
    setSection("All");
    setStartDate("");
    setEndDate("");
    setSubjects([]);
    setStartTime("09:00");
    setEndTime("12:00");
  };

  useEffect(() => {
    if (open) {
      setGrade(gradeOptions[0] ?? "Grade 10");
    }
  }, [open, gradeOptions]);

  const step1Valid =
    header.trim().length > 0 &&
    name.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    endDate >= startDate &&
    subjects.length > 0;

  const paperCount = useMemo(
    () => assignSubjectsToDates(startDate, endDate, subjects).length,
    [startDate, endDate, subjects],
  );

  const step2Valid = startTime && endTime && paperCount === subjects.length;

  const handleClose = () => {
    reset();
    onClose();
  };

  const goStep2 = () => {
    if (!step1Valid) return;
    setStep(2);
  };

  const finish = (withTimetable: boolean) => {
    if (!step1Valid) return;
    if (withTimetable && !step2Valid) return;

    const exam = createExamRecord({
      name,
      header,
      grade,
      section,
      startDate,
      endDate,
      subjects,
    });

    let timetable: ExamTimetable | null = null;
    if (withTimetable) {
      timetable = createExamTimetable({
        exam,
        gradeScope: grade,
        startDate,
        endDate,
        subjectNames: subjects,
        section,
        header,
        startTime,
        endTime,
        skipBlockedDays: true,
      });
    }

    onComplete({ exam, timetable });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create exam"
      subtitle={step === 1 ? "Step 1 of 2 · Exam details" : "Step 2 of 2 · Timetable & dates"}
      size="lg"
      footer={
        step === 1 ? (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={goStep2} disabled={!step1Valid}>
              Next <ChevronRight className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(1)}>
              <ChevronLeft className="size-3.5" /> Back
            </Button>
            <Button onClick={() => finish(false)} disabled={!step1Valid}>
              Save without timetable
            </Button>
            <Button variant="primary" onClick={() => finish(true)} disabled={!step2Valid}>
              <Wand2 className="size-3.5" /> Generate timetable
            </Button>
          </>
        )
      }
    >
      <div className="flex items-center gap-2 mb-5">
        <StepBadge n={1} label="Details" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <StepBadge n={2} label="Timetable" active={step === 2} done={false} />
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Header / banner text" required hint="Shown at the top of the exam timetable">
            <TextInput
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Mid-Term Examination · Term 2 · 2025–26"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Exam name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Unit Test 4"
              />
            </Field>
            <Field label={college ? "Batch / class" : "Classes"} required>
              <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section">
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
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
          </div>
          <Field label="Subjects / papers" required hint="One paper per working day in step 2">
            <div className="flex flex-wrap gap-2 mt-1">
              {subjectOptions.map((s) => (
                <label
                  key={s}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${subjects.includes(s) ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(s)}
                    onChange={() =>
                      setSubjects((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
          </Field>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Paper start time" required>
              <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="Paper end time" required>
              <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>

          <Field
            label="Exam calendar"
            hint="Sundays, second Saturdays, and holidays (e.g. Good Friday) are skipped automatically"
          >
            <ExamDateCalendar startDate={startDate} endDate={endDate} subjects={subjects} />
          </Field>

          {paperCount < subjects.length && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Only {paperCount} of {subjects.length} papers fit between {startDate} and {endDate}.
              Extend the end date or use &quot;Save without timetable&quot;.
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
      <span
        className={`size-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
          active
            ? "bg-primary text-primary-foreground"
            : done
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </span>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
