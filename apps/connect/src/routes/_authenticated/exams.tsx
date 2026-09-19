import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SubjectMarksVisualization } from "@/components/app/SubjectMarksVisualization";
import { TeacherExamsPage } from "@/teacher-portal";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { isPassing, passFailLabel } from "@/lib/marks-utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadLearnerExamSchedules as loadApiLearnerExamSchedules } from "@/lib/exams";
import { loadStudentReportCards } from "@/lib/marks";
import {
  examVisibleToClass,
  formatExamClassAudience,
  formatExamTimeRange,
  loadLearnerExamSchedules,
  type LearnerExamSchedule,
} from "@lumenx/module-exams";
import { Badge, cn, Skeleton, useLocalStorageExternalStore } from "@lumenx/ui";
import {
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { ReportCard } from "@lumenx/types";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Connect" }] }),
  component: () => (
    <ExamsPage />
  ),
});

function ExamsPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherExamsPage />;
  return <ParentStudentExamsPage />;
}

const LEARNER_EXAM_SCHEDULES_KEY = "lumenx.learner-exam-schedules";

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type UpcomingPaper = {
  id: string;
  title: string;
  subject: string;
  dateIso: string;
  startTime: string;
  endTime: string;
  room?: string;
  series: string;
};

function ParentStudentExamsPage() {
  const { role, activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const parentPortal = useParentPortal();
  const studentPortal = useStudentPortal();
  const parentSnap = role === "parent" && parentPortal.isParent ? parentPortal.snapshot : null;
  const studentSnap = role === "student" && studentPortal.isStudent ? studentPortal.snapshot : null;
  const isLoading =
    !apiMode &&
    role === "student" &&
    studentPortal.isStudent &&
    studentPortal.isLoading &&
    !studentSnap;

  const [apiSchedules, setApiSchedules] = useState<LearnerExamSchedule[]>([]);
  const [apiSchedulesLoading, setApiSchedulesLoading] = useState(apiMode);
  const [apiReportCards, setApiReportCards] = useState<ReportCard[] | null>(null);
  const [apiReportCardsLoading, setApiReportCardsLoading] = useState(apiMode);

  const studentId =
    parentSnap?.child.id ?? (studentSnap ? studentSnap.profile.id : null);

  const reportCardsData = useMemo(() => {
    if (apiMode) return apiReportCards ?? [];
    return parentSnap?.reportCards ?? studentSnap?.reportCards ?? [];
  }, [apiMode, apiReportCards, parentSnap?.reportCards, studentSnap?.reportCards]);

  const publishedCards = useMemo(
    () => reportCardsData.filter((r) => r.status === "published"),
    [reportCardsData],
  );
  const lastCard = publishedCards[publishedCards.length - 1] ?? null;

  const subjectMarks = useMemo(() => {
    if (!lastCard?.marks?.length) return [];
    return lastCard.marks.map((m) => ({
      subject: m.subject,
      total: m.total,
      internal: m.internal,
      exam: m.exam,
      grade: m.grade,
    }));
  }, [lastCard]);

  const learnerClass = parentSnap
    ? parentSnap.child.className || parentSnap.classTag
    : studentSnap
      ? studentSnap.profile.class
      : "";

  const schedulesTick = useLocalStorageExternalStore(LEARNER_EXAM_SCHEDULES_KEY, {
    alsoOnFocus: true,
  });

  useEffect(() => {
    if (!apiMode) return;
    if (!activeInstituteId) {
      setApiSchedules([]);
      setApiSchedulesLoading(false);
      return;
    }
    let cancelled = false;
    setApiSchedulesLoading(true);
    void loadApiLearnerExamSchedules({
      instituteId: activeInstituteId,
      classGrade: learnerClass || undefined,
    }).then((result) => {
      if (cancelled) return;
      setApiSchedules(result.schedules);
      setApiSchedulesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId, learnerClass]);

  useEffect(() => {
    if (!apiMode) {
      setApiReportCards(null);
      setApiReportCardsLoading(false);
      return;
    }
    if (!activeInstituteId || !studentId) {
      setApiReportCards([]);
      setApiReportCardsLoading(false);
      return;
    }
    let cancelled = false;
    setApiReportCardsLoading(true);
    void loadStudentReportCards({
      instituteId: activeInstituteId,
      studentId,
    }).then((result) => {
      if (cancelled) return;
      if (result.status === "ready" || result.status === "empty") {
        setApiReportCards(result.cards);
      } else {
        setApiReportCards([]);
      }
      setApiReportCardsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId, studentId]);

  const classSchedules = useMemo(() => {
    if (apiMode) {
      return apiSchedules.filter((s) =>
        learnerClass ? examVisibleToClass(s, learnerClass) : true,
      );
    }
    void schedulesTick;
    return loadLearnerExamSchedules().filter((s) =>
      learnerClass ? examVisibleToClass(s, learnerClass) : true,
    );
  }, [apiMode, apiSchedules, learnerClass, schedulesTick]);

  const upcomingPapers = useMemo(() => {
    const today = todayIsoLocal();
    const papers: UpcomingPaper[] = [];
    for (const schedule of classSchedules) {
      for (const slot of schedule.slots) {
        if (slot.date < today) continue;
        papers.push({
          id: `${schedule.examId}-${slot.date}-${slot.subject}`,
          title: `${schedule.examName} · ${slot.subject}`,
          subject: slot.subject,
          dateIso: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          series: schedule.term || schedule.examName,
        });
      }
    }
    return papers.sort((a, b) => a.dateIso.localeCompare(b.dateIso)).slice(0, 6);
  }, [classSchedules]);

  const subtitle = parentSnap
    ? `Schedule and trends for ${parentSnap.child.name} (${parentSnap.classTag})`
    : studentSnap
      ? `${studentSnap.profile.name} · ${studentSnap.profile.class} ${studentSnap.profile.section}`
      : "Schedule, results and trends";

  if (isLoading || (apiMode && (apiSchedulesLoading || apiReportCardsLoading))) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Exams & Marks" subtitle="Loading exam schedule and results…" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader title="Exams & Marks" subtitle={subtitle} />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="size-4 text-primary" />
            Exam dates & timetable
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Exams assigned to your class by admin
          </p>
        </div>
        {classSchedules.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No exams assigned to this class yet.
          </p>
        ) : (
          <div className="space-y-4">
            {classSchedules.map((schedule) => (
              <LearnerExamScheduleCard key={schedule.examId} schedule={schedule} />
            ))}
          </div>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
          <h3 className="mb-3 flex min-w-0 items-center gap-2 font-semibold">
            <ClipboardList className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">Upcoming papers</span>
          </h3>
          {upcomingPapers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No upcoming papers scheduled.
            </p>
          ) : (
            <div className="min-w-0 space-y-2">
              {upcomingPapers.map((paper) => (
                <UpcomingExamCard key={paper.id} paper={paper} />
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Link
              to="/marks"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              View all marks <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        <LastExamSummary card={lastCard ?? undefined} />
      </div>

      <div
        key={parentSnap?.child.id ?? studentSnap?.profile.id ?? "exams-default"}
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
      >
        <SubjectMarksVisualization
          marks={subjectMarks}
          examLabel={lastCard ? `Latest: ${lastCard.term}` : undefined}
        />
      </div>
    </div>
  );
}

function LearnerExamScheduleCard({ schedule }: { schedule: LearnerExamSchedule }) {
  const range =
    schedule.startDate === schedule.endDate
      ? formatLearnerDate(schedule.startDate)
      : `${formatLearnerDate(schedule.startDate)} – ${formatLearnerDate(schedule.endDate)}`;
  const slots = [...schedule.slots].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold leading-snug">{schedule.examName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {schedule.term} · {formatExamClassAudience(schedule)}
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">{range}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Exam time:{" "}
            <span className="font-mono font-medium text-foreground">
              {formatExamTimeRange(schedule.startTime, schedule.endTime)}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="rounded-md text-[10px] capitalize">
          {schedule.timetableStatus === "published"
            ? "Published"
            : schedule.timetableStatus === "draft"
              ? "Awaiting publish"
              : "Dates only"}
        </Badge>
      </div>
      {slots.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {slots.map((slot) => (
            <li
              key={`${slot.date}-${slot.subject}-${slot.dayNumber}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">{slot.subject}</div>
                <div className="text-xs text-muted-foreground">
                  Day {slot.dayNumber} · {formatLearnerDate(slot.date)}
                </div>
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {slot.startTime} – {slot.endTime}
                {slot.room ? ` · ${slot.room}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Exam window set — detailed paper timetable will appear when published by admin.
        </p>
      )}
    </div>
  );
}

function formatLearnerDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}


function UpcomingExamCard({ paper }: { paper: UpcomingPaper }) {
  const label = formatLearnerDate(paper.dateIso);
  const parts = label.split(" ");
  const day = parts[1] ?? "—";
  const month = parts[2] ?? "";

  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.02] sm:gap-4">
      <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-center font-display text-sm font-semibold leading-tight text-primary">
        <CalendarDays className="size-5 mb-0.5" />
        <span className="text-[10px] font-normal tabular-nums leading-none">
          {day} {month}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{paper.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {paper.startTime} – {paper.endTime}
          </span>
          {paper.room ? (
            <>
              <span>·</span>
              <span>{paper.room}</span>
            </>
          ) : null}
          {paper.series ? (
            <>
              <span>·</span>
              <span className="text-primary/80">{paper.series}</span>
            </>
          ) : null}
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
        {paper.subject}
      </Badge>
    </div>
  );
}

function LastExamSummary({ card }: { card: ReportCard | undefined }) {
  if (!card) {
    return (
      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <TrendingUp className="size-4 text-primary" />
          Last exam marks
        </h3>
        <p className="py-6 text-center text-sm text-muted-foreground">
          No published exam marks yet.
        </p>
        <Link
          to="/marks"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open marks <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  const pct = card.percentage;
  const passed = isPassing(pct);
  const trendData = card.marks.slice(0, 4).map((m) => ({
    subject: m.subject.slice(0, 4),
    total: m.total,
    passed: isPassing(m.total),
  }));
  const subjectsPassed = card.marks.filter((m) => isPassing(m.total)).length;

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <TrendingUp className="size-4 text-primary" />
        {card.term}
      </h3>
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-display font-bold tabular-nums">{pct}%</div>
        <Badge
          className={cn(
            "border-0",
            passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          {passFailLabel(pct)}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        {card.rank > 0 ? `Class rank #${card.rank}` : "Published result"}
        {card.grade ? ` · Grade ${card.grade}` : ""}
      </div>

      {trendData.length > 0 && (
        <div className="mt-4 h-24 w-full min-w-0 overflow-hidden rounded-xl bg-muted/10 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="subject" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion()}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.passed ? "oklch(0.58 0.2 145)" : "oklch(0.58 0.22 25)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm">
        <SummaryRow
          label="Subjects passed"
          value={`${subjectsPassed}/${card.marks.length}`}
        />
      </div>
      <Link
        to="/marks"
        className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Full report card <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span
        className={cn("shrink-0 font-medium tabular-nums", tone === "success" && "text-success")}
      >
        {value}
      </span>
    </div>
  );
}
