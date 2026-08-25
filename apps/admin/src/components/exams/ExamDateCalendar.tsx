import { useMemo, useRef, useState } from "react";
import {
  buildExamCalendarDays,
  calendarMonthsInRange,
  monthGridCells,
  type ExamDayInfo,
} from "@/lib/exam-calendar-utils";
import { formatExamDateWithDay, moveListItem } from "@/lib/exam-timetable-data";
import { GripVertical } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayStyle(info: ExamDayInfo | undefined, inRange: boolean): string {
  if (!inRange || !info) return "bg-transparent text-transparent border-transparent";
  if (info.kind === "paper") {
    return "bg-primary/15 border-primary/40 text-foreground font-semibold";
  }
  if (info.kind === "blocked") {
    return "bg-muted/80 border-border text-muted-foreground line-through decoration-muted-foreground/50";
  }
  return "bg-surface border-border/60 text-muted-foreground";
}

export function ExamDateCalendar({
  startDate,
  endDate,
  subjects,
  onQuickEdit,
  onReorderSubjects,
}: {
  startDate: string;
  endDate: string;
  subjects: string[];
  onQuickEdit?: () => void;
  /** When set, paper list is drag-reorderable and updates subject order. */
  onReorderSubjects?: (next: string[] | ((prev: string[]) => string[])) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const dayMap = useMemo(() => {
    const days = buildExamCalendarDays(startDate, endDate, subjects);
    return new Map(days.map((d) => [d.iso, d]));
  }, [startDate, endDate, subjects]);

  const months = useMemo(
    () => calendarMonthsInRange(startDate, endDate),
    [startDate, endDate],
  );

  const papers = useMemo(
    () => buildExamCalendarDays(startDate, endDate, subjects).filter((d) => d.kind === "paper"),
    [startDate, endDate, subjects],
  );

  if (!startDate || !endDate) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Set start and end dates in step 1 to preview the exam calendar.
      </div>
    );
  }

  const canReorder = Boolean(onReorderSubjects) && subjects.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[10px]">
        <Legend swatch="bg-primary/15 border-primary/40" label="Exam paper day" />
        <Legend swatch="bg-muted/80 border-border" label="Sunday / 2nd Sat / holiday" />
        <Legend swatch="bg-surface border-border/60" label="Working day (no paper)" />
      </div>

      <div className="grid max-h-[340px] grid-cols-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
        {months.map(({ year, month }) => (
          <MonthBlock
            key={`${year}-${month}`}
            year={year}
            month={month}
            startDate={startDate}
            endDate={endDate}
            dayMap={dayMap}
          />
        ))}
      </div>

      {subjects.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Paper schedule preview
              {canReorder ? " · drag to reorder" : ""}
            </div>
            {onQuickEdit ? (
              <button
                type="button"
                onClick={onQuickEdit}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-hover"
              >
                Edit dates / subjects
              </button>
            ) : null}
          </div>
          <ul className="space-y-1 text-xs">
            {papers.map((d, index) => {
              const subject = d.subject ?? subjects[index] ?? "Paper";
              return (
                <li
                  key={`${d.iso}-${index}`}
                  draggable={canReorder}
                  onDragStart={
                    canReorder
                      ? (e) => {
                          dragIndexRef.current = index;
                          setDragIndex(index);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(index));
                        }
                      : undefined
                  }
                  onDragEnter={canReorder ? (e) => e.preventDefault() : undefined}
                  onDragOver={
                    canReorder
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          const from = dragIndexRef.current;
                          if (from === null || from === index || !onReorderSubjects) return;
                          onReorderSubjects((prev) => moveListItem(prev, from, index));
                          dragIndexRef.current = index;
                          setDragIndex(index);
                        }
                      : undefined
                  }
                  onDrop={
                    canReorder
                      ? (e) => {
                          e.preventDefault();
                          dragIndexRef.current = null;
                          setDragIndex(null);
                        }
                      : undefined
                  }
                  onDragEnd={
                    canReorder
                      ? () => {
                          dragIndexRef.current = null;
                          setDragIndex(null);
                        }
                      : undefined
                  }
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 select-none ${
                    canReorder ? "cursor-grab active:cursor-grabbing border border-transparent" : ""
                  } ${
                    canReorder && dragIndex === index
                      ? "border-primary bg-primary/10 opacity-60"
                      : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    {canReorder ? (
                      <GripVertical className="size-3.5 shrink-0 pointer-events-none" />
                    ) : null}
                    <span>
                      Paper {d.paperNumber} · {formatExamDateWithDay(d.iso)}
                    </span>
                  </span>
                  <span className="font-medium text-foreground">{subject}</span>
                </li>
              );
            })}
          </ul>
          {papers.length < subjects.length && (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
              Not enough working days in the selected range — extend the end date or remove subjects.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`size-3 rounded border ${swatch}`} />
      {label}
    </span>
  );
}

function MonthBlock({
  year,
  month,
  startDate,
  endDate,
  dayMap,
}: {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  dayMap: Map<string, ExamDayInfo>;
}) {
  const label = new Date(year, month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const cells = monthGridCells(year, month);

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs font-semibold mb-2">{label}</div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[9px] text-center text-muted-foreground font-medium py-0.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e-${i}`} className="aspect-square" />;
          const inRange = iso >= startDate && iso <= endDate;
          const info = dayMap.get(iso);
          const title =
            info?.kind === "paper"
              ? `Paper ${info.paperNumber}: ${info.subject}`
              : info?.reasons.join(" · ") || undefined;

          return (
            <div
              key={iso}
              title={inRange ? title : undefined}
              className={`aspect-square rounded border text-[10px] flex flex-col items-center justify-center ${dayStyle(info, inRange)}`}
            >
              {inRange && (
                <>
                  <span>{new Date(iso + "T12:00:00").getDate()}</span>
                  {info?.kind === "blocked" && info.reasons[0] && (
                    <span className="text-[7px] leading-none mt-0.5 truncate max-w-full px-0.5">
                      {info.reasons[0] === "Second Saturday" ? "2nd Sat" : info.reasons[0]?.slice(0, 6)}
                    </span>
                  )}
                  {info?.kind === "paper" && (
                    <span className="text-[7px] leading-none mt-0.5 text-primary truncate max-w-full px-0.5">
                      P{info.paperNumber}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
