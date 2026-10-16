import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Pill,
  SearchInput,
  Select,
} from "@lumenx/ui-admin";
import {
  clearSelectionInScope,
  filterSelectableStudents,
  selectAllInScope,
  selectEntireClass,
  toggleStudentId,
  uniqueClassLabels,
  uniqueSectionLabels,
  type SelectableStudent,
} from "@/lib/docs-certs/student-selection";

type StudentMultiSelectPanelProps = {
  students: SelectableStudent[];
  selectedIds: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  academicYearOptions?: Array<{ id: string; label: string }>;
  disabled?: boolean;
};

export function StudentMultiSelectPanel({
  students,
  selectedIds,
  onChange,
  academicYearOptions = [],
  disabled = false,
}: StudentMultiSelectPanelProps) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [query, setQuery] = useState("");

  const classOptions = useMemo(() => uniqueClassLabels(students), [students]);
  const sectionOptions = useMemo(
    () => uniqueSectionLabels(students, classLabel || undefined),
    [students, classLabel],
  );

  const visible = useMemo(
    () =>
      filterSelectableStudents(students, {
        academicYearId: academicYearId || undefined,
        classLabel: classLabel || undefined,
        sectionLabel: sectionLabel || undefined,
        query,
      }),
    [students, academicYearId, classLabel, sectionLabel, query],
  );

  const visibleIds = visible.map((s) => s.id);
  const selectedInScope = visibleIds.filter((id) => selectedIds.has(id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {academicYearOptions.length > 0 ? (
          <Field label="Academic year" className="min-w-[10rem]">
            <Select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              disabled={disabled}
            >
              <option value="">All years</option>
              {academicYearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Class" className="min-w-[8rem]">
          <Select
            value={classLabel}
            onChange={(e) => {
              setClassLabel(e.target.value);
              setSectionLabel("");
            }}
            disabled={disabled}
          >
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section" className="min-w-[8rem]">
          <Select
            value={sectionLabel}
            onChange={(e) => setSectionLabel(e.target.value)}
            disabled={disabled || !classLabel}
          >
            <option value="">All sections</option>
            {sectionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Search" className="min-w-[12rem] flex-1">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or admission no."
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">
          {selectedIds.size} selected
          {visible.length > 0 ? ` · ${selectedInScope}/${visible.length} in view` : ""}
        </Pill>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || visibleIds.length === 0}
          onClick={() => onChange(selectAllInScope(selectedIds, visibleIds))}
        >
          Select all in view
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !classLabel}
          onClick={() =>
            onChange(
              selectEntireClass(
                selectedIds,
                students,
                classLabel,
                sectionLabel || undefined,
              ),
            )
          }
        >
          Select class{sectionLabel ? ` ${classLabel}-${sectionLabel}` : classLabel ? ` ${classLabel}` : ""}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || selectedInScope === 0}
          onClick={() => onChange(clearSelectionInScope(selectedIds, visibleIds))}
        >
          Clear selection in view
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No students match the current filters.
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-border/50 rounded-xl border border-border">
          {visible.map((s) => {
            const checked = selectedIds.has(s.id);
            return (
              <li key={s.id}>
                <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-hover">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onChange(toggleStudentId(selectedIds, s.id))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">
                      {s.displayName}
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {[s.classLabel, s.sectionLabel].filter(Boolean).join("-") || "—"}
                      {s.admissionNumber ? ` · ${s.admissionNumber}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
