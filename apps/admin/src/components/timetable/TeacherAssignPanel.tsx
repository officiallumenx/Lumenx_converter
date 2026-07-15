import { Field, Select } from "@lumenx/ui-admin";
import { Users } from "lucide-react";
import { useState } from "react";
import type { TimetableScheduleConfig } from "@/lib/timetable-schedule";
import {
  getInstituteTeachers,
  teachersForSubject,
  periodsFromSlotSelections,
  type TeacherAssignMode,
  type TimetableCellRef,
} from "@/lib/timetable-data";
import { SubjectWeekSlotPicker } from "@/components/timetable/SubjectWeekSlotPicker";

export function TeacherAssignPanel({
  mode,
  onModeChange,
  subjects,
  subjectTeachers,
  subjectPeriods,
  subjectSlotSelections,
  onSubjectTeacherChange,
  onSubjectPeriodChange,
  onSlotSelectionsChange,
  schedule,
  maxPeriodsPerWeek,
  autoFilledFromExisting,
}: {
  mode: TeacherAssignMode;
  onModeChange: (mode: TeacherAssignMode) => void;
  subjects: { id: string; name: string; code: string; periodsPerWeek: number }[];
  subjectTeachers: Record<string, string>;
  subjectPeriods: Record<string, number>;
  subjectSlotSelections: Record<string, TimetableCellRef[]>;
  onSubjectTeacherChange: (subjectId: string, teacherId: string) => void;
  onSubjectPeriodChange: (subjectId: string, periods: number) => void;
  onSlotSelectionsChange: (next: Record<string, TimetableCellRef[]>) => void;
  schedule: TimetableScheduleConfig;
  maxPeriodsPerWeek?: number;
  autoFilledFromExisting?: boolean;
}) {
  const teachers = getInstituteTeachers();
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0]?.id ?? "");

  const totalSelected = subjects.reduce(
    (sum, sub) => sum + (subjectPeriods[sub.id] ?? sub.periodsPerWeek),
    0,
  );
  const overBudget =
    maxPeriodsPerWeek !== undefined && totalSelected > maxPeriodsPerWeek;

  const handleSlotChange = (next: Record<string, TimetableCellRef[]>) => {
    onSlotSelectionsChange(next);
    const counts = periodsFromSlotSelections(next, subjects);
    for (const sub of subjects) {
      const count = counts[sub.id] ?? 0;
      if ((subjectPeriods[sub.id] ?? sub.periodsPerWeek) !== count) {
        onSubjectPeriodChange(sub.id, count);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        <Users className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Subjects, days & staff</span> — pick how
          many periods each subject gets by clicking day/period cells in the grid below, then assign
          teachers. Drag subjects on the timetable after it is generated.
          {autoFilledFromExisting && (
            <span className="block mt-1 text-primary">
              Teachers pre-filled from an existing timetable for this grade.
            </span>
          )}
        </div>
      </div>

      <Field label="Assignment mode">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <label
            className={`lx-teacher-mode-card ${mode === "auto" ? "lx-teacher-mode-card--active" : ""}`}
          >
            <input
              type="radio"
              name="teacher-mode"
              checked={mode === "auto"}
              onChange={() => onModeChange("auto")}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Auto (best match)</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                By qualification, experience, and workload.
              </div>
            </div>
          </label>
          <label
            className={`lx-teacher-mode-card ${mode === "manual" ? "lx-teacher-mode-card--active" : ""}`}
          >
            <input
              type="radio"
              name="teacher-mode"
              checked={mode === "manual"}
              onChange={() => onModeChange("manual")}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Pick manually</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Choose staff for each subject yourself.
              </div>
            </div>
          </label>
        </div>
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Weekly period total:{" "}
          <span className={`font-mono font-medium ${overBudget ? "text-warning" : "text-foreground"}`}>
            {totalSelected}
          </span>
          {maxPeriodsPerWeek !== undefined && (
            <span className="text-muted-foreground"> / {maxPeriodsPerWeek} teaching slots</span>
          )}
        </span>
        {overBudget && (
          <span className="text-[10px] text-warning">
            Total exceeds available slots — reduce selections or add more days/periods above.
          </span>
        )}
      </div>

      <SubjectWeekSlotPicker
        schedule={schedule}
        subjects={subjects}
        activeSubjectId={activeSubjectId || subjects[0]?.id || ""}
        onActiveSubjectChange={setActiveSubjectId}
        slotSelections={subjectSlotSelections}
        onSlotSelectionsChange={handleSlotChange}
      />

      <div className="rounded-lg border border-border overflow-hidden bg-surface">
        <div className="lx-teacher-assign-header lx-teacher-assign-header--two-col">
          <span>Subject</span>
          <span>Assigned teacher</span>
        </div>
        {subjects.map((sub) => {
          const qualified = teachersForSubject(sub.code, sub.name);
          const teacherId = subjectTeachers[sub.id] ?? qualified[0]?.id ?? "";
          const teacher = teachers.find((t) => t.id === teacherId);
          const periods = subjectPeriods[sub.id] ?? sub.periodsPerWeek;
          return (
            <div key={sub.id} className="lx-teacher-assign-row lx-teacher-assign-row--two-col">
              <div className="min-w-0">
                <div className="text-sm font-medium">{sub.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {sub.code} · {periods} periods/wk · {qualified.length} qualified
                </div>
              </div>
              {mode === "manual" ? (
                <Select
                  value={teacherId}
                  onChange={(e) => onSubjectTeacherChange(sub.id, e.target.value)}
                  className="h-9 text-xs w-full sm:w-56"
                >
                  {qualified.length === 0 && <option value="">No qualified teacher</option>}
                  {qualified.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.experienceYears}y exp
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="text-xs sm:min-w-[10rem]">
                  <div className="font-medium">{teacher?.name ?? "—"}</div>
                  {teacher && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {teacher.experienceYears}y experience
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
