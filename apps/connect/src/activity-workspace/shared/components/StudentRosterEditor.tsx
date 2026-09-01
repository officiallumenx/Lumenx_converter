import { useEffect, useMemo, useState } from "react";
import { Users, UserPlus, X } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { listStudents } from "@/lib/students/api";
import { teacherRepository } from "@/lib/teacher/repositories";
import type { TeacherStudent } from "@/lib/teacher/types";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivitySearchField } from "@/activity-workspace/shared/ui/ActivitySearchField";
import type { HierarchyStudent } from "@/lib/activity/hierarchy";

type Props = {
  students: HierarchyStudent[];
  onChange: (students: HierarchyStudent[]) => void;
  unitLabel?: string;
};

function toHierarchyStudent(s: TeacherStudent): HierarchyStudent {
  return {
    id: s.id,
    name: s.name,
    rollNo: s.roll,
    classLabel: `${s.className}-${s.section}`,
  };
}

function apiStudentToTeacherStudent(row: {
  id: string;
  displayName: string;
  classLabel: string | null;
  sectionLabel: string | null;
  rollNo: string | null;
}): TeacherStudent {
  const className = row.classLabel ?? "—";
  const section = row.sectionLabel ?? "—";
  return {
    id: row.id,
    name: row.displayName,
    roll: row.rollNo ?? "—",
    classId: `${className}-${section}`,
    className,
    section,
    attendancePct: 0,
    homeworkSubmissionPct: 0,
    avgScore: 0,
    grade: "—",
    avatarInitials: row.displayName.slice(0, 2).toUpperCase(),
  };
}

