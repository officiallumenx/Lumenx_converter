import { Button, Field, Select, TextInput } from "@lumenx/ui-admin";
import { useMemo, useState } from "react";
import { SEARCH_TEACHERS } from "@/lib/admin-search-data";
import {
  getClassFilterOptions,
  getSectionFilterOptions,
  matchesClassSection,
} from "@/lib/class-section-filter";
import { isCollegeMode } from "@/lib/academic-data";
import {
  getStudentRollNo,
  loadStudentDirectory,
  sortStudentsByRollNo,
} from "@/lib/student-directory-store";

export type BroadcastRole = "All" | "Students" | "Parents" | "Teachers";
export type BroadcastMode = "all" | "selective";

export type BroadcastAudienceValue = {
  role: BroadcastRole;
  mode: BroadcastMode;
  classFilter: string;
  section: string;
  studentId: string;
  rollNo: string;
  name: string;
  teacherIds: string[];
};

export const EMPTY_BROADCAST_AUDIENCE: BroadcastAudienceValue = {
  role: "All",
  mode: "all",
  classFilter: "",
  section: "",
  studentId: "",
  rollNo: "",
  name: "",
  teacherIds: [],
};

export function formatBroadcastAudience(v: BroadcastAudienceValue): string {
  if (v.role === "All") return "Everyone";
  if (v.mode === "all") return `All ${v.role}`;

  if (v.role === "Teachers") {
    if (v.teacherIds.length === 0) return "Teachers · none selected";
    const names = SEARCH_TEACHERS.filter((t) => v.teacherIds.includes(t.id)).map((t) => t.name);
    return `Teachers · ${names.join(", ")}`;
  }

  const parts: string[] = [v.role, "selective"];
  if (v.classFilter) parts.push(`Class ${v.classFilter}`);
  if (v.section) parts.push(`Sec ${v.section}`);
  if (v.rollNo.trim()) parts.push(`Roll ${v.rollNo.trim()}`);
  if (v.name.trim()) parts.push(v.name.trim());
  return parts.join(" · ");
}

export function isBroadcastAudienceValid(v: BroadcastAudienceValue): boolean {
  if (v.role === "All" || v.mode === "all") return true;
  if (v.role === "Teachers") return v.teacherIds.length > 0;
  return v.classFilter.trim().length > 0 && v.section.trim().length > 0;
}

type Props = {
  value: BroadcastAudienceValue;
  onChange: (next: BroadcastAudienceValue) => void;
  required?: boolean;
  hint?: string;
};

export function BroadcastAudiencePicker({ value, onChange, required, hint }: Props) {
  const college = isCollegeMode();
  const classOptions = useMemo(() => [...getClassFilterOptions()], []);
  const sectionOptions = useMemo(() => [...getSectionFilterOptions()], []);
  const [teacherQ, setTeacherQ] = useState("");

  const patch = (partial: Partial<BroadcastAudienceValue>) =>
    onChange({ ...value, ...partial });

  const clearStudent = () => ({ studentId: "", rollNo: "", name: "" });

  const showMode = value.role === "Students" || value.role === "Parents" || value.role === "Teachers";
  const showLearnerSelective =
    (value.role === "Students" || value.role === "Parents") && value.mode === "selective";
  const showTeacherSelective = value.role === "Teachers" && value.mode === "selective";
  const showStudentFields =
    showLearnerSelective && value.classFilter.trim().length > 0 && value.section.trim().length > 0;

  const sectionStudents = useMemo(() => {
    if (!showStudentFields) return [];
    const rows = loadStudentDirectory().filter((s) =>
      matchesClassSection(s.grade, value.classFilter, value.section),
    );
    return sortStudentsByRollNo(rows);
  }, [showStudentFields, value.classFilter, value.section]);

  const filteredTeachers = useMemo(() => {
    const q = teacherQ.trim().toLowerCase();
    if (!q) return SEARCH_TEACHERS;
    return SEARCH_TEACHERS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.dept.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q),
    );
  }, [teacherQ]);

  return (
    <div className="space-y-3">
      <Field label="Audience" required={required} hint={hint}>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["All", "Students", "Parents", "Teachers"] as const).map((role) => {
            const active = value.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() =>
                  patch({
                    role,
                    mode: role === "All" ? "all" : value.mode,
                    classFilter: "",
                    section: "",
                    ...clearStudent(),
                    teacherIds: role === "Teachers" ? value.teacherIds : [],
                  })
                }
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </Field>

      {showMode ? (
        <Field label={`${value.role} · scope`} required>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                patch({
                  mode: "all",
                  classFilter: "",
                  section: "",
                  ...clearStudent(),
                  teacherIds: [],
                })
              }
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                value.mode === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              All {value.role.toLowerCase()}
            </button>
            <button
              type="button"
              onClick={() => patch({ mode: "selective" })}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                value.mode === "selective"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              Selective
            </button>
          </div>
        </Field>
      ) : null}

      {showLearnerSelective ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={college ? "Year / batch" : "Class"} required>
              <Select
                value={value.classFilter}
                onChange={(e) =>
                  patch({
                    classFilter: e.target.value,
                    ...clearStudent(),
                  })
                }
              >
                <option value="">Select class</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section" required>
              <Select
                value={value.section}
                onChange={(e) =>
                  patch({
                    section: e.target.value,
                    ...clearStudent(),
                  })
                }
                disabled={!value.classFilter}
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {showStudentFields ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Student" hint="Optional">
                <Select
                  value={value.studentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const student = sectionStudents.find((s) => s.id === id);
                    if (!student) {
                      patch(clearStudent());
                      return;
                    }
                    patch({
                      studentId: student.id,
                      rollNo: getStudentRollNo(student),
                      name:
                        value.role === "Parents"
                          ? student.parentName || student.name
                          : student.name,
                    });
                  }}
                >
                  <option value="">Select student</option>
                  {sectionStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {`Roll ${getStudentRollNo(s)} · ${s.name}`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Roll no" hint="Optional">
                <TextInput
                  value={value.rollNo}
                  onChange={(e) => patch({ rollNo: e.target.value })}
                  placeholder="e.g. 12"
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {showTeacherSelective ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {value.teacherIds.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => patch({ teacherIds: SEARCH_TEACHERS.map((t) => t.id) })}
              >
                Select all
              </Button>
              <Button size="sm" variant="outline" onClick={() => patch({ teacherIds: [] })}>
                Clear
              </Button>
            </div>
          </div>
          <TextInput
            value={teacherQ}
            onChange={(e) => setTeacherQ(e.target.value)}
            placeholder="Search teachers…"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-1">
            {filteredTeachers.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No teachers found</p>
            ) : (
              filteredTeachers.map((t) => {
                const checked = value.teacherIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      checked ? "bg-primary/10 text-foreground" : "hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        patch({
                          teacherIds: checked
                            ? value.teacherIds.filter((id) => id !== t.id)
                            : [...value.teacherIds, t.id],
                        })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{t.name}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {t.dept} · {t.employeeId}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
