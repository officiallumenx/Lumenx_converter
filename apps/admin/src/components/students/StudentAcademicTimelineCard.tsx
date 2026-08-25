import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { useEffect, useState } from "react";
import {
  GRADUATION_HISTORY_CHANGED_EVENT,
  PROMOTION_HISTORY_CHANGED_EVENT,
} from "@/lib/academic-progression";
import {
  academicTimelineStatusTone,
  getStudentAcademicTimeline,
  groupTimelineEntriesByAcademicYear,
  subscribeStudentAcademicTimelines,
  TIMELINE_EMPTY_MESSAGE,
  timelineEntryDetailLine,
  timelineEntryEventLabel,
  TIMELINE_META_CHANGED_EVENT,
  type AcademicTimelineEntry,
} from "@/lib/student-academic-timeline";
import { STUDENTS_CHANGED_EVENT } from "@/lib/student-directory-store";

function DateRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium tabular-nums">{value}</div>
    </div>
  );
}

function TimelineNode({
  entry,
  isLast,
}: {
  entry: AcademicTimelineEntry;
  isLast: boolean;
}) {
  const eventLabel = timelineEntryEventLabel(entry);
  const detailLine = timelineEntryDetailLine(entry);

  return (
    <div className="relative flex gap-4">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span
          className={`mt-1.5 size-2.5 rounded-full ring-4 ring-background ${
            entry.status === "Active"
              ? "bg-success"
              : entry.status === "Upcoming"
                ? "bg-chart-2"
                : "bg-muted-foreground/50"
          }`}
          aria-hidden
        />
        {!isLast ? (
          <span
            className="mt-1 mb-1 w-px flex-1 min-h-8 bg-border"
            aria-hidden
          />
        ) : null}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          {entry.eventDate ? (
            <p className="text-sm font-semibold text-foreground tabular-nums">{entry.eventDate}</p>
          ) : null}
          <Pill tone={academicTimelineStatusTone(entry.status)}>{entry.status}</Pill>
        </div>
        <p className="mt-1 text-xs font-medium text-foreground">{eventLabel}</p>
        {detailLine ? (
          <p className="mt-1 text-xs text-muted-foreground">{detailLine}</p>
        ) : null}
        {!isLast ? (
          <p className="mt-2 text-[11px] text-muted-foreground/80" aria-hidden>
            ↓
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function StudentAcademicTimelineCard({ studentId }: { studentId: string }) {
  const [timeline, setTimeline] = useState(() => getStudentAcademicTimeline(studentId));

  useEffect(() => {
    const refresh = () => setTimeline(getStudentAcademicTimeline(studentId));
    refresh();
    const unsubTimeline = subscribeStudentAcademicTimelines(refresh);
    if (typeof window === "undefined") return unsubTimeline;
    window.addEventListener(STUDENTS_CHANGED_EVENT, refresh);
    window.addEventListener(PROMOTION_HISTORY_CHANGED_EVENT, refresh);
    window.addEventListener(GRADUATION_HISTORY_CHANGED_EVENT, refresh);
    window.addEventListener(TIMELINE_META_CHANGED_EVENT, refresh);
    return () => {
      unsubTimeline();
      window.removeEventListener(STUDENTS_CHANGED_EVENT, refresh);
      window.removeEventListener(PROMOTION_HISTORY_CHANGED_EVENT, refresh);
      window.removeEventListener(GRADUATION_HISTORY_CHANGED_EVENT, refresh);
      window.removeEventListener(TIMELINE_META_CHANGED_EVENT, refresh);
    };
  }, [studentId]);

  const yearGroups = groupTimelineEntriesByAcademicYear(timeline);
  const flatEntries = yearGroups.flatMap((group) => group.entries);

  return (
    <Card>
      <CardHeader
        title="Academic Timeline"
        hint="Academic year milestones from the student record"
      />
      <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <DateRow label="Admission Date" value={timeline.admissionDate} />
          <DateRow label="Promotion Date" value={timeline.promotionDate} />
          <DateRow label="Graduation Date" value={timeline.graduationDate} />
          <DateRow label="Transfer Date" value={timeline.transferDate} />
          <DateRow label="Dropout Date" value={timeline.dropoutDate} />
        </div>

        <div className="rounded-xl border border-border bg-muted/10 px-4 py-4 sm:px-5">
          {timeline.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TIMELINE_EMPTY_MESSAGE}</p>
          ) : (
            yearGroups.map((group) => (
              <div key={group.yearKey} className="not-first:mt-6">
                {group.yearLabel !== "—" ? (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.yearLabel}
                  </p>
                ) : null}
                {group.entries.map((entry) => {
                  const globalIndex = flatEntries.findIndex((item) => item.id === entry.id);
                  return (
                    <TimelineNode
                      key={entry.id}
                      entry={entry}
                      isLast={globalIndex === flatEntries.length - 1}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
