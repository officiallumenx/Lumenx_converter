import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Kpi,
  Pill,
  Button,
  Modal,
  Field,
  TextInput,
  Select,
  EmptyState,
} from "@lumenx/ui-admin";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Plus,
  Trash2,
  Wand2,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import { ExamScheduleWizard } from "@/components/exams/ExamScheduleWizard";
import { ExamTimetableTable } from "@/components/exams/ExamTimetableTable";
import { ExamDateCalendar } from "@/components/exams/ExamDateCalendar";
import {
  createExamTimetable,
  examDateLabel,
  examTimetableRange,
  getGradeScopeOptions,
  getInitialExamTimetables,
  getInitialExams,
  getSubjectNameOptions,
  addSlotToTimetable,
  removeSlotFromTimetable,
  isExamOutdated,
  isTimetableOutdated,
  type ExamRecord,
  type ExamTimetable,
} from "@/lib/exam-timetable-data";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Admin" }] }),
  component: ExamsPage,
});

const SECTION_OPTIONS = ["All", "A", "B", "C", "D"];

function ExamsPage() {
  const { profileId } = useDemoProfile();
  const college = isCollegeMode();
  const gradeOptions = useMemo(() => getGradeScopeOptions(), [profileId]);
  const subjectOptions = useMemo(() => getSubjectNameOptions(), [profileId]);

  const [exams, setExams] = useState<ExamRecord[]>(() => getInitialExams());
  const [timetables, setTimetables] = useState<ExamTimetable[]>(() =>
    getInitialExamTimetables(getInitialExams()),
  );
  const [selectedTtId, setSelectedTtId] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [createTtOpen, setCreateTtOpen] = useState(false);
  const [addPaperOpen, setAddPaperOpen] = useState(false);

  const activeExams = useMemo(() => exams.filter((e) => !isExamOutdated(e)), [exams]);
  const outdatedExams = useMemo(() => exams.filter((e) => isExamOutdated(e)), [exams]);

  const [ttExamId, setTtExamId] = useState("");
  const [ttStartTime, setTtStartTime] = useState("09:00");
  const [ttEndTime, setTtEndTime] = useState("12:00");

  const [paperDate, setPaperDate] = useState("");
  const [paperSubject, setPaperSubject] = useState(subjectOptions[0] ?? "Mathematics");
  const [paperGrade, setPaperGrade] = useState(gradeOptions[0] ?? "Grade 10");
  const [paperSection, setPaperSection] = useState("All");
  const [paperStart, setPaperStart] = useState("09:00");
  const [paperEnd, setPaperEnd] = useState("12:00");
  useEffect(() => {
    const initial = getInitialExams();
    setExams(initial);
    setTimetables(getInitialExamTimetables(initial));
    setSelectedTtId(null);
    setPaperGrade(gradeOptions[0] ?? "Grade 10");
    setPaperSubject(subjectOptions[0] ?? "Mathematics");
  }, [profileId]);

  useEffect(() => {
    if (activeExams.length === 0) {
      setTtExamId("");
      return;
    }
    if (!activeExams.some((e) => e.id === ttExamId)) {
      setTtExamId(activeExams[0]!.id);
    }
  }, [activeExams, ttExamId]);

  const selectedTt = timetables.find((t) => t.id === selectedTtId) ?? null;
  const selectedTtOutdated = selectedTt ? isTimetableOutdated(selectedTt, exams) : false;

  const selectedExamForTt = exams.find((e) => e.id === ttExamId) ?? null;

  const updateTimetable = useCallback((id: string, updater: (t: ExamTimetable) => ExamTimetable) => {
    setTimetables((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  }, []);

  const handleWizardComplete = ({
    exam,
    timetable,
  }: {
    exam: ExamRecord;
    timetable: ExamTimetable | null;
  }) => {
    setExams((p) => [...p, exam]);
    if (timetable) {
      setTimetables((p) => [...p, timetable]);
      setSelectedTtId(timetable.id);
    }
  };

  const deleteExam = (id: string) => {
    setExams((p) => p.filter((e) => e.id !== id));
    setTimetables((p) => p.filter((t) => t.examId !== id));
    if (selectedTt?.examId === id) setSelectedTtId(null);
  };

  const deleteTimetable = (id: string) => {
    setTimetables((p) => p.filter((t) => t.id !== id));
    if (selectedTtId === id) setSelectedTtId(null);
  };

  const openCreateTimetable = () => {
    if (activeExams[0]) setTtExamId(activeExams[0].id);
    setCreateTtOpen(true);
  };

  const handleCreateTimetable = () => {
    const exam = exams.find((e) => e.id === ttExamId);
    if (!exam || isExamOutdated(exam)) return;

    const created = createExamTimetable({
      exam,
      gradeScope: exam.grade,
      startDate: exam.startDate,
      endDate: exam.endDate,
      subjectNames: exam.subjects,
      section: exam.section,
      header: exam.header,
      startTime: ttStartTime,
      endTime: ttEndTime,
      skipBlockedDays: true,
    });
    setTimetables((p) => [...p, created]);
    setSelectedTtId(created.id);
    setCreateTtOpen(false);
  };

  const handleAddPaper = () => {
    if (!selectedTt || selectedTtOutdated || !paperDate || !paperSubject) return;
    const dayNumber = selectedTt.slots.length + 1;
    updateTimetable(selectedTt.id, (t) =>
      addSlotToTimetable(t, {
        date: paperDate,
        dayNumber,
        subject: paperSubject,
        grade: paperGrade,
        section: paperSection,
        startTime: paperStart,
        endTime: paperEnd,
        room: "",
        invigilator: "",
      }),
    );
    setAddPaperOpen(false);
  };

  const publishTimetable = (id: string) => {
    updateTimetable(id, (t) => ({ ...t, status: "published" }));
  };

  const upcoming = exams.filter(
    (e) => !isExamOutdated(e) && (e.status === "scheduled" || e.status === "in-progress"),
  ).length;
  const grading = exams.filter((e) => !isExamOutdated(e) && e.status === "grading").length;
  const published = exams.filter((e) => e.status === "published").length;
  const ttPublished = timetables.filter((t) => t.status === "published").length;

  if (selectedTt) {
    return (
      <AppShell
        title={selectedTt.examName}
        subtitle={`${selectedTt.term} · ${examTimetableRange(selectedTt.slots)} · ${selectedTt.slots.length} papers`}
        actions={
          <>
            <Button onClick={() => setSelectedTtId(null)}>
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            {selectedTtOutdated ? (
              <Button
                onClick={() => deleteTimetable(selectedTt.id)}
                aria-label="Delete timetable"
              >
                <Trash2 className="size-3.5" /> Delete timetable
              </Button>
            ) : (
              <>
                {selectedTt.status === "draft" && (
                  <Button variant="primary" onClick={() => publishTimetable(selectedTt.id)}>
                    <Send className="size-3.5" /> Publish timetable
                  </Button>
                )}
                <Button variant="primary" onClick={() => setAddPaperOpen(true)}>
                  <Plus className="size-3.5" /> Add paper
                </Button>
              </>
            )}
          </>
        }
      >
        {selectedTtOutdated && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            This timetable is linked to an outdated exam — view only. You can delete it but not
            edit papers or publish.
          </div>
        )}

        <div className={`mb-4 ${selectedTtOutdated ? "opacity-60" : ""}`}>
          <ExamTimetableTable
            timetable={selectedTt}
            college={college}
            readOnly={selectedTtOutdated}
            onRemoveSlot={
              selectedTtOutdated
                ? undefined
                : (slotId) =>
                    updateTimetable(selectedTt.id, (t) => removeSlotFromTimetable(t, slotId))
            }
          />
        </div>

        {!selectedTtOutdated && (
          <AddPaperModal
            open={addPaperOpen}
            onClose={() => setAddPaperOpen(false)}
            college={college}
            gradeOptions={gradeOptions}
            subjectOptions={subjectOptions}
            paperDate={paperDate}
            setPaperDate={setPaperDate}
            paperSubject={paperSubject}
            setPaperSubject={setPaperSubject}
            paperGrade={paperGrade}
            setPaperGrade={setPaperGrade}
            paperSection={paperSection}
            setPaperSection={setPaperSection}
            paperStart={paperStart}
            setPaperStart={setPaperStart}
            paperEnd={paperEnd}
            setPaperEnd={setPaperEnd}
            onAdd={handleAddPaper}
          />
        )}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Exams"
      subtitle="Exam pipeline, exam timetables, and grading · marks in Marks module"
      actions={
        <>
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="size-3.5" /> Create exam
          </Button>
          <Button variant="primary" onClick={openCreateTimetable} disabled={activeExams.length === 0}>
            <CalendarDays className="size-3.5" /> Create exam timetable
          </Button>
        </>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Upcoming" value={String(upcoming)} delta="Next 30 days" />
        <Kpi label="Exam timetables" value={String(timetables.length)} delta={`${ttPublished} published`} />
        <Kpi label="Pending grading" value={String(grading)} tone="down" />
        <Kpi label="Published results" value={String(published)} delta="This term" />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Exam timetables"
          hint="Subject-wise date schedule by class and section"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateTimetable}
              disabled={activeExams.length === 0}
            >
              <Plus className="size-3.5" /> New timetable
            </Button>
          }
        />
        {timetables.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<CalendarDays className="size-6 text-primary" />}
              title="No exam timetables yet"
              hint={
                activeExams.length === 0
                  ? "Schedule an active exam first, then create a timetable for it."
                  : "Create a timetable to assign exam dates, subjects, and times for each paper."
              }
              action={
                activeExams.length > 0 ? (
                  <Button variant="primary" onClick={openCreateTimetable}>
                    <Wand2 className="size-3.5" /> Create exam timetable
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setScheduleOpen(true)}>
                    <Plus className="size-3.5" /> Create exam
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetables.map((tt) => {
              const outdated = isTimetableOutdated(tt, exams);
              return (
                <div key={tt.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedTtId(tt.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      outdated
                        ? "border-border/60 bg-muted/30 text-muted-foreground opacity-60 hover:opacity-70"
                        : "border-border bg-surface hover:bg-surface-hover hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold leading-snug">{tt.examName}</div>
                      {outdated ? (
                        <Pill tone="neutral">Outdated</Pill>
                      ) : tt.status === "published" ? (
                        <Pill tone="success">Published</Pill>
                      ) : (
                        <Pill tone="warning">Draft</Pill>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{tt.term}</div>
                    <div className="mt-3 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dates</span>
                        <span className="font-medium">{examTimetableRange(tt.slots)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Papers</span>
                        <span className="font-mono">{tt.slots.length}</span>
                      </div>
                    </div>
                    {tt.slots.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tt.slots.slice(0, 4).map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {s.subject}
                          </span>
                        ))}
                        {tt.slots.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{tt.slots.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                  {outdated && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTimetable(tt.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
                      aria-label="Delete timetable"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Examination pipeline"
          action={
            <Link to="/marks">
              <Button>
                <ClipboardList className="size-3.5" /> Go to Marks
              </Button>
            </Link>
          }
        />
        <div className="px-5 pb-5 divide-y divide-border">
          {exams.map((e) => {
            const outdated = isExamOutdated(e);
            return (
              <div
                key={e.id}
                className={`py-4 flex items-center gap-4 ${outdated ? "opacity-50 grayscale" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`text-sm font-medium ${outdated ? "text-muted-foreground" : ""}`}
                    >
                      {e.name}
                    </div>
                    {outdated ? (
                      <Pill tone="neutral">Outdated</Pill>
                    ) : (
                      <>
                        {e.status === "scheduled" && <Pill tone="info">Scheduled</Pill>}
                        {e.status === "in-progress" && <Pill tone="warning">In progress</Pill>}
                        {e.status === "grading" && <Pill tone="warning">Grading</Pill>}
                        {e.status === "published" && <Pill tone="success">Published</Pill>}
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {e.grade} · {examDateLabel(e)}
                  </div>
                </div>
                {!outdated && (
                  <div className="w-48 hidden md:block">
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${e.progress}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right">
                      {e.progress}%
                    </div>
                  </div>
                )}
                {outdated && (
                  <Button
                    size="sm"
                    onClick={() => deleteExam(e.id)}
                    aria-label={`Delete ${e.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={createTtOpen}
        onClose={() => setCreateTtOpen(false)}
        title="Create exam timetable"
        subtitle="Select an exam — dates and subjects come from step 1"
        size="lg"
        footer={
          <>
            <Button onClick={() => setCreateTtOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTimetable} disabled={!ttExamId || !selectedExamForTt}>
              <Wand2 className="size-3.5" /> Generate timetable
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Exam" required>
              <Select value={ttExamId} onChange={(e) => setTtExamId(e.target.value)}>
                {activeExams.length === 0 && (
                  <option value="">No active exams — create one first</option>
                )}
                {activeExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.term}
                  </option>
                ))}
                {outdatedExams.length > 0 && (
                  <optgroup label="Outdated (not selectable)">
                    {outdatedExams.map((e) => (
                      <option key={e.id} value={e.id} disabled>
                        {e.name} · {e.term} — outdated
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
            </Field>
            <Field label="Paper start time">
              <TextInput type="time" value={ttStartTime} onChange={(e) => setTtStartTime(e.target.value)} />
            </Field>
            <Field label="Paper end time">
              <TextInput type="time" value={ttEndTime} onChange={(e) => setTtEndTime(e.target.value)} />
            </Field>
          </div>

          {selectedExamForTt && (
            <>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-muted-foreground">Class</span>
                  <div className="font-medium">{selectedExamForTt.grade}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Section</span>
                  <div className="font-medium">{selectedExamForTt.section}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Dates</span>
                  <div className="font-medium">{examDateLabel(selectedExamForTt)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Subjects</span>
                  <div className="font-medium">{selectedExamForTt.subjects.join(", ")}</div>
                </div>
              </div>
              <Field label="Calendar preview" hint="Non-exam days are skipped when generating">
                <ExamDateCalendar
                  startDate={selectedExamForTt.startDate}
                  endDate={selectedExamForTt.endDate}
                  subjects={selectedExamForTt.subjects}
                />
              </Field>
            </>
          )}
        </div>
      </Modal>

      <ExamScheduleWizard
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onComplete={handleWizardComplete}
        college={college}
        gradeOptions={gradeOptions}
        subjectOptions={subjectOptions}
      />
    </AppShell>
  );
}

function AddPaperModal({
  open,
  onClose,
  college,
  gradeOptions,
  subjectOptions,
  paperDate,
  setPaperDate,
  paperSubject,
  setPaperSubject,
  paperGrade,
  setPaperGrade,
  paperSection,
  setPaperSection,
  paperStart,
  setPaperStart,
  paperEnd,
  setPaperEnd,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  college: boolean;
  gradeOptions: string[];
  subjectOptions: string[];
  paperDate: string;
  setPaperDate: (v: string) => void;
  paperSubject: string;
  setPaperSubject: (v: string) => void;
  paperGrade: string;
  setPaperGrade: (v: string) => void;
  paperSection: string;
  setPaperSection: (v: string) => void;
  paperStart: string;
  setPaperStart: (v: string) => void;
  paperEnd: string;
  setPaperEnd: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add exam paper"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onAdd} disabled={!paperDate || !paperSubject}>
            Add paper
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required>
          <TextInput type="date" value={paperDate} onChange={(e) => setPaperDate(e.target.value)} />
        </Field>
        <Field label="Subject" required>
          <Select value={paperSubject} onChange={(e) => setPaperSubject(e.target.value)}>
            {subjectOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label={college ? "Batch" : "Class"} required>
          <Select value={paperGrade} onChange={(e) => setPaperGrade(e.target.value)}>
            {gradeOptions.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <Field label="Section">
          <Select value={paperSection} onChange={(e) => setPaperSection(e.target.value)}>
            {SECTION_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start time">
          <TextInput type="time" value={paperStart} onChange={(e) => setPaperStart(e.target.value)} />
        </Field>
        <Field label="End time">
          <TextInput type="time" value={paperEnd} onChange={(e) => setPaperEnd(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
