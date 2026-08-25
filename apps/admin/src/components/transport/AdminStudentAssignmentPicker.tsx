import { useMemo, useState } from "react";
import { Button, Select } from "@lumenx/ui-admin";
import {
  studentDirectoryClasses,
  studentDirectoryFor,
  studentDirectorySections,
  studentsByIds,
} from "@/lib/transport-store";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function AdminStudentAssignmentPicker({ selectedIds, onChange, disabled }: Props) {
  const classes = useMemo(() => studentDirectoryClasses(), []);
  const [className, setClassName] = useState(classes[0] ?? "");
  const sections = useMemo(
    () => (className ? studentDirectorySections(className) : []),
    [className],
  );
  const [section, setSection] = useState(sections[0] ?? "");
  const students = useMemo(
    () => (className && section ? studentDirectoryFor(className, section) : []),
    [className, section],
  );
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const onClassChange = (next: string) => {
    setClassName(next);
    const nextSections = studentDirectorySections(next);
    setSection(nextSections[0] ?? "");
  };

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.has(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-medium text-muted-foreground">
          Class
          <Select
            fieldSize="md"
            className="mt-1 w-full text-xs"
            value={className}
            disabled={disabled}
            onChange={(e) => onClassChange(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Section
          <Select
            fieldSize="md"
            className="mt-1 w-full text-xs"
            value={section}
            disabled={disabled || sections.length === 0}
            onChange={(e) => setSection(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {students.map((s) => {
          const on = selected.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(s.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                on ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
              }`}
            >
              <span
                className={`size-4 rounded border text-center text-[9px] leading-4 ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{s.name}</span>
                <span className="ml-1 text-muted-foreground">{s.gradeLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {studentsByIds(selectedIds).map((s) => (
            <Button
              key={s.id}
              size="sm"
              type="button"
              disabled={disabled}
              onClick={() => toggle(s.id)}
            >
              {s.name} ×
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
