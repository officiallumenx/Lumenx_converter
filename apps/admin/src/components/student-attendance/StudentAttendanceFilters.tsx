import { Card } from "@lumenx/ui-admin";
import { StudentAttendanceClassSelect } from "./StudentAttendanceClassSelect";
import { StudentAttendanceDateField } from "./StudentAttendanceDateField";
import { StudentAttendanceSearchField } from "./StudentAttendanceSearchField";
import { StudentAttendanceSectionSelect } from "./StudentAttendanceSectionSelect";
import type {
  StudentAttendanceClassOption,
  StudentAttendanceSectionOption,
  StudentAttendanceWorkspaceState,
} from "./types";

export type StudentAttendanceFiltersProps = {
  state: StudentAttendanceWorkspaceState;
  classOptions: StudentAttendanceClassOption[];
  sectionOptions: StudentAttendanceSectionOption[];
  onChange: (patch: Partial<StudentAttendanceWorkspaceState>) => void;
  disabled?: boolean;
};

/**
 * Filters: class · section | date · search.
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
        <div className="grid grid-cols-2 gap-2">
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
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StudentAttendanceDateField
            value={state.date}
            disabled={disabled}
            onChange={(date) => onChange({ date })}
          />
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
