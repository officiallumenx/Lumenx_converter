import { Card, Select } from "@lumenx/ui-admin";
import { StudentAttendanceClassSelect } from "./StudentAttendanceClassSelect";
import { StudentAttendanceDateField } from "./StudentAttendanceDateField";
import { StudentAttendanceSearchField } from "./StudentAttendanceSearchField";
import { StudentAttendanceSectionSelect } from "./StudentAttendanceSectionSelect";
import {
  STUDENT_ATTENDANCE_STATUS_OPTIONS,
  type StudentAttendanceClassOption,
  type StudentAttendanceSectionOption,
  type StudentAttendanceStatusFilter,
  type StudentAttendanceWorkspaceState,
} from "./types";

export type StudentAttendanceFiltersProps = {
  state: StudentAttendanceWorkspaceState;
  classOptions: StudentAttendanceClassOption[];
  sectionOptions: StudentAttendanceSectionOption[];
  onChange: (patch: Partial<StudentAttendanceWorkspaceState>) => void;
  disabled?: boolean;
};

/**
 * Visible class · section · date · status fields + search.
 */
export function StudentAttendanceFilters({
  state,
  classOptions,
  sectionOptions,
  onChange,
  disabled,
}: StudentAttendanceFiltersProps) {
  return (
    <Card>
      <div className="lx-filter-bar space-y-2 px-3 py-2.5 sm:px-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StudentAttendanceClassSelect
            value={state.classId}
            options={classOptions}
            disabled={disabled}
            onChange={(classId) => onChange({ classId, sectionId: "" })}
          />
          <StudentAttendanceSectionSelect
            value={state.sectionId}
            options={sectionOptions}
            disabled={disabled || !state.classId}
            onChange={(sectionId) => onChange({ sectionId })}
          />
          <StudentAttendanceDateField
            value={state.date}
            disabled={disabled}
            onChange={(date) => onChange({ date })}
          />
          <label className="block min-w-0 text-xs" htmlFor="student-attendance-status">
            <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <Select
              id="student-attendance-status"
              fieldSize="compact"
              className="lx-filter-field"
              value={state.status}
              disabled={disabled}
              onChange={(e) =>
                onChange({ status: e.target.value as StudentAttendanceStatusFilter })
              }
              aria-label="Attendance status"
            >
              {STUDENT_ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="min-w-0 sm:max-w-sm">
          <StudentAttendanceSearchField
            value={state.search}
            disabled={disabled}
            onChange={(search) => onChange({ search })}
          />
        </div>
      </div>
    </Card>
  );
}
