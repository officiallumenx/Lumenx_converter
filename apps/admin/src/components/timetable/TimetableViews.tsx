import type { DragEvent } from "react";
import { AlertTriangle, Coffee, Lock, Plus, Unlock } from "lucide-react";
import {
  getActiveDays,
  isSlotApplicable,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";
import type { TimetableCellRef, TimetableSlot } from "@/lib/timetable-data";
import {
  readTimetableDrag,
  subjectTheme,
  writeTimetableDrag,
} from "@/components/timetable/timetable-theme";
import { TimetableSubjectPalette } from "@/components/timetable/TimetableSubjectPalette";
import { isLockedCell } from "@/lib/timetable-manager";

function teacherInitial(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

export function TimetableSubjectLegend({ subjects }: { subjects: string[] }) {
  if (subjects.length === 0) return null;
  return (
    <div className="lx-timetable-legend">
      <span className="lx-timetable-legend__label">Subjects</span>
      <div className="lx-timetable-legend__items">
        {subjects.map((code) => {
          const theme = subjectTheme(code);
          return (
            <span key={code} className={`lx-timetable-legend__chip ${theme.bg} ${theme.border}`}>
              {code}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TimetableWeekGrid({
  grid,
  schedule,
  onEdit,
  slotHasConflict,
  subjects,
  onMoveSlot,
  onAssignSubject,
  enableDragDrop = false,
  lockedCells,
  onToggleLock,
}: {
  grid: (TimetableSlot | null)[][];
  schedule: TimetableScheduleConfig;
  onEdit: (day: number, period: number) => void;
  slotHasConflict: (day: number, period: number, slot: TimetableSlot) => boolean;
  subjects?: { id: string; name: string; code: string }[];
  onMoveSlot?: (from: { day: number; period: number }, to: { day: number; period: number }) => void;
  onAssignSubject?: (
    subjectId: string,
    to: { day: number; period: number },
    meta: { code: string; name: string },
  ) => void;
  enableDragDrop?: boolean;
  lockedCells?: TimetableCellRef[];
  onToggleLock?: (day: number, period: number) => void;
}) {
  const days = getActiveDays(schedule);
  const dnd = enableDragDrop && (onMoveSlot != null || onAssignSubject != null);

  const uniqueSubjects = Array.from(
    new Set(
      grid
        .flat()
        .filter((s): s is TimetableSlot => s != null)
        .map((s) => s.subject),
    ),
  ).sort();

  const handleDrop = (day: number, period: number, e: DragEvent) => {
    e.preventDefault();
    if (isLockedCell(lockedCells, day, period)) return;
    const payload = readTimetableDrag(e.dataTransfer);
    if (!payload) return;
    if (payload.kind === "cell" && onMoveSlot) {
      if (payload.day === day && payload.period === period) return;
      if (isLockedCell(lockedCells, payload.day, payload.period)) return;
      onMoveSlot({ day: payload.day, period: payload.period }, { day, period });
      return;
    }
    if (payload.kind === "subject" && onAssignSubject) {
      onAssignSubject(payload.subjectId, { day, period }, {
        code: payload.code,
        name: payload.name,
      });
    }
  };

  return (
    <div className="space-y-3">
      {dnd && subjects && subjects.length > 0 && <TimetableSubjectPalette subjects={subjects} />}
      <TimetableSubjectLegend subjects={uniqueSubjects} />
      {dnd && (
        <p className="text-[11px] text-muted-foreground">
          Drag a subject from above, or drag a filled period to move or swap. Lock cells to keep them
          from being cleared accidentally.
        </p>
      )}
      <div className="lx-timetable-scroll" data-swipe-nav-ignore>
        <table className="lx-timetable-grid">
          <thead>
            <tr>
              <th className="lx-timetable-grid__time-col">Period</th>
              {days.map((d) => (
                <th key={d.name} className="lx-timetable-grid__day-col">
                  <span className="lx-timetable-grid__day-name">{d.name}</span>
                  {d.periods < Math.max(...days.map((x) => x.periods)) && (
                    <span className="lx-timetable-grid__day-meta">{d.periods} periods</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.periodRows.map((p, periodIdx) => {
              if (p.isBreak) {
                const breakLabel = p.breakName || p.label || "Break";
                const isLunch = /lunch/i.test(breakLabel);
                return (
                  <tr
                    key={p.id}
                    className={`lx-timetable-grid__break-row ${isLunch ? "lx-timetable-grid__break-row--lunch" : ""}`}
                  >
                    <td colSpan={days.length + 1}>
                      <Coffee className="size-3.5 shrink-0" aria-hidden />
                      <span>
                        {breakLabel} · {p.start} – {p.end}
                      </span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={p.id}>
                  <td className="lx-timetable-grid__time-col">
                    <span className="lx-timetable-grid__period-id">{p.id}</span>
                    <span className="lx-timetable-grid__period-time">
                      {p.start}–{p.end}
                    </span>
                  </td>
                  {days.map((d, dayIdx) => {
                    if (!isSlotApplicable(schedule, dayIdx, periodIdx)) {
                      return (
                        <td key={d.name} className="lx-timetable-grid__na">
                          <span>—</span>
                        </td>
                      );
                    }

                    const slot = grid[dayIdx]?.[periodIdx];
                    const conflict = slot ? slotHasConflict(dayIdx, periodIdx, slot) : false;
                    const locked = isLockedCell(lockedCells, dayIdx, periodIdx);

                    if (!slot) {
                      return (
                        <td key={d.name} className="lx-timetable-grid__cell">
                          <button
                            type="button"
                            onClick={() => onEdit(dayIdx, periodIdx)}
                            onDragOver={dnd ? (e) => e.preventDefault() : undefined}
                            onDrop={dnd ? (e) => handleDrop(dayIdx, periodIdx, e) : undefined}
                            className={`lx-timetable-slot lx-timetable-slot--empty ${dnd ? "lx-timetable-slot--droptarget" : ""}`}
                          >
                            <Plus className="size-3" />
                            <span>{dnd ? "Add" : "Assign"}</span>
                          </button>
                        </td>
                      );
                    }

                    const theme = subjectTheme(slot.subject);

                    return (
                      <td key={d.name} className="lx-timetable-grid__cell">
                        <div className="relative">
                          <button
                            type="button"
                            draggable={dnd && !locked}
                            onDragStart={
                              dnd && !locked
                                ? (e) =>
                                    writeTimetableDrag(e.dataTransfer, {
                                      kind: "cell",
                                      day: dayIdx,
                                      period: periodIdx,
                                    })
                                : undefined
                            }
                            onDragOver={dnd ? (e) => e.preventDefault() : undefined}
                            onDrop={dnd ? (e) => handleDrop(dayIdx, periodIdx, e) : undefined}
                            onClick={() => onEdit(dayIdx, periodIdx)}
                            className={`lx-timetable-slot lx-timetable-slot--filled ${theme.bg} ${theme.border} ${conflict ? "lx-timetable-slot--conflict" : ""} ${dnd && !locked ? "lx-timetable-slot--draggable" : ""} ${locked ? "opacity-95 ring-1 ring-primary/40" : ""}`}
                          >
                            <div className="lx-timetable-slot__subject">{slot.subject}</div>
                            <div className="lx-timetable-slot__teacher">
                              <span className="lx-timetable-slot__avatar" aria-hidden>
                                {teacherInitial(slot.teacher)}
                              </span>
                              <span className="truncate">{slot.teacher}</span>
                            </div>
                            {conflict && (
                              <AlertTriangle
                                className="lx-timetable-slot__warn"
                                aria-label="Scheduling conflict"
                              />
                            )}
                          </button>
                          {onToggleLock && (
                            <button
                              type="button"
                              className="absolute top-0.5 right-0.5 rounded bg-background/90 p-0.5 text-muted-foreground hover:text-primary"
                              title={locked ? "Unlock period" : "Lock period"}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleLock(dayIdx, periodIdx);
                              }}
                            >
                              {locked ? (
                                <Lock className="size-3" />
                              ) : (
                                <Unlock className="size-3 opacity-60" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
