import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SubjectMarksVisualization } from "@/components/app/SubjectMarksVisualization";
import { TeacherExamsPage } from "@/teacher-portal";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { exams, fees, performance, reportCards } from "@/lib/mock-data";
import { isPassing, passFailLabel } from "@/lib/marks-utils";
import { parseDueDate } from "@/lib/fees-utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import {
  examVisibleToClass,
  formatExamClassAudience,
  formatExamTimeRange,
  loadLearnerExamSchedules,
  type LearnerExamSchedule,
} from "@lumenx/module-exams";
import { Badge, Button, cn, Skeleton, useLocalStorageExternalStore } from "@lumenx/ui";
import {
  CalendarDays,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Wallet,
  ClipboardList,
  Receipt,
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
import { toast } from "sonner";
import type { FeeItem, ReportCard } from "@lumenx/types";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ExamsPage />
    </AppShell>
  ),
});

const FEE_STATUS: Record<FeeItem["status"], { label: string; cls: string; icon: typeof Clock }> = {
  paid: { label: "Paid", cls: "bg-success/15 text-success border-success/20", icon: Wallet },
  partial: {
    label: "Partial",
    cls: "bg-warning/15 text-warning-foreground border-warning/30",
    icon: Clock,
  },
  overdue: {
    label: "Overdue",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  upcoming: { label: "Due soon", cls: "bg-primary/10 text-primary border-primary/20", icon: Clock },
};

function ExamsPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherExamsPage />;
  return <ParentStudentExamsPage />;
}

const LEARNER_EXAM_SCHEDULES_KEY = "lumenx.learner-exam-schedules";

