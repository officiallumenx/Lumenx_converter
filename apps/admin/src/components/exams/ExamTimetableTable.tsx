import { Button, TextInput } from "@lumenx/ui-admin";
import { Check, ChevronDown, ChevronUp, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  examTimetableRange,
  formatExamDateWithDay,
  moveListItem,
  reorderExamSlotsBySubjectOrder,
  type ExamTimetable,
  type ExamTimetableSlot,
} from "@/lib/exam-timetable-data";

export type ExamTimetableQuickEditPatch = {
  header: string;
  startTime: string;
  endTime: string;
  slots: ExamTimetableSlot[];
};

type DraftPaper = { id: string; subject: string };

function slotsToDraft(slots: ExamTimetableSlot[]): DraftPaper[] {
  return [...slots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ id: s.id, subject: s.subject }));
}

export function ExamTimetableTable({
  timetable,
  college,
  readOnly,
  onRemoveSlot,
  onQuickEdit,
}: {
  timetable: ExamTimetable;
  college: boolean;
  readOnly?: boolean;
  onRemoveSlot?: (slotId: string) => void;
  onQuickEdit?: (patch: ExamTimetableQuickEditPatch) => void;
}) {
  const slots = [...timetable.slots].sort((a, b) => a.date.localeCompare(b.date));
  const [editing, setEditing] = useState(false);
  const [draftHeader, setDraftHeader] = useState(timetable.header);
  const [draftStart, setDraftStart] = useState(timetable.startTime);
  const [draftEnd, setDraftEnd] = useState(timetable.endTime);
  const [draftPapers, setDraftPapers] = useState<DraftPaper[]>(() => slotsToDraft(timetable.slots));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (editing) return;
    setDraftHeader(timetable.header);
    setDraftStart(timetable.startTime);
    setDraftEnd(timetable.endTime);
    setDraftPapers(slotsToDraft(timetable.slots));
  }, [timetable, editing]);

  const beginEdit = () => {
    setDraftHeader(timetable.header);
    setDraftStart(timetable.startTime);
    setDraftEnd(timetable.endTime);
    setDraftPapers(slotsToDraft(timetable.slots));
    dragIndexRef.current = null;
    setDragIndex(null);
    setEditing(true);
  };

  const draftSubjects = draftPapers.map((p) => p.subject);

  const saveEdit = () => {
    const reordered = reorderExamSlotsBySubjectOrder(timetable.slots, draftSubjects).map((s) => ({
      ...s,
      startTime: draftStart,
      endTime: draftEnd,
    }));
    onQuickEdit?.({
      header: draftHeader.trim() || timetable.header,
      startTime: draftStart,
      endTime: draftEnd,
      slots: reordered,
    });
    setEditing(false);
  };

  const movePaper = (from: number, to: number) => {
    setDraftPapers((prev) => moveListItem(prev, from, to));
  };

  const onDragStart = (index: number) => (e: DragEvent) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 24, 20);
    }
  };

  const onDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    // Live reorder while dragging — more reliable than drop-only on Windows
    setDraftPapers((prev) => moveListItem(prev, from, index));
    dragIndexRef.current = index;
    setDragIndex(index);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragIndexRef.current = null;
    setDragIndex(null);
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
    setDragIndex(null);
  };

  const previewSlots = editing
    ? reorderExamSlotsBySubjectOrder(timetable.slots, draftSubjects)
    : slots;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
      <div className="relative border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-6 py-5 text-center">
        {!readOnly && onQuickEdit && !editing ? (
          <div className="absolute right-4 top-4">
            <Button size="sm" variant="outline" onClick={beginEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
        ) : null}

        {editing ? (
          <div className="mx-auto mt-3 max-w-xl space-y-3 text-left">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Header
              </label>
              <TextInput value={draftHeader} onChange={(e) => setDraftHeader(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Exam time · from
                </label>
                <TextInput
                  type="time"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Exam time · to
                </label>
                <TextInput type="time" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Papers · drag to change day / date
              </label>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Drag the grip (or use ↑ ↓). Dates stay fixed — subjects move onto those days.
              </p>
              <ul className="space-y-1.5 rounded-lg border border-border bg-background p-2">
                {draftPapers.map((paper, index) => {
                  const date = previewSlots[index]?.date;
                  return (
                    <li
                      key={paper.id}
                      draggable
                      onDragStart={onDragStart(index)}
                      onDragEnter={(e) => e.preventDefault()}
                      onDragOver={onDragOver(index)}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                      className={`flex cursor-grab items-center gap-2 rounded-md border px-2.5 py-2 text-sm select-none active:cursor-grabbing ${
                        dragIndex === index
                          ? "border-primary bg-primary/10 opacity-60"
                          : "border-border bg-surface"
                      }`}
                    >
                      <GripVertical className="size-4 shrink-0 text-muted-foreground pointer-events-none" />
                      <span className="w-7 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-left">
                        {paper.subject}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {date ? formatExamDateWithDay(date) : "—"}
                      </span>
                      <span className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePaper(index, index - 1);
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={index >= draftPapers.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePaper(index, index + 1);
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={saveEdit}>
                <Check className="size-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="size-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
              {timetable.header || timetable.examName}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {college ? "Batch" : "Class"}:{" "}
                <strong className="font-medium text-foreground">{timetable.grade}</strong>
              </span>
              <span className="hidden text-border sm:inline">|</span>
              <span>
                Section: <strong className="font-medium text-foreground">{timetable.section}</strong>
              </span>
              <span className="hidden text-border sm:inline">|</span>
              <span>
                Exam time:{" "}
                <strong className="font-mono font-medium text-foreground">
                  {timetable.startTime} – {timetable.endTime}
                </strong>
              </span>
              <span className="hidden text-border sm:inline">|</span>
              <span>
                Dates:{" "}
                <strong className="font-medium text-foreground">{examTimetableRange(slots)}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="w-14 border-b border-border px-4 py-3 text-left font-semibold">#</th>
              <th className="border-b border-border px-4 py-3 text-left font-semibold">Date & day</th>
              <th className="border-b border-border px-4 py-3 text-left font-semibold">Subject</th>
              <th className="border-b border-border px-4 py-3 text-left font-semibold">Exam time</th>
              {!readOnly && <th className="w-12 border-b border-border px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {previewSlots.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 4 : 5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No papers scheduled
                </td>
              </tr>
            ) : (
              previewSlots.map((slot, idx) => (
                <TimetableRow
                  key={slot.id}
                  slot={{
                    ...slot,
                    startTime: editing ? draftStart : slot.startTime,
                    endTime: editing ? draftEnd : slot.endTime,
                  }}
                  index={idx}
                  readOnly={readOnly || editing}
                  onRemove={
                    !editing && onRemoveSlot ? () => onRemoveSlot(slot.id) : undefined
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-muted/20 px-6 py-3 text-center text-[10px] text-muted-foreground">
        {previewSlots.length} paper{previewSlots.length !== 1 ? "s" : ""} · Sundays, second Saturdays
        & holidays excluded
        {editing ? " · drag subjects above to change dates" : ""}
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
      <td className="border-b border-border/60 px-4 py-3 font-mono text-xs text-muted-foreground">
        {String(slot.dayNumber).padStart(2, "0")}
      </td>
      <td className="whitespace-nowrap border-b border-border/60 px-4 py-3">
        <span className="font-medium">{formatExamDateWithDay(slot.date)}</span>
      </td>
      <td className="border-b border-border/60 px-4 py-3 font-semibold">{slot.subject}</td>
      <td className="whitespace-nowrap border-b border-border/60 px-4 py-3 font-mono text-xs">
        {slot.startTime} – {slot.endTime}
      </td>
      {!readOnly && onRemove && (
        <td className="border-b border-border/60 px-3 py-3">
          <Button size="sm" onClick={onRemove} aria-label="Remove paper">
            <Trash2 className="size-3.5" />
          </Button>
        </td>
      )}
    </tr>
  );
}
