import { SegmentedControl } from "@lumenx/ui-admin";
import {
  STUDENT_ATTENDANCE_STATUS_OPTIONS,
  type StudentAttendanceStatusFilter,
} from "./types";

export type StudentAttendanceStatusFilterProps = {
  value: StudentAttendanceStatusFilter;
  onChange: (status: StudentAttendanceStatusFilter) => void;
  disabled?: boolean;
};

/** Reusable attendance status filter (UI only — not mark actions). */
export function StudentAttendanceStatusFilterControl({
  value,
  onChange,
  disabled,
}: StudentAttendanceStatusFilterProps) {
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <p className="mb-1 text-xs text-muted-foreground">Attendance status</p>
      <SegmentedControl
        value={value}
        onChange={onChange}
        options={STUDENT_ATTENDANCE_STATUS_OPTIONS}
      />
    </div>
  );
}