/** Add students to a Sports team or ECA group — institute roster filtered by class and section. */
export function StudentRosterEditor({ students, onChange, unitLabel = "unit" }: Props) {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [instituteRoster, setInstituteRoster] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void (async () => {
      if (apiMode && activeInstituteId) {
        const rows = await listStudents({ instituteId: activeInstituteId, status: "active" });
        const roster = rows.map(apiStudentToTeacherStudent);
        const classes = [...new Set(roster.map((s) => s.className))].sort();
        setClassNames(classes);
        setInstituteRoster(roster);
        setLoading(false);
        return;
      }
      const [classes, roster] = await Promise.all([
        teacherRepository.getInstituteClassNames(),
        teacherRepository.getStudents(),
      ]);
      setClassNames(classes);
      setInstituteRoster(roster);
      setLoading(false);
    })();
  }, [apiMode, activeInstituteId]);

  useEffect(() => {
    if (!classFilter) {
      setSections([]);
      setSectionFilter("");
      setSelectedIds([]);
      setSearch("");
      return;
    }
    if (apiMode) {
      const secs = [
        ...new Set(
          instituteRoster.filter((s) => s.className === classFilter).map((s) => s.section),
        ),
      ].sort();
      setSections(secs);
    } else {
      void teacherRepository.getInstituteSections(classFilter).then(setSections);
    }
    setSectionFilter("");
    setSelectedIds([]);
    setSearch("");
  }, [classFilter, apiMode, instituteRoster]);

  const rosterIds = useMemo(() => new Set(students.map((s) => s.id)), [students]);

  useEffect(() => {
    setSelectedIds([]);
    setSearch("");
  }, [sectionFilter]);

  const availableInSection = useMemo(() => {
    if (!classFilter || !sectionFilter) return [];
    let list = instituteRoster.filter(
      (s) =>
        s.className === classFilter &&
        s.section === sectionFilter &&
        !rosterIds.has(s.id),
    );
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.roll.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) =>
      a.roll.localeCompare(b.roll, undefined, { numeric: true }),
    );
  }, [instituteRoster, classFilter, sectionFilter, rosterIds, search]);

  const filtersReady = Boolean(classFilter && sectionFilter);

  const selectedStudents = useMemo(() => {
    if (!filtersReady || selectedIds.length === 0) return [];
    const selectedSet = new Set(selectedIds);
    return instituteRoster
      .filter(
        (s) =>
          s.className === classFilter &&
          s.section === sectionFilter &&
          selectedSet.has(s.id) &&
          !rosterIds.has(s.id),
      )
      .sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));
  }, [filtersReady, selectedIds, instituteRoster, classFilter, sectionFilter, rosterIds]);

  const togglePick = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addSelected = () => {
    if (selectedStudents.length === 0) return;
    onChange([...students, ...selectedStudents.map(toHierarchyStudent)]);
    setSelectedIds([]);
    setSearch("");
  };

  const remove = (id: string) => {
    onChange(students.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Students on this {unitLabel}
        </h3>
        {students.length === 0 ? (
          <ActivityEmptyState
            icon={Users}
            title={`No students on this ${unitLabel}`}
            description="Pick a class and section below, then add students to this roster."
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="activity-list-row flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft"
              >
                <div className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
                    {s.classLabel} · Roll {s.rollNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="activity-panel space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Add students</p>

        {filtersReady ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr]">
              <div>
                <p className="activity-stat-label mb-2">Class</p>
                <Select
                  value={classFilter || undefined}
                  onValueChange={setClassFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="min-h-11 rounded-xl">
                    <SelectValue placeholder={loading ? "Loading…" : "Select class"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="activity-stat-label mb-2">Section</p>
                <Select
                  value={sectionFilter || undefined}
                  onValueChange={setSectionFilter}
                  disabled={!classFilter || sections.length === 0}
                >
                  <SelectTrigger className="min-h-11 rounded-xl">
                    <SelectValue
                      placeholder={
                        !classFilter
                          ? "Select class first"
                          : sections.length === 0
                            ? "No sections"
                            : "Select section"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="activity-stat-label mb-2">Students</p>
                <ActivitySearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or roll no."
                />
              </div>
            </div>

            {selectedStudents.length > 0 ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-500/5 p-3">
                <p className="text-xs font-medium text-emerald-900/90">
                  Selected ({selectedStudents.length}) · {classFilter}-{sectionFilter}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => togglePick(s.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
                      title="Remove from selection"
                    >
                      {s.name}
                      <span className="text-emerald-900/60">·</span>
                      Roll {s.roll}
                      <X className="ml-0.5 size-3.5 text-emerald-700" aria-hidden />
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    className="activity-primary-action w-full rounded-xl sm:w-auto"
                    onClick={addSelected}
                  >
                    Add selected
                  </Button>
                </div>
              </div>
            ) : null}

            {availableInSection.length === 0 ? (
              <ActivityEmptyState
                compact
                icon={Users}
                title={
                  search.trim()
                    ? "No matches in this class-section"
                    : "Everyone in this class-section is already on the roster"
                }
              />
            ) : (
              <>
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/80 bg-muted/10 p-2">
                  {availableInSection.map((s) => (
                    <li
                      key={s.id}
                      className={
                        selectedIds.includes(s.id)
                          ? "flex min-h-11 items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-500/10 px-3 py-2 text-sm shadow-soft"
                          : "flex min-h-11 items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-sm shadow-soft"
                      }
                    >
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Roll {s.roll} · {s.className}-{s.section}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={
                          selectedIds.includes(s.id)
                            ? "shrink-0 rounded-lg border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
                            : "shrink-0 rounded-lg"
                        }
                        onClick={() => togglePick(s.id)}
                      >
                        <UserPlus className="size-3.5" aria-hidden />
                        {selectedIds.includes(s.id) ? "Selected" : "Select"}
                      </Button>
                    </li>
                  ))}
                </ul>
                {selectedStudents.length === 0 && availableInSection.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tap a student to select (green). Tap again to unselect.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="activity-stat-label mb-2">Class</p>
              <Select
                value={classFilter || undefined}
                onValueChange={setClassFilter}
                disabled={loading}
              >
                <SelectTrigger className="min-h-11 rounded-xl">
                  <SelectValue placeholder={loading ? "Loading…" : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="activity-stat-label mb-2">Section</p>
              <Select
                value={sectionFilter || undefined}
                onValueChange={setSectionFilter}
                disabled={!classFilter || sections.length === 0}
              >
                <SelectTrigger className="min-h-11 rounded-xl">
                  <SelectValue
                    placeholder={
                      !classFilter
                        ? "Select class first"
                        : sections.length === 0
                          ? "No sections"
                          : "Select section"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      Section {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
