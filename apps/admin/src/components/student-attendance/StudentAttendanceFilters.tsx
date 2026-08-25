import { Card, CascadingFiltersMenu } from "@lumenx/ui-admin";
import { StudentAttendanceSearchField } from "./StudentAttendanceSearchField";
import {
  STUDENT_ATTENDANCE_STATUS_OPTIONS,
  todayIsoDate,
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
 * Filters block (class · section · date · status) + normal search field.
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
      <div className="lx-filter-bar flex flex-wrap items-end gap-2 px-3 py-2.5 sm:px-4">
        <CascadingFiltersMenu
          disabled={disabled}
          groups={[
            {
              id: "class",
              label: "Class",
              value: state.classId,
              clearValues: [""],
              onChange: (classId) => onChange({ classId, sectionId: "" }),
              options: [
                { value: "", label: "Select class" },
                ...classOptions.map((c) => ({ value: c.id, label: c.label })),
              ],
            },
            {
              id: "section",
              label: "Section",
              value: state.sectionId,
              clearValues: [""],
              onChange: (sectionId) => onChange({ sectionId }),
              options: [
                { value: "", label: "Select section" },
                ...sectionOptions.map((s) => ({ value: s.id, label: s.label })),
              ],
            },
            {
              id: "date",
              label: "Date",
              kind: "date",
              value: state.date,
              clearValues: [todayIsoDate()],
              onChange: (date) => onChange({ date }),
            },
            {
              id: "status",
              label: "Status",
              value: state.status,
              onChange: (status) => onChange({ status: status as StudentAttendanceStatusFilter }),
              options: STUDENT_ATTENDANCE_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              })),
            },
          ]}
        />
        <div className="min-w-[12rem] flex-1">
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
