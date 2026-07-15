import { useMemo } from "react";
import {
  getActiveDays,
  isSlotApplicable,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";
import {
  autoPickSlotsForSubject,
  cellRefKey,
  type TimetableCellRef,
} from "@/lib/timetable-data";
import { subjectTheme } from "@/components/timetable/timetable-theme";

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

  const ownerByCell = useMemo(() => {
    const map = new Map<string, string>();
    for (const [subjectId, cells] of Object.entries(slotSelections)) {
      for (const c of cells) map.set(cellRefKey(c), subjectId);
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

    const next: Record<string, TimetableCellRef[]> = {};
    for (const sub of subjects) {
      next[sub.id] = (slotSelections[sub.id] ?? []).filter((c) => cellRefKey(c) !== key);
    }
    next[activeSubjectId] = [...(next[activeSubjectId] ?? []), { day, period }];
    onSlotSelectionsChange(next);
  };

  const setPeriodCount = (subjectId: string, count: number) => {
    onSlotSelectionsChange(autoPickSlotsForSubject(subjectId, count, slotSelections, schedule));
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
                <select
                  value={count}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setPeriodCount(sub.id, Number(e.target.value))}
                  className="lx-subject-slot-picker__count-select"
                  aria-label={`Periods per week for ${sub.name}`}
                >
                  {Array.from({ length: 11 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}/wk
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground">· click grid →</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="lx-subject-slot-picker__grid-wrap">
        <p className="text-[11px] text-muted-foreground mb-2">
          Click day/period cells to assign{" "}
          <span className="font-medium text-foreground">
            {subjects.find((s) => s.id === activeSubjectId)?.name ?? "a subject"}
          </span>
        </p>
        <div className="lx-timetable-scroll">
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
