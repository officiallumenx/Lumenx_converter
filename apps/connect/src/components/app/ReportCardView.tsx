import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/app/SectionCard";
import { performance, reportCards } from "@/lib/mock-data";
import { countPassFail, isPassing, PASS_MARK_THRESHOLD, passFailLabel } from "@/lib/marks-utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lumenx/ui";
import { ArrowRight, FileText, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import type { ReportCard } from "@lumenx/types";
import {
  SubjectChartAxisTick,
  getSubjectChartAxisHeightForSubjects,
  subjectChartLabel,
} from "@/components/app/marks-chart-axis";

const MARKS_INTERNAL_FILL = "oklch(0.78 0.08 250)";
const MARKS_EXAM_PASS_FILL = "oklch(0.58 0.2 145)";
const MARKS_EXAM_FAIL_FILL = "oklch(0.58 0.22 25)";
const MARKS_PREV_TERM_FILL = "oklch(0.86 0.04 250)";
const MARKS_CURRENT_TERM_FILL = "oklch(0.55 0.22 260)";

const MARKS_CHART_MARGIN = { top: 8, right: 16, left: 4, bottom: 4 };

function TermComparisonLegend({
  previousLabel,
  currentLabel,
}: {
  previousLabel: string;
  currentLabel: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-3 shrink-0 rounded-sm"
          style={{ background: MARKS_PREV_TERM_FILL }}
          aria-hidden
        />
        {previousLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-3 shrink-0 rounded-sm"
          style={{ background: MARKS_CURRENT_TERM_FILL }}
          aria-hidden
        />
        {currentLabel}
      </span>
    </div>
  );
}

function MarksStackLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-3 shrink-0 rounded-sm"
          style={{ background: MARKS_INTERNAL_FILL }}
          aria-hidden
        />
        Internal (/20 scaled)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-3 shrink-0 rounded-sm"
          style={{ background: MARKS_EXAM_PASS_FILL }}
          aria-hidden
        />
        Exam (/80 scaled)
      </span>
    </div>
  );
}

type TermPerfRow = { subject: string; score: number; prev: number };

