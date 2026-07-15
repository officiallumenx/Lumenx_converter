import { Button } from "@lumenx/ui-admin";
import { Trash2 } from "lucide-react";
import {
  examTimetableRange,
  formatExamDateWithDay,
  type ExamTimetable,
  type ExamTimetableSlot,
} from "@/lib/exam-timetable-data";

export function ExamTimetableTable({
  timetable,
  college,
  readOnly,
  onRemoveSlot,
}: {
  timetable: ExamTimetable;
  college: boolean;
  readOnly?: boolean;
  onRemoveSlot?: (slotId: string) => void;
}) {
  const slots = [...timetable.slots].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
      <div className="border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-6 py-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          {timetable.term}
        </div>
        <h2 className="text-lg sm:text-xl font-bold mt-1 tracking-tight">
          {timetable.header || timetable.examName}
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {college ? "Batch" : "Class"}:{" "}
            <strong className="text-foreground font-medium">{timetable.grade}</strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            Section: <strong className="text-foreground font-medium">{timetable.section}</strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            Time:{" "}
            <strong className="text-foreground font-medium font-mono">
              {timetable.startTime} – {timetable.endTime}
            </strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            Dates:{" "}
            <strong className="text-foreground font-medium">{examTimetableRange(slots)}</strong>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4 text-left font-semibold border-b border-border w-14">#</th>
              <th className="py-3 px-4 text-left font-semibold border-b border-border">Date & day</th>
              <th className="py-3 px-4 text-left font-semibold border-b border-border">Subject</th>
              <th className="py-3 px-4 text-left font-semibold border-b border-border">Time</th>
              {!readOnly && <th className="py-3 px-3 border-b border-border w-12" />}
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="py-8 text-center text-sm text-muted-foreground">
                  No papers scheduled
                </td>
              </tr>
            ) : (
              slots.map((slot, idx) => (
                <TimetableRow
                  key={slot.id}
                  slot={slot}
                  index={idx}
                  readOnly={readOnly}
                  onRemove={onRemoveSlot ? () => onRemoveSlot(slot.id) : undefined}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-border bg-muted/20 text-[10px] text-muted-foreground text-center">
        {slots.length} paper{slots.length !== 1 ? "s" : ""} · Sundays, second Saturdays & holidays excluded
      </div>
    </div>
  );
}

function TimetableRow({
  slot,
  index,
  readOnly,
  onRemove,
}: {
  slot: ExamTimetableSlot;
  index: number;
  readOnly?: boolean;
  onRemove?: () => void;
}) {
  const zebra = index % 2 === 0 ? "bg-surface" : "bg-muted/15";
  return (
    <tr className={`${zebra} text-sm ${readOnly ? "" : "hover:bg-primary/5"} transition-colors`}>
      <td className="py-3 px-4 border-b border-border/60 font-mono text-muted-foreground text-xs">
        {String(slot.dayNumber).padStart(2, "0")}
      </td>
      <td className="py-3 px-4 border-b border-border/60 whitespace-nowrap">
        <span className="font-medium">{formatExamDateWithDay(slot.date)}</span>
      </td>
      <td className="py-3 px-4 border-b border-border/60 font-semibold">{slot.subject}</td>
      <td className="py-3 px-4 border-b border-border/60 font-mono text-xs whitespace-nowrap">
        {slot.startTime} – {slot.endTime}
      </td>
      {!readOnly && onRemove && (
        <td className="py-3 px-3 border-b border-border/60">
          <Button size="sm" onClick={onRemove} aria-label="Remove paper">
            <Trash2 className="size-3.5" />
          </Button>
        </td>
      )}
    </tr>
  );
}
