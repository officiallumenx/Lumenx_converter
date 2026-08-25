import { ThemedDateInput } from "@lumenx/ui-admin";

export type StudentAttendanceDateFieldProps = {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  id?: string;
  min?: string;
  max?: string;
};

/** Reusable attendance date field — themed in-app calendar (not OS date picker). */
export function StudentAttendanceDateField({
  value,
  onChange,
  disabled,
  id = "student-attendance-date",
  min,
  max,
}: StudentAttendanceDateFieldProps) {
  return (
    <label className="block min-w-0 text-xs" htmlFor={id}>
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Attendance date
      </span>
      <ThemedDateInput
        id={id}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        fieldSize="compact"
        placeholder="Select date"
        aria-label="Attendance date"
        className="lx-filter-field"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