export function ReportCardView(props?: {
  reportCards?: ReportCard[];
  termPerformance?: TermPerfRow[];
  showTeacherRemarks?: boolean;
  detailsLinkTo?: string;
  selectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  hideDrafts?: boolean;
}) {
  const cards = props?.reportCards ?? reportCards;
  const performanceBars = props?.termPerformance ?? performance;
  const showTeacherRemarks = props?.showTeacherRemarks ?? true;
  const detailsLinkTo = props?.detailsLinkTo ?? "/exams";
  const hideDrafts = props?.hideDrafts ?? false;

  const visibleCards = useMemo(
    () => (hideDrafts ? cards.filter((r) => r.status === "published") : cards),
    [cards, hideDrafts],
  );

  const publishedCards = useMemo(() => cards.filter((r) => r.status === "published"), [cards]);

  const defaultId = visibleCards[0]?.id ?? cards[0]?.id ?? "";
  const [internalActive, setInternalActive] = useState(defaultId);
  const active = props?.selectedId ?? internalActive;

  const setActive = (id: string) => {
    props?.onSelectedIdChange?.(id);
    if (props?.selectedId === undefined) setInternalActive(id);
  };

  useEffect(() => {
    const next = visibleCards[0]?.id ?? cards[0]?.id ?? "";
    if (!visibleCards.some((r) => r.id === active)) setActive(next);
  }, [visibleCards, cards, active]);

  useEffect(() => {
    const next = visibleCards[0]?.id ?? cards[0]?.id ?? "";
    if (next && !visibleCards.some((c) => c.id === active)) {
      setActive(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when card list changes
  }, [visibleCards, cards]);

  if (!visibleCards.length && !cards.length) return null;

  const comparisonForExam = (exam: ReportCard) => {
    const pubIdx = publishedCards.findIndex((c) => c.id === exam.id);
    const prev = pubIdx > 0 ? publishedCards[pubIdx - 1] : null;
    if (prev) {
      return exam.marks.map((m) => {
        const prevMark = prev.marks.find((pm) => pm.subject === m.subject);
        return {
          subject: m.subject,
          score: m.total,
          prev: prevMark?.total ?? m.total,
        };
      });
    }
    return performanceBars;
  };

  const prevExamFor = (exam: ReportCard) => {
    const pubIdx = publishedCards.findIndex((c) => c.id === exam.id);
    return pubIdx > 0 ? publishedCards[pubIdx - 1] : null;
  };

  const selectedCard = visibleCards.find((r) => r.id === active) ?? visibleCards[0] ?? cards[0];

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1 sm:max-w-xs">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Select exam</div>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="h-10 w-full rounded-xl border border-input bg-background text-foreground shadow-soft focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100] rounded-xl border-border bg-popover text-popover-foreground">
              {visibleCards.map((r) => (
                <SelectItem
                  key={r.id}
                  value={r.id}
                  className="rounded-lg focus:bg-primary/10 focus:text-foreground"
                >
                  {r.term}
                  {r.status === "draft" ? " (Draft)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {selectedCard?.status === "draft" && (
          <Badge variant="outline" className="w-fit shrink-0 rounded-md">
            Draft — not yet published
          </Badge>
        )}
      </div>

      <Tabs value={active} onValueChange={setActive} className="w-full min-w-0">
        <TabsList className="hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 sm:flex">
          {visibleCards.map((r) => (
            <TabsTrigger
              key={r.id}
              value={r.id}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {r.term}
              {r.status === "draft" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">(Draft)</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleCards.map((r) => {
          const examChartData = r.marks.map((m) => ({
            subject: m.subject,
            total: m.total,
            internal: m.internal,
            exam: m.exam,
            passed: isPassing(m.total),
          }));
          const examPassFail = countPassFail(r.marks);
          const examPrev = prevExamFor(r);
          const examComparison = comparisonForExam(r);
          const examOverallPass = isPassing(r.percentage);

          return (
            <TabsContent key={r.id} value={r.id} className="mt-4 space-y-4">
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Percentage" value={`${r.percentage}%`} tone="primary" />
                <Stat label="Grade" value={r.grade} tone="success" />
                <Stat label="Class rank" value={`#${r.rank}`} />
                <Stat
                  label="Result"
                  value={passFailLabel(r.percentage)}
                  tone={isPassing(r.percentage) ? "success" : "warning"}
                />
              </div>

              <SectionCard
                title="Subject-wise marks"
                action={
                  <Badge variant="outline" className="shrink-0 gap-1 rounded-md">
                    <FileText className="size-3" /> {r.publishedOn}
                  </Badge>
                }
              >
                <div className="-mx-4 min-w-0 overflow-x-auto md:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Internal /20</TableHead>
                        <TableHead className="text-right">Exam /80</TableHead>
                        <TableHead className="text-right">Total /100</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Result</TableHead>
                        {showTeacherRemarks && (
                          <TableHead className="hidden md:table-cell">Teacher remark</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.marks.map((m) => (
                        <TableRow key={m.subject}>
                          <TableCell className="font-medium">{m.subject}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.internal}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.exam}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {m.total}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{m.grade}</Badge>
                          </TableCell>
                          <TableCell>
                            <PassFailBadge total={m.total} />
                          </TableCell>
                          {showTeacherRemarks && (
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {m.remark ?? "—"}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>

              <SectionCard
                title="Performance visualisation"
                action={
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-success" />
                      {examPassFail.passed} passed
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-destructive" />
                      {examPassFail.failed} failed
                    </span>
                  </div>
                }
              >
                <div className="mb-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {examChartData.map((row) => {
                    const comp = examComparison.find((c) => c.subject === row.subject);
                    const change = comp ? comp.score - comp.prev : 0;
                    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
                    const changeTone =
                      change > 0
                        ? "text-success"
                        : change < 0
                          ? "text-destructive"
                          : "text-muted-foreground";
                    return (
                      <div
                        key={row.subject}
                        className={cn(
                          "rounded-xl border p-2.5",
                          row.passed
                            ? "border-success/25 bg-success/5"
                            : "border-destructive/25 bg-destructive/5",
                        )}
                      >
                        <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {subjectChartLabel(row.subject)}
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="font-display text-lg font-semibold tabular-nums">
                            {row.total}%
                          </span>
                          <PassFailBadge total={row.total} compact />
                        </div>
                        {examPrev && (
                          <div
                            className={cn("mt-1 flex items-center gap-0.5 text-[10px]", changeTone)}
                          >
                            <Icon className="size-3" />
                            {change > 0 ? `+${change}` : change} vs prev
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-muted/10 p-2 sm:p-3">
                  <MarksStackLegend />
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={examChartData}
                      margin={MARKS_CHART_MARGIN}
                      barCategoryGap="14%"
                      barGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="subject"
                        tickLine={false}
                        axisLine={false}
                        tick={SubjectChartAxisTick}
                        interval={0}
                        height={getSubjectChartAxisHeightForSubjects(
                          examChartData.map((d) => d.subject),
                        )}
                      />
                      <YAxis
                        domain={[0, 100]}
                        width={28}
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="var(--muted-foreground)"
                        tick={{ fill: "var(--muted-foreground)" }}
                        tickCount={6}
                      />
                      <Tooltip
                        content={({ active: tipActive, payload }) => {
                          if (!tipActive || !payload?.length) return null;
                          const row = payload[0].payload as (typeof examChartData)[number];
                          return (
                            <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-md">
                              <div className="font-medium">{row.subject}</div>
                              <div className="mt-1 space-y-0.5 text-muted-foreground">
                                <div>Total: {row.total}/100</div>
                                <div>
                                  Internal: {row.internal}/20 · Exam: {row.exam}/80
                                </div>
                                <div className={row.passed ? "text-success" : "text-destructive"}>
                                  {passFailLabel(row.total)}
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="internal"
                        name="internal"
                        stackId="marks"
                        fill={MARKS_INTERNAL_FILL}
                        radius={[0, 0, 0, 0]}
                        isAnimationActive={!prefersReducedMotion()}
                      />
                      <Bar
                        dataKey="exam"
                        name="exam"
                        stackId="marks"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={!prefersReducedMotion()}
                      >
                        {examChartData.map((entry, index) => (
                          <Cell
                            key={`exam-${index}`}
                            fill={entry.passed ? MARKS_EXAM_PASS_FILL : MARKS_EXAM_FAIL_FILL}
                          />
                        ))}
                      </Bar>
                      <ReferenceLine
                        y={PASS_MARK_THRESHOLD}
                        stroke="oklch(0.65 0.15 85)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        ifOverflow="extendDomain"
                        label={{
                          value: `Pass (${PASS_MARK_THRESHOLD}%)`,
                          position: "insideTopRight",
                          fontSize: 10,
                          fill: "oklch(0.45 0.14 85)",
                          fontWeight: 600,
                        }}
                      />
                    </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-3 rounded-xl border px-3 py-2 text-sm",
                    examOverallPass
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-destructive/30 bg-destructive/5 text-destructive",
                  )}
                >
                  Overall: <strong>{passFailLabel(r.percentage)}</strong> at {r.percentage}%
                  aggregate
                  {examPrev && (
                    <span className="text-muted-foreground">
                      {" "}
                      · Previous exam ({examPrev.term}): {examPrev.percentage}%
                    </span>
                  )}
                </div>
              </SectionCard>

              <div className="flex justify-end">
                <Link
                  to={detailsLinkTo}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {detailsLinkTo === "/academic-history"
                    ? "See academic history"
                    : "See exam schedule"}{" "}
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {(() => {
        const activeExam =
          visibleCards.find((c) => c.id === active) ??
          cards.find((c) => c.id === active) ??
          visibleCards[0];
        if (!activeExam) return null;
        const activeComparison = comparisonForExam(activeExam);
        const activePrev = prevExamFor(activeExam);
        return (
          <SectionCard title={activePrev ? `Progress vs ${activePrev.term}` : "Term-on-term trend"}>
            <TermComparisonLegend
              previousLabel={activePrev ? activePrev.term : "Previous term"}
              currentLabel={activeExam.term}
            />
            <div className="h-60 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-muted/10 p-2 sm:p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeComparison}
                  margin={MARKS_CHART_MARGIN}
                  barCategoryGap="14%"
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="subject"
                    tickLine={false}
                    axisLine={false}
                    tick={SubjectChartAxisTick}
                    interval={0}
                    height={getSubjectChartAxisHeightForSubjects(
                      activeComparison.map((d) => d.subject),
                    )}
                  />
                  <YAxis
                    domain={[0, 100]}
                    width={28}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    stroke="var(--muted-foreground)"
                    tick={{ fill: "var(--muted-foreground)" }}
                    tickCount={6}
                  />
                  <Tooltip
                    content={({ active: tipActive, payload }) => {
                      if (!tipActive || !payload?.length) return null;
                      const row = payload[0].payload as (typeof activeComparison)[number];
                      const prevLabel = activePrev ? activePrev.term : "Previous";
                      const currentLabel = activeExam.term;
                      return (
                        <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="font-medium">{row.subject}</div>
                          <div className="mt-1 space-y-0.5 text-muted-foreground">
                            <div>
                              {currentLabel}: {row.score}%
                            </div>
                            <div>
                              {prevLabel}: {row.prev}%
                            </div>
                            <div>
                              Change: {row.score - row.prev > 0 ? "+" : ""}
                              {row.score - row.prev}%
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="prev"
                    name={activePrev ? activePrev.term : "Previous"}
                    fill={MARKS_PREV_TERM_FILL}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReducedMotion()}
                  />
                  <Bar
                    dataKey="score"
                    name={activeExam.term}
                    fill={MARKS_CURRENT_TERM_FILL}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReducedMotion()}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pass mark: {PASS_MARK_THRESHOLD}% aggregate
            </p>
          </SectionCard>
        );
      })()}
    </div>
  );
}

function PassFailBadge({ total, compact }: { total: number; compact?: boolean }) {
  const passed = isPassing(total);
  return (
    <Badge
      className={cn(
        compact ? "text-[10px] px-1.5 py-0" : "",
        passed
          ? "border-0 bg-success/15 text-success hover:bg-success/20"
          : "border-0 bg-destructive/15 text-destructive",
      )}
    >
      {passFailLabel(total)}
    </Badge>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneCls = {
    default: "bg-card",
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
  }[tone];
  return (
    <div className={`min-w-0 rounded-2xl border border-border p-4 shadow-soft ${toneCls}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{value}</div>
    </div>
  );
}
