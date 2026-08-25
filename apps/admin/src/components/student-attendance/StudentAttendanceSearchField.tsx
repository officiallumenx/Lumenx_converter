import { SearchInput } from "@lumenx/ui-admin";

export type StudentAttendanceSearchFieldProps = {
  value: string;
  onChange: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

/** Reusable roster search field. */
export function StudentAttendanceSearchField({
  value,
  onChange,
  disabled,
  placeholder = "Search by name or roll…",
  id = "student-attendance-search",
}: StudentAttendanceSearchFieldProps) {
  return (
    <label className="block min-w-0 text-xs" htmlFor={id}>
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Search</span>
      <SearchInput
        id={id}
        fieldSize="compact"
        inputClassName="lx-filter-field"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search students"
      />
    </label>
  );
}
