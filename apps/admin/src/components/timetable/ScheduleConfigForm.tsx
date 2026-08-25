import { Clock, CalendarDays, Coffee, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Field, Select, TextInput, Button } from "@lumenx/ui-admin";
import {
  ALL_WEEKDAY_NAMES,
  addBellBreak,
  addBellPeriod,
  buildScheduleConfig,
  moveBellItem,
  rebuildBellItemsFromUniform,
  removeBellItem,
  scheduleSummary,
  updateBellItem,
  validateBellItems,
  type ScheduleInput,
} from "@/lib/timetable-schedule";

export function ScheduleConfigForm({
  value,
  onChange,
  mode = "class-override",
}: {
  value: ScheduleInput;
  onChange: (next: ScheduleInput) => void;
  /** Clarifies whether edits apply institute-wide or only to this class */
  mode?: "institute-default" | "class-override";
}) {
  const preview = buildScheduleConfig(value);
  const bellItems = value.bellItems ?? preview.bellItems ?? [];
  const issues = validateBellItems(bellItems);
  const scopeLabel =
    mode === "institute-default"
      ? "Institute default bell schedule — used when creating new class timetables"
      : "This class only — overrides the institute default for this timetable";

  const setDefaultPeriods = (n: number) => {
    onChange(
      rebuildBellItemsFromUniform({
        ...value,
        defaultPeriodsPerDay: n,
        days: value.days.map((d) => (d.active ? { ...d, periods: n } : d)),
      }),
    );
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

  const setBellItems = (nextItems: typeof bellItems) => {
    const teaching = nextItems.filter((item) => item.kind === "period").length;
    onChange({
      ...value,
      bellItems: nextItems,
      defaultPeriodsPerDay: Math.max(teaching, 1),
      days: value.days.map((d) => (d.active ? { ...d, periods: Math.max(teaching, 1) } : d)),
      lunchEnabled: nextItems.some((item) => item.kind === "break" && /lunch/i.test(item.label)),
    });
  };

  return (
    <div className="lx-schedule-form space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">
          {mode === "institute-default" ? "Institute default" : "Class override"}
        </span>
        {" — "}
        {scopeLabel}
      </div>
      <div className="lx-schedule-form__section">
        <div className="lx-schedule-form__section-head">
          <Clock className="size-4 text-primary shrink-0" />
          <div>
            <div className="text-sm font-semibold">School timings</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Defaults for new periods — edit individual times in the bell schedule below
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="School start" required>
            <TextInput
              type="time"
              value={value.startTime}
              onChange={(e) =>
                onChange(
                  rebuildBellItemsFromUniform({
                    ...value,
                    startTime: e.target.value || "08:00",
                  }),
                )
              }
            />
          </Field>
          <Field label="Default period length">
            <Select
              value={String(value.periodDurationMins)}
              onChange={(e) =>
                onChange(
                  rebuildBellItemsFromUniform({
                    ...value,
                    periodDurationMins: Number(e.target.value),
                  }),
                )
              }
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
          <Field label="Quick lunch">
            <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={value.lunchEnabled}
                onChange={(e) =>
                  onChange(
                    rebuildBellItemsFromUniform({
                      ...value,
                      lunchEnabled: e.target.checked,
                    }),
                  )
                }
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
                  onChange={(e) =>
                    onChange(
                      rebuildBellItemsFromUniform({
                        ...value,
                        lunchAfterPeriod: Number(e.target.value),
                      }),
                    )
                  }
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
                  onChange={(e) =>
                    onChange(
                      rebuildBellItemsFromUniform({
                        ...value,
                        lunchDurationMins: Number(e.target.value),
                      }),
                    )
                  }
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
          <Coffee className="size-4 text-chart-3 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Bell schedule</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Edit each period and break time. Add morning break, lunch, or extra periods.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(rebuildBellItemsFromUniform(value))}
          >
            <RotateCcw className="size-3" /> Rebuild
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {bellItems.map((item, index) => (
            <div
              key={item.id}
              className={`lx-bell-row ${item.kind === "break" ? "lx-bell-row--break" : ""}`}
            >
              <Select
                value={item.kind}
                onChange={(e) =>
                  setBellItems(
                    updateBellItem(bellItems, item.id, {
                      kind: e.target.value as "period" | "break",
                      label:
                        e.target.value === "break"
                          ? item.label.startsWith("P")
                            ? "Break"
                            : item.label
                          : item.label.startsWith("P")
                            ? item.label
                            : `P${index + 1}`,
                    }),
                  )
                }
                className="h-9 text-xs w-[6.5rem]"
              >
                <option value="period">Period</option>
                <option value="break">Break</option>
              </Select>
              <TextInput
                value={item.label}
                onChange={(e) =>
                  setBellItems(updateBellItem(bellItems, item.id, { label: e.target.value }))
                }
                className="h-9 text-xs w-28"
                aria-label="Label"
              />
              <TextInput
                type="time"
                value={item.start}
                onChange={(e) =>
                  setBellItems(updateBellItem(bellItems, item.id, { start: e.target.value }))
                }
                className="h-9 text-xs w-[7.5rem]"
              />
              <span className="text-[10px] text-muted-foreground">to</span>
              <TextInput
                type="time"
                value={item.end}
                onChange={(e) =>
                  setBellItems(updateBellItem(bellItems, item.id, { end: e.target.value }))
                }
                className="h-9 text-xs w-[7.5rem]"
              />
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  className="lx-bell-icon-btn"
                  aria-label="Move up"
                  onClick={() => setBellItems(moveBellItem(bellItems, item.id, -1))}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="lx-bell-icon-btn"
                  aria-label="Move down"
                  onClick={() => setBellItems(moveBellItem(bellItems, item.id, 1))}
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="lx-bell-icon-btn lx-bell-icon-btn--danger"
                  aria-label="Remove"
                  onClick={() => setBellItems(removeBellItem(bellItems, item.id))}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBellItems(addBellPeriod(bellItems, value.periodDurationMins))}
          >
            <Plus className="size-3" /> Period
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBellItems(addBellBreak(bellItems, "Morning Break", 15))}
          >
            <Plus className="size-3" /> Morning break
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBellItems(addBellBreak(bellItems, "Lunch", value.lunchDurationMins))}
          >
            <Plus className="size-3" /> Lunch
          </Button>
        </div>

        {issues.length > 0 && (
          <ul className="mt-3 space-y-1">
            {issues.map((issue) => (
              <li
                key={issue.message}
                className={`text-[11px] ${issue.severity === "error" ? "text-destructive" : "text-warning"}`}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lx-schedule-form__section">
        <div className="lx-schedule-form__section-head">
          <CalendarDays className="size-4 text-chart-2 shrink-0" />
          <div>
            <div className="text-sm font-semibold">Working days</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tap a day to include or exclude it from the schedule
            </p>
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
                  <Select
                    value={String(day.periods)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDayPeriods(name, Number(e.target.value))}
                    className="lx-schedule-day-chip__periods"
                    aria-label={`Periods on ${name}`}
                    fieldSize="compact"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}p
                      </option>
                    ))}
                  </Select>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lx-schedule-form__preview">
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          Preview
        </div>
        <p className="text-xs text-muted-foreground mt-1">{scheduleSummary(preview)}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {preview.periodRows.map((r) => (
            <span
              key={r.id}
              className={`lx-schedule-time-chip ${r.isBreak ? "lx-schedule-time-chip--lunch" : ""}`}
            >
              {r.isBreak ? r.breakName || r.label : r.id} {r.start}–{r.end}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