function ParentStudentExamsPage() {
  const { role } = useApp();
  const parentPortal = useParentPortal();
  const studentPortal = useStudentPortal();
  const parentSnap = role === "parent" && parentPortal.isParent ? parentPortal.snapshot : null;
  const studentSnap = role === "student" && studentPortal.isStudent ? studentPortal.snapshot : null;
  const isLoading =
    role === "student" && studentPortal.isStudent && studentPortal.isLoading && !studentSnap;

  const reportCardsData = parentSnap?.reportCards ?? studentSnap?.reportCards ?? reportCards;
  const perfFallback = parentSnap?.performance ?? studentSnap?.performance ?? performance;

  const publishedCards = useMemo(
    () => reportCardsData.filter((r) => r.status === "published"),
    [reportCardsData],
  );
  const lastCard = publishedCards[publishedCards.length - 1] ?? reportCardsData[0];

  const subjectMarks = useMemo(() => {
    if (lastCard?.marks?.length) {
      return lastCard.marks.map((m) => ({
        subject: m.subject,
        total: m.total,
        internal: m.internal,
        exam: m.exam,
        grade: m.grade,
      }));
    }
    return perfFallback.map((p) => ({
      subject: p.subject,
      total: p.score,
      grade: undefined as string | undefined,
    }));
  }, [lastCard, perfFallback]);

  const examFees = useMemo(() => fees.filter((f) => f.category === "exam"), []);
  const pendingExamFees = useMemo(() => examFees.filter((f) => f.status !== "paid"), [examFees]);
  const pendingTotal = pendingExamFees.reduce((s, f) => s + f.amount, 0);

  const learnerClass = parentSnap
    ? parentSnap.child.className || parentSnap.classTag
    : studentSnap
      ? studentSnap.profile.class
      : "Grade 10";

  const schedulesTick = useLocalStorageExternalStore(LEARNER_EXAM_SCHEDULES_KEY, {
    alsoOnFocus: true,
  });

  const classSchedules = useMemo(() => {
    void schedulesTick;
    const stored = loadLearnerExamSchedules().filter((s) =>
      examVisibleToClass(s, learnerClass),
    );
    if (stored.length > 0) return stored;
    return getFallbackLearnerSchedules().filter((s) => examVisibleToClass(s, learnerClass));
  }, [learnerClass, schedulesTick]);

  const subtitle = parentSnap
    ? `Schedule and trends for ${parentSnap.child.name} (${parentSnap.classTag})`
    : studentSnap
      ? `${studentSnap.profile.name} · ${studentSnap.profile.class} ${studentSnap.profile.section}`
      : "Schedule, results and trends";

  if (isLoading) {
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

      {pendingExamFees.length > 0 && (
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Pending exam payments
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pendingExamFees.length} fee{pendingExamFees.length > 1 ? "s" : ""} · ₹
                {pendingTotal.toLocaleString("en-IN")} outstanding
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link to="/fees">
                View fees <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingExamFees.map((f) => (
              <ExamFeeCard key={f.id} fee={f} />
            ))}
          </div>
        </section>
      )}

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
          <div className="min-w-0 space-y-2">
            {exams.slice(0, 4).map((e) => (
              <UpcomingExamCard key={e.id} exam={e} />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              to="/marks"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              View all marks <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        <LastExamSummary card={lastCard} />
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

function getFallbackLearnerSchedules(): LearnerExamSchedule[] {
  return [
    {
      examId: "EX-MID",
      examName: "Mid-term Examination",
      header: "Mid-Term Examination · Term 2",
      term: "Term 2 · 2025–26",
      classScope: "all",
      grades: [],
      startDate: "2026-03-10",
      endDate: "2026-03-14",
      startTime: "09:00",
      endTime: "12:00",
      timetableStatus: "published",
      slots: [
        {
          date: "2026-03-10",
          dayNumber: 1,
          subject: "Mathematics",
          startTime: "09:00",
          endTime: "12:00",
          room: "Hall A",
        },
        {
          date: "2026-03-11",
          dayNumber: 2,
          subject: "Physics",
          startTime: "09:00",
          endTime: "12:00",
          room: "Hall A",
        },
        {
          date: "2026-03-12",
          dayNumber: 3,
          subject: "Chemistry",
          startTime: "09:00",
          endTime: "12:00",
          room: "Hall B",
        },
        {
          date: "2026-03-13",
          dayNumber: 4,
          subject: "English",
          startTime: "09:00",
          endTime: "11:30",
          room: "Hall A",
        },
      ],
      updatedAt: new Date().toISOString().slice(0, 10),
    },
    {
      examId: "EX-UT3",
      examName: "Unit Test 3",
      header: "Unit Test 3 · Term 2",
      term: "Term 2 · 2025–26",
      classScope: "selected",
      grades: ["Grade 10", "Grade 11", "Grade 12", "Class 10", "10"],
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      startTime: "09:00",
      endTime: "12:00",
      timetableStatus: "draft",
      slots: [
        {
          date: "2026-06-15",
          dayNumber: 1,
          subject: "Mathematics",
          startTime: "09:00",
          endTime: "12:00",
        },
        {
          date: "2026-06-16",
          dayNumber: 2,
          subject: "Physics",
          startTime: "09:00",
          endTime: "12:00",
        },
      ],
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  ];
}

function ExamFeeCard({ fee }: { fee: FeeItem }) {
  const meta = FEE_STATUS[fee.status];
  const Icon = meta.icon;
  const dueLabel = feeDueLabel(fee.due, fee.status);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border p-4 shadow-soft transition-colors",
        fee.status === "overdue"
          ? "border-destructive/30 bg-destructive/[0.03]"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-snug">{fee.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{fee.term}</div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", meta.cls)}>
          <Icon className="mr-1 size-3" />
          {meta.label}
        </Badge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="font-display text-xl font-semibold tabular-nums">
            ₹{fee.amount.toLocaleString("en-IN")}
          </div>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              fee.status === "overdue" ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3 shrink-0" />
            Due {fee.due}
            {dueLabel && <span> · {dueLabel}</span>}
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant={fee.status === "overdue" ? "default" : "outline"}
          className="shrink-0 rounded-lg"
        >
          <Link to="/fees">View fees</Link>
        </Button>
      </div>
    </div>
  );
}

function feeDueLabel(due: string, status: FeeItem["status"]): string | null {
  if (status === "overdue") return "Payment overdue";
  const parsed = parseDueDate(due);
  if (parsed === Infinity) return null;
  const days = Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `${days} days left`;
  return null;
}

type ExamRow = (typeof exams)[number];

function UpcomingExamCard({ exam }: { exam: ExamRow }) {
  const parts = exam.date.split(" ");
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
        <div className="truncate font-medium">{exam.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{exam.duration}</span>
          <span>·</span>
          <span>{exam.room}</span>
          {"series" in exam && exam.series && (
            <>
              <span>·</span>
              <span className="text-primary/80">{exam.series}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
        {exam.subject}
      </Badge>
    </div>
  );
}

function LastExamSummary({ card }: { card: ReportCard | undefined }) {
  const pct = card?.percentage ?? 87;
  const passed = isPassing(pct);
  const trendData =
    card?.marks.slice(0, 4).map((m) => ({
      subject: m.subject.slice(0, 4),
      total: m.total,
      passed: isPassing(m.total),
    })) ?? [];

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <TrendingUp className="size-4 text-primary" />
        {card ? card.term : "Last exam"}
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
        {card ? `Class rank #${card.rank} · Grade ${card.grade}` : "Class rank #7 of 48"}
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
          value={
            card
              ? `${card.marks.filter((m) => isPassing(m.total)).length}/${card.marks.length}`
              : "5/6"
          }
        />
        <SummaryRow label="Class average" value="72%" />
        <SummaryRow label="vs previous exam" value="+5%" tone="success" />
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
