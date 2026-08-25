import type { TimetableScheduleConfig } from "@/lib/timetable-schedule";
import { matchesLunchPreference } from "@/lib/timetable-schedule";
import {
  getInstituteTeachers,
  teachersForSubject,
  maxPeriodsPerSubjectPerWeek,
  type TimetableCellRef,
  type PlacementPreference,
} from "@/lib/timetable-data";
import { SubjectWeekSlotPicker } from "@/components/timetable/SubjectWeekSlotPicker";
import { Field, Select, Button } from "@lumenx/ui-admin";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState } from "react";

function teacherOptionsForSubject(subject: { code: string; name: string }, selectedId: string) {
  const all = getInstituteTeachers();
  const recommended = teachersForSubject(subject.code, subject.name);
  const recommendedIds = new Set(recommended.map((t) => t.id));
  const selected = selectedId ? all.find((t) => t.id === selectedId) : undefined;
  const rest = all.filter((t) => !recommendedIds.has(t.id) && t.id !== selectedId);
  return { recommended, selected, rest, all };
}

export function TeacherAssignPanel({
  subjects,
  subjectTeachers,
  subjectPeriods,
  subjectSlotSelections,
  subjectPlacementPreferences,
  onSubjectTeacherChange,
  onSubjectPeriodChange,
  onSlotSelectionsChange,
  onPlacementPreferenceChange,
  schedule,
  maxPeriodsPerWeek,
  blockWhenOverBudget = true,
  showAdvancedSlots = false,
}: {
  subjects: { id: string; name: string; code: string; periodsPerWeek: number }[];
  subjectTeachers: Record<string, string>;
  subjectPeriods: Record<string, number>;
  subjectSlotSelections: Record<string, TimetableCellRef[]>;
  subjectPlacementPreferences?: Record<string, PlacementPreference>;
  onSubjectTeacherChange: (subjectId: string, teacherId: string) => void;
  onSubjectPeriodChange: (subjectId: string, periods: number) => void;
  onSlotSelectionsChange: (next: Record<string, TimetableCellRef[]>) => void;
  onPlacementPreferenceChange?: (subjectId: string, preference: PlacementPreference) => void;
  schedule: TimetableScheduleConfig;
  maxPeriodsPerWeek?: number;
  blockWhenOverBudget?: boolean;
  /** When true, starts with exact-slot picker expanded */
  showAdvancedSlots?: boolean;
}) {
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0]?.id ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(showAdvancedSlots);
  const maxPerSubject = maxPeriodsPerSubjectPerWeek(schedule);

  const totalSelected = subjects.reduce(
    (sum, sub) => sum + Math.min(subjectPeriods[sub.id] ?? sub.periodsPerWeek, maxPerSubject),
    0,
  );
  const overBudget =
    maxPeriodsPerWeek !== undefined && totalSelected > maxPeriodsPerWeek;

  const handlePeriodChange = (subjectId: string, count: number) => {
    onSubjectPeriodChange(subjectId, Math.min(count, maxPerSubject));
  };

  const handlePreferenceChange = (subjectId: string, preference: PlacementPreference) => {
    onPlacementPreferenceChange?.(subjectId, preference);
    const cleaned: Record<string, TimetableCellRef[]> = {};
    for (const sub of subjects) {
      const pref =
        sub.id === subjectId
          ? preference
          : (subjectPlacementPreferences?.[sub.id] ?? "any");
      cleaned[sub.id] = (subjectSlotSelections[sub.id] ?? []).filter((cell) =>
        matchesLunchPreference(schedule, cell.period, pref),
      );
    }
    onSlotSelectionsChange(cleaned);
  };

  const handleSlotChange = (next: Record<string, TimetableCellRef[]>) => {
    const cleaned: Record<string, TimetableCellRef[]> = {};
    for (const sub of subjects) {
      const preference = subjectPlacementPreferences?.[sub.id] ?? "any";
      cleaned[sub.id] = (next[sub.id] ?? []).filter((cell) =>
        matchesLunchPreference(schedule, cell.period, preference),
      );
    }
    onSlotSelectionsChange(cleaned);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        <Users className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Subject plan</span> — pick a teacher for
          each subject (full staff list). Saving applies those teachers to periods already on the
          grid. Then click cells to place remaining periods.
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Weekly period total:{" "}
          <span
            className={`font-mono font-medium ${overBudget ? "text-destructive" : "text-foreground"}`}
          >
            {totalSelected}
          </span>
          {maxPeriodsPerWeek !== undefined && (
            <span className="text-muted-foreground"> / {maxPeriodsPerWeek} teaching slots</span>
          )}
        </span>
        {overBudget && (
          <span className="text-[10px] text-destructive">
            {blockWhenOverBudget
              ? "Total exceeds available slots — reduce periods."
              : "Total exceeds available slots — reduce selections or add more days/periods."}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-surface">
        <div className="lx-teacher-assign-header lx-teacher-assign-header--prefs">
          <span>Subject</span>
          <span>Periods/wk</span>
          <span>Timing</span>
          <span>Teacher</span>
        </div>
        {subjects.map((sub) => {
          const teacherId = subjectTeachers[sub.id] ?? "";
          const periods = Math.min(subjectPeriods[sub.id] ?? sub.periodsPerWeek, maxPerSubject);
          const preference = subjectPlacementPreferences?.[sub.id] ?? "any";
          const { recommended, selected, rest } = teacherOptionsForSubject(sub, teacherId);
          return (
            <div key={sub.id} className="lx-teacher-assign-row lx-teacher-assign-row--prefs">
              <div className="min-w-0">
                <div className="text-sm font-medium">{sub.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {sub.code} · catalog {sub.periodsPerWeek}/wk
                </div>
              </div>
              <Select
                value={String(periods)}
                onChange={(e) => handlePeriodChange(sub.id, Number(e.target.value))}
                className="h-10 text-xs w-full"
              >
                {Array.from({ length: maxPerSubject + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <Select
                value={preference}
                onChange={(e) =>
                  handlePreferenceChange(sub.id, e.target.value as PlacementPreference)
                }
                className="h-10 text-xs w-full"
                disabled={!onPlacementPreferenceChange}
              >
                <option value="any">Any time</option>
                <option value="before_lunch">Before lunch</option>
                <option value="after_lunch">After lunch</option>
              </Select>
              <Select
                value={teacherId}
                onChange={(e) => onSubjectTeacherChange(sub.id, e.target.value)}
                className="h-10 text-xs w-full min-w-0"
              >
                <option value="">Select teacher…</option>
                {selected && !recommended.some((t) => t.id === selected.id) && (
                  <option value={selected.id}>
                    {selected.name} · {selected.department}
                  </option>
                )}
                {recommended.length > 0 && (
                  <optgroup label="Recommended">
                    {recommended.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.experienceYears}y · {t.department}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="All teachers">
                  {rest.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.department}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between rounded-none border-0"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <span>Advanced exact slots</span>
          {advancedOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
        {advancedOpen && (
          <div className="border-t border-border p-3">
            <p className="text-[11px] text-muted-foreground mb-3">
              Optional: pin exact day/period cells yourself.
            </p>
            <SubjectWeekSlotPicker
              schedule={schedule}
              subjects={subjects}
              activeSubjectId={activeSubjectId || subjects[0]?.id || ""}
              onActiveSubjectChange={setActiveSubjectId}
              slotSelections={subjectSlotSelections}
              onSlotSelectionsChange={handleSlotChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
