import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { StatCard } from "@/components/app/StatCard";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { useParentPortal } from "@/context/ParentPortalContext";
import type { ExamHistoryEntry } from "@/lib/student/mock-data";
import { examHistory as demoExamHistory, academicTermSummaries as demoAcademicTerms } from "@/lib/student/mock-data";
import { buildLearnerMonthAttendanceSummary } from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@lumenx/ui";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  History,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Trophy,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { EmptyState, PageSkeleton } from "@/student-portal/shared/ui";

export function StudentAcademicHistoryPage({ readOnlyParent = false }: { readOnlyParent?: boolean }) {
  const portal = useStudentPortal();
  const parentPortal = useParentPortal();
  const parentSnap = readOnlyParent && parentPortal.isParent ? parentPortal.snapshot : null;
  const [activeTerm, setActiveTerm] = useState("");

  const snap = readOnlyParent ? parentSnap : portal.isStudent ? portal.snapshot : null;
  const studentSnap = !readOnlyParent && portal.isStudent ? portal.snapshot : null;
  const reportCards = snap?.reportCards ?? [];
  const trend = snap?.trend ?? [];
  const performance = snap?.performance ?? [];
  const examHistory = readOnlyParent ? demoExamHistory : (studentSnap?.examHistory ?? []);
  const academicTermSummaries = readOnlyParent
    ? demoAcademicTerms
    : (studentSnap?.academicTerms ?? []);
  const studentProfile = readOnlyParent && parentSnap
    ? {
        name: parentSnap.child.name,
        class: parentSnap.child.className,
        section: parentSnap.child.section,
        rollNo: parentSnap.child.rollNo,
        id: parentSnap.child.id,
      }
    : studentSnap?.profile;

  const attendancePct = useMemo(() => {
    if (!studentProfile) return 0;
    if (studentSnap?.attendanceSummary) return studentSnap.attendanceSummary.attendancePct;
    const classLabel =
      "class" in studentProfile ? studentProfile.class : (studentProfile as { className?: string }).className;
    const section = studentProfile.section;
    const rollNo = "rollNo" in studentProfile ? studentProfile.rollNo : "";
    const id = "id" in studentProfile ? String(studentProfile.id) : "";
    if (!classLabel || !section) return 0;
    return buildLearnerMonthAttendanceSummary({
      studentId: toAttendanceStudentId({
        id,
        classLabel,
        section,
        rollNo: rollNo || undefined,
      }),
      sectionKey: attendanceSectionKey(classLabel, section),
    }).attendancePct;
  }, [studentProfile, studentSnap?.attendanceSummary]);

  const published = useMemo(
    () => reportCards.filter((r) => r.status === "published"),
    [reportCards],
  );
  const latestPublished = published[published.length - 1];
  const visibleTerms = useMemo(
    () =>
      academicTermSummaries.filter((t) =>
        reportCards.some((r) => r.id === t.reportCardId && r.status === "published"),
      ),
    [academicTermSummaries, reportCards],
  );
  const resolvedTerm = activeTerm || visibleTerms[0]?.id || "";
  const termSummary = useMemo(
    () => visibleTerms.find((t) => t.id === resolvedTerm) ?? visibleTerms[0],
    [visibleTerms, resolvedTerm],
  );
  const activeReport = reportCards.find(
    (r) => r.id === termSummary?.reportCardId && r.status === "published",
  );

  const termExams = useMemo(
    () =>
      examHistory.filter(
        (e) =>
          e.term === termSummary?.label || e.term.includes(termSummary?.label.split(" ")[0] ?? ""),
      ),
    [termSummary, examHistory],
  );
  const completedExams = useMemo(
    () => examHistory.filter((e) => e.status === "completed"),
    [examHistory],
  );
  const upcomingExams = useMemo(
    () => examHistory.filter((e) => e.status === "upcoming"),
    [examHistory],
  );
  const subjectChart =
    activeReport?.marks.map((m) => ({ subject: m.subject.slice(0, 8), score: m.total })) ?? [];
  const bestSubject = useMemo(
    () => [...performance].sort((a, b) => b.score - a.score)[0],
    [performance],
  );

  if (!readOnlyParent && !portal.isStudent) return null;
  if (readOnlyParent && parentPortal.isLoading && !parentSnap) return <PageSkeleton rows={6} />;
  if (readOnlyParent && !parentSnap) {
    return (
      <EmptyState
        icon={History}
        title="Academic history unavailable"
        description="Select a linked child to view their academic record."
      />
    );
  }
  if (!readOnlyParent && (portal.isLoading || !snap || !studentProfile)) {
    return <PageSkeleton rows={6} />;
  }
  if (!studentProfile) return <PageSkeleton rows={6} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Academic History"
        subtitle={
          readOnlyParent
            ? `Read-only record for ${studentProfile.name} · ${studentProfile.class} ${studentProfile.section}`
            : `${studentProfile.name} · ${studentProfile.class} ${studentProfile.section} · Full academic record`
        }
      />

      <div className="grid min-w-0 auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Overall avg"
          value={latestPublished ? `${latestPublished.percentage}%` : "—"}
          tone="primary"
          hint={latestPublished ? `Grade ${latestPublished.grade}` : undefined}
        />
        <StatCard
          icon={Trophy}
          label="Class rank"
          value={latestPublished ? `#${latestPublished.rank}` : "—"}
          hint="Latest published term"
        />
        <StatCard
          icon={TrendingUp}
          label="Best subject"
          value={bestSubject ? `${bestSubject.score}%` : "—"}
          hint={bestSubject?.subject}
          tone="success"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Attendance"
          value={attendancePct != null ? `${attendancePct}%` : "—"}
          tone="success"
        />
      </div>

      <Tabs value={resolvedTerm} onValueChange={setActiveTerm}>
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl">
          {visibleTerms.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="rounded-lg">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTerms.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Average" value={`${t.avgScore}%`} />
              <MiniStat label="Rank" value={`#${t.rank} / ${t.classSize}`} />
              <MiniStat label="Attendance" value={`${t.attendance}%`} />
              <MiniStat label="Year" value={t.year} />
            </div>

            {activeReport && t.id === termSummary?.id && (
              <SectionCard
                title="Report card summary"
                action={
                  <Link
                    to="/marks"
                    className="text-xs text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    Full report <ArrowRight className="size-3" />
                  </Link>
                }
              >
                <div className="space-y-2">
                  {activeReport.marks.map((m) => (
                    <div
                      key={m.subject}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{m.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">{m.total}/100</span>
                        <Badge variant="outline">{m.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Growth trend (all terms)">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="hist-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="term" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis hide domain={[60, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="oklch(0.55 0.22 260)"
                  strokeWidth={2}
                  fill="url(#hist-g)"
                  isAnimationActive={!prefersReducedMotion()}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Subject scores (selected term)">
          <div className="h-48 w-full">
            {subjectChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="oklch(0.92 0.01 250)"
                  />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                  <Bar
                    dataKey="score"
                    fill="oklch(0.55 0.22 260)"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReducedMotion()}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No marks for this term"
                description="Select a term with published marks to view subject performance."
                className="h-full border-0 bg-transparent py-8"
              />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Exam-wise results">
        <div className="space-y-2">
          {termExams.length ? (
            termExams.map((e) => <ExamRow key={e.id} e={e} />)
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="No exams recorded for this term"
              description="Exam results will appear here once they are published for the selected term."
              className="border-0 bg-transparent py-6"
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="All completed exams">
        <div className="space-y-2">
          {completedExams.map((e) => (
            <ExamRow key={e.id} e={e} />
          ))}
        </div>
      </SectionCard>

      {upcomingExams.length > 0 && (
        <SectionCard title="Upcoming exams">
          <div className="space-y-2">
            {upcomingExams.map((e) => (
              <ExamRow key={e.id} e={e} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Published report cards">
        <div className="space-y-3">
          {published.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
            >
              <div>
                <div className="font-medium">{r.term}</div>
                <div className="text-xs text-muted-foreground">
                  Published {r.publishedOn} · Rank #{r.rank}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="border-0 bg-muted text-foreground">{r.percentage}%</Badge>
                <Badge variant="outline">Grade {r.grade}</Badge>
                <Link
                  to="/marks"
                  className="text-xs text-foreground hover:underline inline-flex items-center gap-1"
                >
                  View <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
          {!published.length && (
            <EmptyState
              icon={FileText}
              title="No published report cards yet"
              description="Report cards will show here once your school publishes them for each term."
              className="border-0 bg-transparent py-6"
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ExamRow({ e }: { e: ExamHistoryEntry }) {
  const pct =
    e.status === "completed" && e.maxMarks > 0 ? Math.round((e.obtained / e.maxMarks) * 100) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
      <div className="min-w-0">
        <div className="font-medium">
          {e.title} — {e.subject}
        </div>
        <div className="text-xs text-muted-foreground">
          {e.date}
          {e.duration ? ` · ${e.duration}` : ""}
          {e.room ? ` · ${e.room}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {e.status === "completed" ? (
          <>
            <span className="tabular-nums text-muted-foreground">
              {e.obtained}/{e.maxMarks}
              {pct !== null && ` (${pct}%)`}
            </span>
            <Badge variant="outline">{e.grade}</Badge>
          </>
        ) : (
          <Badge variant="outline" className="border-warning/40 text-warning-foreground">
            Scheduled
          </Badge>
        )}
      </div>
    </div>
  );
}
