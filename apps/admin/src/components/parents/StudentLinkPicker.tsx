import { useEffect, useMemo, useState } from "react";
import { Field, SearchInput, Select } from "@lumenx/ui-admin";
import { listStudents, studentDtosToListItems, type StudentListItem } from "@/lib/students";

type StudentLinkPickerProps = {
  instituteId: string;
  value: string;
  onChange: (studentId: string) => void;
  excludeIds?: string[];
  disabled?: boolean;
  label?: string;
};

export function StudentLinkPicker({
  instituteId,
  value,
  onChange,
  excludeIds = [],
  disabled = false,
  label = "Student",
}: StudentLinkPickerProps) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listStudents({ instituteId })
      .then((dtos) => studentDtosToListItems(dtos))
      .then((rows) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const options = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return students
      .filter((student) => !excluded.has(student.id))
      .filter((student) => {
        if (!needle) return true;
        const hay = [
          student.name,
          student.grade,
          student.admissionNumber,
          student.rollNo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, excluded, search]);

  return (
    <div className="space-y-2">
      <Field label={label}>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={loading ? "Loading students…" : "Search name, class, admission #…"}
          disabled={disabled || loading}
        />
      </Field>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading || options.length === 0}
      >
        <option value="">
          {loading ? "Loading students…" : options.length === 0 ? "No students found" : "Select student…"}
        </option>
        {options.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} · {student.grade}
            {student.admissionNumber ? ` · ${student.admissionNumber}` : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}

type StudentMultiLinkPickerProps = {
  instituteId: string;
  values: string[];
  onChange: (studentIds: string[]) => void;
  disabled?: boolean;
};

export function StudentMultiLinkPicker({
  instituteId,
  values,
  onChange,
  disabled = false,
}: StudentMultiLinkPickerProps) {
  const [pickId, setPickId] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listStudents({ instituteId })
      .then((dtos) => studentDtosToListItems(dtos))
      .then((rows) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const addStudent = () => {
    const id = pickId.trim();
    if (!id || values.includes(id)) return;
    onChange([...values, id]);
    setPickId("");
  };

  const removeStudent = (id: string) => {
    onChange(values.filter((value) => value !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <StudentLinkPicker
            instituteId={instituteId}
            value={pickId}
            onChange={setPickId}
            excludeIds={values}
            disabled={disabled}
            label="Link child"
          />
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          onClick={addStudent}
          disabled={disabled || !pickId}
        >
          Add child
        </button>
      </div>
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {values.map((id) => {
            const student = studentById.get(id);
            const label = student
              ? `${student.name} (${student.grade})`
              : `${id.slice(0, 8)}…`;
            return (
            <li
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs"
            >
              <span>{label}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => removeStudent(id)}
                disabled={disabled}
                aria-label="Remove linked student"
              >
                ×
              </button>
            </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No children linked yet.</p>
      )}
    </div>
  );
}
