import { Clock, CalendarDays } from "lucide-react";
import { Field, Select, TextInput } from "@lumenx/ui-admin";
import {
  ALL_WEEKDAY_NAMES,
  buildScheduleConfig,
  scheduleSummary,
  type ScheduleInput,
} from "@/lib/timetable-schedule";

export function ScheduleConfigForm({
  value,
  onChange,
}: {
  value: ScheduleInput;
  onChange: (next: ScheduleInput) => void;
}) {
  const preview = buildScheduleConfig(value);
  const teachingRows = preview.periodRows.filter((r) => !r.isBreak);

  const setDefaultPeriods = (n: number) => {
    onChange({
      ...value,
      defaultPeriodsPerDay: n,
      days: value.days.map((d) => (d.active ? { ...d, periods: n } : d)),
    });
  };

  const toggleDay = (name: string, active: boolean) => {
    onChange({
      ...value,
      days: value.days.map((d) =>
        d.name === name
          ? { ...d, active, periods: active ? d.periods || value.defaultPeriodsPerDay : 0 }
          : d,
      ),
    });
  };

  const setDayPeriods = (name: string, periods: number) => {
    onChange({
      ...value,
      days: value.days.map((d) => (d.name === name ? { ...d, periods: Math.max(0, periods) } : d)),
    });
  };

  return (
    <div className="lx-schedule-form space-y-4">
      <div className="lx-schedule-form__section">
        <div className="lx-schedule-form__section-head">
          <Clock className="size-4 text-primary shrink-0" />
          <div>
            <div className="text-sm font-semibold">School timings</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Start time, period length, and lunch break</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="School start" required>
            <TextInput
              type="time"
              value={value.startTime}
              onChange={(e) => onChange({ ...value, startTime: e.target.value || "08:00" })}
            />
          </Field>
          <Field label="Period length">
            <Select
              value={String(value.periodDurationMins)}
              onChange={(e) => onChange({ ...value, periodDurationMins: Number(e.target.value) })}
            >
              <option value="40">40 min</option>
              <option value="45">45 min</option>
              <option value="50">50 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
            </Select>
          </Field>
          <Field label="Periods per day">
            <Select
              value={String(value.defaultPeriodsPerDay)}
              onChange={(e) => setDefaultPeriods(Number(e.target.value))}
            >
              {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} periods
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lunch break">
            <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={value.lunchEnabled}
                onChange={(e) => onChange({ ...value, lunchEnabled: e.target.checked })}
                className="rounded border-border"
              />
              Include lunch
            </label>
          </Field>
          {value.lunchEnabled && (
            <>
              <Field label="Lunch after">
                <Select
                  value={String(value.lunchAfterPeriod)}
                  onChange={(e) => onChange({ ...value, lunchAfterPeriod: Number(e.target.value) })}
                >
                  {Array.from({ length: value.defaultPeriodsPerDay }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      After P{n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Lunch duration">
                <Select
                  value={String(value.lunchDurationMins)}
                  onChange={(e) => onChange({ ...value, lunchDurationMins: Number(e.target.value) })}
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </Select>
              </Field>
            </>
          )}
        </div>
      </div>

      <div className="lx-schedule-form__section">
        <div className="lx-schedule-form__section-head">
          <CalendarDays className="size-4 text-chart-2 shrink-0" />
          <div>
            <div className="text-sm font-semibold">Working days</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tap a day to include or exclude it from the schedule</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {ALL_WEEKDAY_NAMES.slice(0, 6).map((name) => {
            const day = value.days.find((d) => d.name === name) ?? {
              name,
              active: false,
              periods: value.defaultPeriodsPerDay,
            };
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleDay(name, !day.active)}
                className={`lx-schedule-day-chip ${day.active ? "lx-schedule-day-chip--on" : ""}`}
              >
                <span className="font-medium">{name.slice(0, 3)}</span>
                {day.active && (
                  <select
                    value={String(day.periods)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDayPeriods(name, Number(e.target.value))}
                    className="lx-schedule-day-chip__periods"
                    aria-label={`Periods on ${name}`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}p
                      </option>
                    ))}
                  </select>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lx-schedule-form__preview">
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Preview</div>
        <p className="text-xs text-muted-foreground mt-1">{scheduleSummary(preview)}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {teachingRows.map((r) => (
            <span key={r.id} className="lx-schedule-time-chip">
              {r.id} {r.start}–{r.end}
            </span>
          ))}
          {value.lunchEnabled && preview.periodRows.some((r) => r.isBreak) && (
            <span className="lx-schedule-time-chip lx-schedule-time-chip--lunch">
              Lunch {preview.periodRows.find((r) => r.isBreak)?.start}–
              {preview.periodRows.find((r) => r.isBreak)?.end}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
