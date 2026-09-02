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
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteExam as deleteExamApi,
  getExam,
  loadExamsList,
  resolveExamsListView,
  shouldCommitExamsLoad,
  updateExam,
  type ExamListItem,
  type ExamTimetableListItem,
  type ExamsListStatus,
} from "@/lib/exams";
import { listSubjects, type SubjectDto } from "@/lib/subjects";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import { ExamScheduleWizard } from "@/components/exams/ExamScheduleWizard";
import { ExamApiCreateDialog } from "@/components/exams/ExamApiCreateDialog";
import { ExamTimetableTable } from "@/components/exams/ExamTimetableTable";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  examDateLabel,
  examMarksLabel,
  examTimeLabel,
  examTimetableRange,
  formatExamClassLabel,
  getGradeScopeOptions,
  getInitialExamTimetables,
  getInitialExams,
  getSubjectNameOptions,
  addSlotToTimetable,
  removeSlotFromTimetable,
  isExamOutdated,
  isTimetableOutdated,
  syncExamToLearnerSchedules,
  unpublishExamFromLearners,
  type ExamRecord,
  type ExamTimetable,
} from "@/lib/exam-timetable-data";
import {
  notifyExamTimetablePublished,
  notifyExamScheduleChange,
  scheduleExamPaperReminders,
} from "@lumenx/module-notifications";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Admin" }] }),
  component: ExamsPage,
});

const SECTION_OPTIONS = ["All", "A", "B", "C", "D"];

type ExamRow = ExamRecord | ExamListItem;
type TimetableRow = ExamTimetable | ExamTimetableListItem;

function ExamsPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const { profileId } = useDemoProfile();
  const college = isCollegeMode();
  const gradeOptions = useMemo(() => getGradeScopeOptions(), [profileId]);
  const subjectOptions = useMemo(() => getSubjectNameOptions(), [profileId]);

  const [exams, setExams] = useState<ExamRecord[]>(() =>
    apiMode ? [] : getInitialExams(),
  );
  const [timetables, setTimetables] = useState<ExamTimetable[]>(() =>
    apiMode ? [] : getInitialExamTimetables(getInitialExams()),
  );
  const [apiItems, setApiItems] = useState<ExamListItem[]>([]);
  const [apiTimetables, setApiTimetables] = useState<ExamTimetableListItem[]>([]);
  const [listStatus, setListStatus] = useState<ExamsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveExamsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedTimetables: apiTimetables,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayExams: ExamRow[] = apiMode ? listView.items : exams;
  const displayTimetables: TimetableRow[] = apiMode ? listView.timetables : timetables;
  const [selectedTtId, setSelectedTtId] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [addPaperOpen, setAddPaperOpen] = useState(false);
  const [apiSubjects, setApiSubjects] = useState<SubjectDto[]>([]);

  const [paperDate, setPaperDate] = useState("");
  const [paperSubject, setPaperSubject] = useState(subjectOptions[0] ?? "Mathematics");
  const [paperGrade, setPaperGrade] = useState(gradeOptions[0] ?? "Grade 10");
  const [paperSection, setPaperSection] = useState("All");
  const [paperStart, setPaperStart] = useState("09:00");
  const [paperEnd, setPaperEnd] = useState("12:00");
  useEffect(() => {
    if (apiMode) return;
    const initial = getInitialExams();
    setExams(initial);
    setTimetables(getInitialExamTimetables(initial));
    setSelectedTtId(null);
    setPaperGrade(gradeOptions[0] ?? "Grade 10");
    setPaperSubject(subjectOptions[0] ?? "Mathematics");
  }, [apiMode, profileId, gradeOptions, subjectOptions]);

  useEffect(() => {
    if (!apiMode || !instituteCtx.activeInstituteId) {
      setApiSubjects([]);
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    void listSubjects({ instituteId })
      .then((rows) => {
        if (activeInstituteIdRef.current !== instituteId) return;
        setApiSubjects(rows);
        if (rows[0]) setPaperSubject(rows[0].id);
      })
      .catch(() => {
        if (activeInstituteIdRef.current !== instituteId) return;
        setApiSubjects([]);
      });
  }, [apiMode, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setApiTimetables([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setApiTimetables([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setApiTimetables([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadExamsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitExamsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setApiTimetables(next.timetables);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    setSelectedTtId(null);
    setScheduleOpen(false);
    setAddPaperOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const listHint =
    listView.status === "loading"
      ? "Loading exams…"
      : listView.status === "needs_institute"
        ? "Select an institute to load exams."
        : listView.status === "forbidden"
          ? listView.errorMessage ??
            "You do not have access to exams for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load exams."
            : listView.status === "empty"
              ? "No exams found for this institute."
              : null;

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const openTimetable = (id: string) => {
    setSelectedTtId(id);
  };

  const selectedTt: TimetableRow | null = selectedTtId
    ? (displayTimetables.find((t) => t.id === selectedTtId) ?? null)
    : null;
  const selectedTtOutdated = selectedTt
    ? apiMode
      ? false
      : isTimetableOutdated(selectedTt as ExamTimetable, exams)
    : false;

  const updateTimetable = useCallback(
    (id: string, updater: (t: ExamTimetable) => ExamTimetable) => {
      setTimetables((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const before = t;
          const next = updater(t);
          if (next.status === "published") {
            const exam = exams.find((e) => e.id === next.examId);
            if (exam) syncExamToLearnerSchedules(exam, next);
            if (before.status === "published") {
              const beforeById = new Map(before.slots.map((s) => [s.id, s]));
              for (const slot of next.slots) {
                const prevSlot = beforeById.get(slot.id);
                if (!prevSlot) continue;
                if (prevSlot.date !== slot.date) {
                  notifyExamScheduleChange({
                    examId: exam?.id ?? next.examId,
                    examName: next.examName,
                    subject: slot.subject,
                    kind: "date",
                    newValue: slot.date,
                  });
                }
                if (prevSlot.startTime !== slot.startTime || prevSlot.endTime !== slot.endTime) {
                  notifyExamScheduleChange({
                    examId: exam?.id ?? next.examId,
                    examName: next.examName,
                    subject: slot.subject,
                    kind: "time",
                    newValue: `${slot.startTime}–${slot.endTime}`,
                  });
                }
                if ((prevSlot.room || "") !== (slot.room || "")) {
                  notifyExamScheduleChange({
                    examId: exam?.id ?? next.examId,
                    examName: next.examName,
                    subject: slot.subject,
                    kind: "venue",
                    newValue: slot.room || "TBA",
                  });
                }
              }
              for (const prevSlot of before.slots) {
                if (!next.slots.some((s) => s.id === prevSlot.id)) {
                  notifyExamScheduleChange({
                    examId: exam?.id ?? next.examId,
                    examName: next.examName,
                    subject: prevSlot.subject,
                    kind: "cancelled",
                    detail: "This paper was removed from the timetable.",
                  });
                }
              }
            }
          }
          return next;
        }),
      );
    },
    [exams],
  );

  const handleWizardComplete = ({
    exam,
    timetable,
  }: {
    exam: ExamRecord;
    timetable: ExamTimetable;
  }) => {
    if (apiMode) return;
    setExams((p) => [...p, exam]);
    setTimetables((p) => [...p, timetable]);
    setSelectedTtId(timetable.id);
    notify(
      `Exam created with timetable (draft). Publish to share with ${formatExamClassLabel(exam)} students & parents.`,
    );
  };

  const deleteExam = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      void deleteExamApi(id)
        .then(() => {
          setSelectedTtId((cur) => {
            const curTt = displayTimetables.find((t) => t.id === cur);
            return curTt?.examId === id ? null : cur;
          });
          setReloadKey((k) => k + 1);
          notify("Exam deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete exam");
        });
      return;
    }
    setExams((p) => p.filter((e) => e.id !== id));
    setTimetables((p) => p.filter((t) => t.examId !== id));
    unpublishExamFromLearners(id);
    setSelectedTtId((cur) => {
      const curTt = timetables.find((t) => t.id === cur);
      return curTt?.examId === id ? null : cur;
    });
  };

  const deleteTimetable = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      const tt = displayTimetables.find((t) => t.id === id);
      if (!tt) return;
      void deleteExamApi(tt.examId)
        .then(() => {
          setSelectedTtId(null);
          setReloadKey((k) => k + 1);
          notify("Exam timetable deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete timetable");
        });
      return;
    }
    const tt = timetables.find((t) => t.id === id);
    setTimetables((p) => p.filter((t) => t.id !== id));
    if (tt) {
      const exam = exams.find((e) => e.id === tt.examId);
      if (exam) syncExamToLearnerSchedules(exam, null);
      else unpublishExamFromLearners(tt.examId);
    }
    if (selectedTtId === id) setSelectedTtId(null);
  };

  const handleAddPaper = () => {
    if (!writesEnabled) return;
    if (apiMode) {
      if (!selectedTt || !paperDate || !paperSubject) return;
      void getExam(selectedTt.examId)
        .then((exam) =>
          updateExam(exam.id, {
            subjectSchedules: [
              ...exam.subjectSchedules.map((s) => ({
                subjectId: s.subjectId,
                paperDate: s.paperDate,
                startsAt: s.startsAt,
                endsAt: s.endsAt,
                room: s.room,
                invigilatorTeacherId: s.invigilatorTeacherId,
              })),
              {
                subjectId: paperSubject,
                paperDate,
                startsAt: paperStart,
                endsAt: paperEnd,
              },
            ],
          }),
        )
        .then(() => {
          setAddPaperOpen(false);
          setReloadKey((k) => k + 1);
          notify("Paper added to exam schedule");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to add paper");
        });
      return;
    }
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
    if (!writesEnabled) return;
    const tt = displayTimetables.find((t) => t.id === id);
    if (!tt) return;
    if (apiMode) {
      void updateExam(tt.examId, { scheduleStatus: "published" })
        .then(() => {
          setReloadKey((k) => k + 1);
          notifyExamTimetablePublished({
            examId: tt.examId,
            examName: tt.examName,
            dateRange: examTimetableRange(tt.slots),
            classLabel: tt.grade,
          });
          notify("Timetable published to students & parents");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to publish timetable");
        });
      return;
    }
    const exam = exams.find((e) => e.id === tt.examId);
    setTimetables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, status: "published" as const };
        if (exam) syncExamToLearnerSchedules(exam, next);
        return next;
      }),
    );
    const audience = exam ? formatExamClassLabel(exam) : "assigned classes";
    notifyExamTimetablePublished({
      examId: tt.examId,
      examName: tt.examName,
      dateRange: examTimetableRange(tt.slots),
      classLabel: audience,
    });
    for (const slot of tt.slots) {
      scheduleExamPaperReminders({
        examId: tt.examId,
        examName: tt.examName,
        subject: slot.subject,
        time: `${slot.startTime}–${slot.endTime}`,
        venue: slot.room || "TBA",
      });
    }
    notify(
      `Timetable published. Students and parents in ${audience} can now see the exam schedule.`,
    );
  };

  const kpiExams = listView.rowsValid ? displayExams : [];
  const kpiTimetables = listView.rowsValid ? displayTimetables : [];

  const upcoming = kpiExams.filter(
    (e) => !isExamOutdated(e) && (e.status === "scheduled" || e.status === "in-progress"),
  ).length;
  const grading = kpiExams.filter((e) => !isExamOutdated(e) && e.status === "grading").length;
  const published = kpiExams.filter((e) => e.status === "published").length;
  const ttPublished = kpiTimetables.filter((t) => t.status === "published").length;

  if (selectedTt) {
    return (
      <AppShell
        title={selectedTt.examName}
        subtitle={`${examTimetableRange(selectedTt.slots)} · ${selectedTt.slots.length} papers`}
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
                {selectedTt.status === "draft" && writesEnabled && (
                  <Button variant="primary" onClick={() => publishTimetable(selectedTt.id)}>
                    <Send className="size-3.5" /> Publish timetable
                  </Button>
                )}
                {writesEnabled && !selectedTtOutdated ? (
                  <Button variant="primary" onClick={() => setAddPaperOpen(true)}>
                    <Plus className="size-3.5" /> Add paper
                  </Button>
                ) : null}
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
            timetable={selectedTt as ExamTimetable}
            college={college}
            readOnly={selectedTtOutdated || !writesEnabled}
            onRemoveSlot={
              selectedTtOutdated || !writesEnabled
                ? undefined
                : (slotId) => {
                    if (apiMode) {
                      void getExam(selectedTt.examId)
                        .then((exam) =>
                          updateExam(exam.id, {
                            subjectSchedules: exam.subjectSchedules
                              .filter((s) => s.id !== slotId)
                              .map((s) => ({
                                subjectId: s.subjectId,
                                paperDate: s.paperDate,
                                startsAt: s.startsAt,
                                endsAt: s.endsAt,
                                room: s.room,
                                invigilatorTeacherId: s.invigilatorTeacherId,
                              })),
                          }),
                        )
                        .then(() => {
                          setReloadKey((k) => k + 1);
                          notify("Paper removed");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error ? err.message : "Failed to remove paper",
                          );
                        });
                      return;
                    }
                    updateTimetable(selectedTt.id, (t) =>
                      removeSlotFromTimetable(t, slotId),
                    );
                  }
            }
            onQuickEdit={
              selectedTtOutdated || !writesEnabled
                ? undefined
                : (patch) => {
                    if (apiMode) {
                      void getExam(selectedTt.examId)
                        .then((exam) =>
                          updateExam(exam.id, {
                            header: patch.header,
                            defaultStartsAt: patch.startTime,
                            defaultEndsAt: patch.endTime,
                            subjectSchedules: patch.slots.map((slot) => {
                              const existing = exam.subjectSchedules.find(
                                (s) => s.id === slot.id,
                              );
                              return {
                                subjectId: existing?.subjectId ?? exam.subjectSchedules[0]?.subjectId ?? "",
                                paperDate: slot.date,
                                startsAt: slot.startTime,
                                endsAt: slot.endTime,
                                room: slot.room || null,
                                invigilatorTeacherId: existing?.invigilatorTeacherId ?? null,
                              };
                            }),
                          }),
                        )
                        .then(() => {
                          setReloadKey((k) => k + 1);
                          notify("Timetable updated");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error ? err.message : "Failed to update timetable",
                          );
                        });
                      return;
                    }
                    setExams((prev) =>
                      prev.map((e) =>
                        e.id === selectedTt.examId
                          ? {
                              ...e,
                              header: patch.header,
                              startTime: patch.startTime,
                              endTime: patch.endTime,
                            }
                          : e,
                      ),
                    );
                    updateTimetable(selectedTt.id, (t) => ({
                      ...t,
                      header: patch.header,
                      startTime: patch.startTime,
                      endTime: patch.endTime,
                      slots: patch.slots,
                    }));
                  }
            }
          />
        </div>

        {!selectedTtOutdated && writesEnabled ? (
          <AddPaperModal
            open={addPaperOpen}
            onClose={() => setAddPaperOpen(false)}
            college={college}
            apiMode={apiMode}
            gradeOptions={gradeOptions}
            subjectOptions={
              apiMode
                ? apiSubjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))
                : subjectOptions.map((s) => ({ value: s, label: s }))
            }
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
        ) : null}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Exams"
      subtitle={
        apiMode
          ? `API mode · ${countLabel(displayExams.length)} exams`
          : "Exam pipeline, exam timetables, and grading · marks in Marks module"
      }
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => setScheduleOpen(true)}>
            <Plus className="size-3.5" /> Create exam
          </Button>
        ) : undefined
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Upcoming" value={countLabel(upcoming)} delta="Next 30 days" />
        <Kpi label="Exam timetables" value={countLabel(kpiTimetables.length)} delta={`${countLabel(ttPublished)} published`} />
        <Kpi label="Pending grading" value={countLabel(grading)} tone="down" />
        <Kpi label="Published results" value={countLabel(published)} delta="This term" />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Exam timetables"
          hint={
            apiMode
              ? "Schedules from API · publish / add papers when writes are enabled"
              : "Created with each exam · publish to share with students & parents"
          }
        />
        {!listView.rowsValid ? (
          <div className="px-5 pb-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading exams…"}
          </div>
        ) : displayTimetables.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<CalendarDays className="size-6 text-primary" />}
              title="No exam timetables yet"
              hint={listHint ?? "Create an exam to generate its timetable automatically."}
              action={
                writesEnabled ? (
                  <Button variant="primary" onClick={() => setScheduleOpen(true)}>
                    <Plus className="size-3.5" /> Create exam
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTimetables.map((tt) => {
              const outdated = isTimetableOutdated(tt, displayExams);
              return (
                <div key={tt.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => openTimetable(tt.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      outdated
                        ? "border-border/60 bg-muted/30 text-muted-foreground opacity-60 hover:opacity-70"
                        : writesEnabled
                          ? "border-border bg-surface hover:bg-surface-hover hover:border-border-strong"
                          : "border-border bg-surface"
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
                  {writesEnabled && outdated && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTimetable(tt.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
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
        {!listView.rowsValid ? (
          <div className="px-5 pb-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading exams…"}
          </div>
        ) : displayExams.length === 0 ? (
          <div className="px-5 pb-5 py-8 text-center text-sm text-muted-foreground">
            {listHint ?? "No exams in the pipeline yet."}
          </div>
        ) : (
        <div className="px-5 pb-5 divide-y divide-border">
          {displayExams.map((e) => {
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
                    {formatExamClassLabel(e)} · {examDateLabel(e)} · {examTimeLabel(e)} · Marks{" "}
                    {examMarksLabel(e)}
                  </div>
                </div>
                {!outdated && writesEnabled && (
                  <div className="w-48 hidden md:block">
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${e.progress}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right">
                      {e.progress}%
                    </div>
                  </div>
                )}
                {writesEnabled && outdated && (
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
        )}
      </Card>

      {writesEnabled && !apiMode ? (
        <ExamScheduleWizard
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          onComplete={handleWizardComplete}
          college={college}
          subjectOptions={subjectOptions}
        />
      ) : null}
      {writesEnabled && apiMode && instituteCtx.activeInstituteId ? (
        <ExamApiCreateDialog
          open={scheduleOpen}
          instituteId={instituteCtx.activeInstituteId}
          onClose={() => setScheduleOpen(false)}
          onCreated={() => {
            setReloadKey((k) => k + 1);
            notify("Exam created (draft)");
          }}
          onError={(message) => notify(message)}
        />
      ) : null}
    </AppShell>
  );
}

function AddPaperModal({
  open,
  onClose,
  college,
  apiMode,
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
  apiMode: boolean;
  gradeOptions: string[];
  subjectOptions: { value: string; label: string }[];
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
            {subjectOptions.length === 0 ? (
              <option value="">No subjects</option>
            ) : (
              subjectOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))
            )}
          </Select>
        </Field>
        {!apiMode ? (
          <>
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
          </>
        ) : null}
        <Field label="Exam time · from">
          <TextInput type="time" value={paperStart} onChange={(e) => setPaperStart(e.target.value)} />
        </Field>
        <Field label="Exam time · to">
          <TextInput type="time" value={paperEnd} onChange={(e) => setPaperEnd(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
