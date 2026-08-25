import { Select } from "@lumenx/ui-admin";
import type { StudentAttendanceClassOption } from "./types";

export type StudentAttendanceClassSelectProps = {
  value: string;
  options: StudentAttendanceClassOption[];
  onChange: (classId: string) => void;
  disabled?: boolean;
  id?: string;
};

/** Reusable class selector for Student Attendance workspace. */
export function StudentAttendanceClassSelect({
  value,
  options,
  onChange,
  disabled,
  id = "student-attendance-class",
}: StudentAttendanceClassSelectProps) {
  return (
    <label className="block min-w-0 text-xs" htmlFor={id}>
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Class</span>
      <Select
        id={id}
        fieldSize="compact"
        className="lx-filter-field"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Class selection"
      >
        <option value="">Select class</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
