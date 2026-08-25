import {
  cellRefKey,
  maxPeriodsPerSubjectPerWeek,
  type TimetableCellRef,
} from "@/lib/timetable-data";
import { getActiveDays, isSlotApplicable, type TimetableScheduleConfig } from "@/lib/timetable-schedule";
import { subjectTheme } from "@/components/timetable/timetable-theme";
import { useMemo } from "react";

export function SubjectWeekSlotPicker({
  schedule,
  subjects,
  activeSubjectId,
  onActiveSubjectChange,
  slotSelections,
  onSlotSelectionsChange,
}: {
  schedule: TimetableScheduleConfig;
  subjects: { id: string; name: string; code: string; periodsPerWeek: number }[];
  activeSubjectId: string;
  onActiveSubjectChange: (subjectId: string) => void;
  slotSelections: Record<string, TimetableCellRef[]>;
  onSlotSelectionsChange: (next: Record<string, TimetableCellRef[]>) => void;
}) {
  const days = getActiveDays(schedule);
  const teachingRows = schedule.periodRows.filter((p) => !p.isBreak);
  const maxPerSubject = maxPeriodsPerSubjectPerWeek(schedule);

  const ownerByCell = useMemo(() => {
    const map = new Map<string, string>();
    for (const [subjectId, cells] of Object.entries(slotSelections)) {
      for (const c of cells) map.set(cellRefKey(c), subjectId);
    }
    return map;
  }, [slotSelections]);

  const daysUsedBySubject = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const [subjectId, cells] of Object.entries(slotSelections)) {
      map.set(subjectId, new Set(cells.map((c) => c.day)));
    }
    return map;
  }, [slotSelections]);

  const toggleCell = (day: number, period: number) => {
    if (!activeSubjectId || !isSlotApplicable(schedule, day, period)) return;
    const key = cellRefKey({ day, period });
    const owner = ownerByCell.get(key);

    if (owner === activeSubjectId) {
      onSlotSelectionsChange({
        ...slotSelections,
        [activeSubjectId]: (slotSelections[activeSubjectId] ?? []).filter(
          (c) => cellRefKey(c) !== key,
        ),
      });
      return;
    }

    const activeDays = daysUsedBySubject.get(activeSubjectId) ?? new Set<number>();
    if (owner !== activeSubjectId && activeDays.has(day)) {
      const next: Record<string, TimetableCellRef[]> = {};
      for (const sub of subjects) {
        next[sub.id] = (slotSelections[sub.id] ?? []).filter((c) => {
          if (cellRefKey(c) === key) return false;
          if (sub.id === activeSubjectId && c.day === day) return false;
          return true;
        });
      }
      next[activeSubjectId] = [...(next[activeSubjectId] ?? []), { day, period }];
      onSlotSelectionsChange(next);
      return;
    }

    const currentCount = slotSelections[activeSubjectId]?.length ?? 0;
    if (currentCount >= maxPerSubject && owner !== activeSubjectId) {
      return;
    }

    const next: Record<string, TimetableCellRef[]> = {};
    for (const sub of subjects) {
      next[sub.id] = (slotSelections[sub.id] ?? []).filter((c) => cellRefKey(c) !== key);
    }
    next[activeSubjectId] = [...(next[activeSubjectId] ?? []), { day, period }];
    onSlotSelectionsChange(next);
  };

  return (
    <div className="lx-subject-slot-picker">
      <div className="lx-subject-slot-picker__subjects">
        {subjects.map((sub) => {
          const count = slotSelections[sub.id]?.length ?? 0;
          const theme = subjectTheme(sub.code);
          const active = sub.id === activeSubjectId;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onActiveSubjectChange(sub.id)}
              className={`lx-subject-slot-picker__subject ${active ? "lx-subject-slot-picker__subject--active" : ""} ${theme.bg} ${theme.border}`}
            >
              <span className="font-medium text-sm truncate">{sub.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{sub.code}</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-mono font-medium">
                  {count} pinned · 1/day max
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="lx-subject-slot-picker__grid-wrap">
        <p className="text-[11px] text-muted-foreground mb-2">
          Click day/period cells to pin{" "}
          <span className="font-medium text-foreground">
            {subjects.find((s) => s.id === activeSubjectId)?.name ?? "a subject"}
          </span>
          . Periods/week is controlled in the subject plan above.
        </p>
        <div className="lx-timetable-scroll" data-swipe-nav-ignore>
          <table className="lx-timetable-grid lx-subject-slot-picker__grid">
            <thead>
              <tr>
                <th className="lx-timetable-grid__time-col">Period</th>
                {days.map((d) => (
                  <th key={d.name} className="lx-timetable-grid__day-col">
                    <span className="lx-timetable-grid__day-name">{d.name.slice(0, 3)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachingRows.map((p) => {
                const periodIdx = schedule.periodRows.indexOf(p);
                return (
                  <tr key={p.id}>
                    <td className="lx-timetable-grid__time-col">
                      <span className="lx-timetable-grid__period-id">{p.id}</span>
                    </td>
                    {days.map((d, dayIdx) => {
                      if (!isSlotApplicable(schedule, dayIdx, periodIdx)) {
                        return (
                          <td key={d.name} className="lx-timetable-grid__na">
                            <span>—</span>
                          </td>
                        );
                      }
                      const ownerId = ownerByCell.get(cellRefKey({ day: dayIdx, period: periodIdx }));
                      const owner = subjects.find((s) => s.id === ownerId);
                      const theme = owner ? subjectTheme(owner.code) : null;
                      const isActiveCell = ownerId === activeSubjectId;

                      return (
                        <td key={d.name} className="lx-timetable-grid__cell">
                          <button
                            type="button"
                            onClick={() => toggleCell(dayIdx, periodIdx)}
                            className={`lx-subject-slot-cell ${theme ? `${theme.bg} ${theme.border}` : ""} ${isActiveCell ? "lx-subject-slot-cell--mine" : owner ? "lx-subject-slot-cell--taken" : "lx-subject-slot-cell--empty"}`}
                            title={
                              owner
                                ? `${owner.name} · click to ${ownerId === activeSubjectId ? "remove" : "reassign"}`
                                : "Empty · click to assign"
                            }
                          >
                            {owner ? (
                              <span className="lx-subject-slot-cell__code">{owner.code.split(" ")[0]}</span>
                            ) : (
                              <span className="lx-subject-slot-cell__plus">+</span>
                            )}
                          </button>
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
    </div>
  );
}
