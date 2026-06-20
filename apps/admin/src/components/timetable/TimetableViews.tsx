import { AlertTriangle, Coffee, Plus } from "lucide-react";
import {
  getActiveDays,
  isSlotApplicable,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";
import type { TimetableSlot } from "@/lib/timetable-data";

type SubjectTheme = { border: string; bg: string; code: string };

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  MTH: { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "MTH" },
  PHY: { border: "border-l-violet-500", bg: "bg-violet-500/12 dark:bg-violet-400/15", code: "PHY" },
  CHM: { border: "border-l-emerald-500", bg: "bg-emerald-500/12 dark:bg-emerald-400/15", code: "CHM" },
  ENG: { border: "border-l-amber-500", bg: "bg-amber-500/12 dark:bg-amber-400/15", code: "ENG" },
  CS: { border: "border-l-cyan-500", bg: "bg-cyan-500/12 dark:bg-cyan-400/15", code: "CS" },
  HIS: { border: "border-l-orange-500", bg: "bg-orange-500/12 dark:bg-orange-400/15", code: "HIS" },
  BIO: { border: "border-l-rose-500", bg: "bg-rose-500/12 dark:bg-rose-400/15", code: "BIO" },
};

const FALLBACK_THEMES: SubjectTheme[] = [
  { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "A" },
  { border: "border-l-violet-500", bg: "bg-violet-500/12 dark:bg-violet-400/15", code: "B" },
  { border: "border-l-emerald-500", bg: "bg-emerald-500/12 dark:bg-emerald-400/15", code: "C" },
  { border: "border-l-amber-500", bg: "bg-amber-500/12 dark:bg-amber-400/15", code: "D" },
  { border: "border-l-cyan-500", bg: "bg-cyan-500/12 dark:bg-cyan-400/15", code: "E" },
];

function subjectTheme(code: string): SubjectTheme {
  const prefix = code.split(" ")[0]?.slice(0, 3).toUpperCase() ?? code;
  for (const [key, theme] of Object.entries(SUBJECT_THEMES)) {
    if (prefix.startsWith(key) || code.toUpperCase().includes(key)) return theme;
  }
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h + code.charCodeAt(i)) % FALLBACK_THEMES.length;
  return FALLBACK_THEMES[h]!;
}

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
}: {
  grid: (TimetableSlot | null)[][];
  schedule: TimetableScheduleConfig;
  onEdit: (day: number, period: number) => void;
  slotHasConflict: (day: number, period: number, slot: TimetableSlot) => boolean;
}) {
  const days = getActiveDays(schedule);
  const breakRow = schedule.periodRows.find((r) => r.isBreak);

  const uniqueSubjects = Array.from(
    new Set(
      grid.flat().filter((s): s is TimetableSlot => s != null).map((s) => s.subject),
    ),
  ).sort();

  return (
    <div className="space-y-3">
      <TimetableSubjectLegend subjects={uniqueSubjects} />
      <div className="lx-timetable-scroll">
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
                return (
                  <tr key={p.id} className="lx-timetable-grid__break-row">
                    <td colSpan={days.length + 1}>
                      <Coffee className="size-3.5 shrink-0" aria-hidden />
                      <span>Lunch break · {breakRow?.start} – {breakRow?.end}</span>
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

                    if (!slot) {
                      return (
                        <td key={d.name} className="lx-timetable-grid__cell">
                          <button
                            type="button"
                            onClick={() => onEdit(dayIdx, periodIdx)}
                            className="lx-timetable-slot lx-timetable-slot--empty"
                          >
                            <Plus className="size-4" />
                            <span>Assign</span>
                          </button>
                        </td>
                      );
                    }

                    const theme = subjectTheme(slot.subject);

                    return (
                      <td key={d.name} className="lx-timetable-grid__cell">
                        <button
                          type="button"
                          onClick={() => onEdit(dayIdx, periodIdx)}
                          className={`lx-timetable-slot lx-timetable-slot--filled ${theme.bg} ${theme.border} ${conflict ? "lx-timetable-slot--conflict" : ""}`}
                        >
                          <div className="lx-timetable-slot__subject">{slot.subject}</div>
                          <div className="lx-timetable-slot__teacher">
                            <span className="lx-timetable-slot__avatar" aria-hidden>
                              {teacherInitial(slot.teacher)}
                            </span>
                            <span className="truncate">{slot.teacher}</span>
                          </div>
                          {conflict && (
                            <AlertTriangle className="lx-timetable-slot__warn" aria-label="Scheduling conflict" />
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
  );
}
