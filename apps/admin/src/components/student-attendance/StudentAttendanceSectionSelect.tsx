import { Select } from "@lumenx/ui-admin";
import type { StudentAttendanceSectionOption } from "./types";

export type StudentAttendanceSectionSelectProps = {
  value: string;
  options: StudentAttendanceSectionOption[];
  onChange: (sectionId: string) => void;
  disabled?: boolean;
  id?: string;
};

/** Reusable section selector for Student Attendance workspace. */
export function StudentAttendanceSectionSelect({
  value,
  options,
  onChange,
  disabled,
  id = "student-attendance-section",
}: StudentAttendanceSectionSelectProps) {
  return (
    <label className="block min-w-0 text-xs" htmlFor={id}>
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Section</span>
      <Select
        id={id}
        fieldSize="compact"
        className="lx-filter-field"
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Section selection"
      >
        <option value="">{options.length ? "Select section" : "Select class first"}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
