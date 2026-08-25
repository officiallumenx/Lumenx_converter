import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  GraduationCap,
  MapPin,
  Pencil,
  Save,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { TimetableWeekGrid } from "@/components/timetable/TimetableViews";
import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Field,
  Pill,
  SearchInput,
  Select,
  TextInput,
  Th,
} from "@lumenx/ui-admin";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  findClassSection,
  loadClassDirectory,
  saveClassDirectory,
  type ClassSection,
} from "@/lib/class-directory-store";
import {
  formatStudentGradeDisplay,
  matchesClassSection,
} from "@/lib/class-section-filter";
import {
  getStudentRollNo,
  loadStudentDirectory,
  sortStudentsByRollNo,
} from "@/lib/student-directory-store";
import { getInstituteTeachers, getSubjectCatalog } from "@/lib/subjects-data";
import { findTimetableForClass } from "@/lib/timetable-directory-store";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/classes/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — LumenX Admin` }] }),
  component: ClassDetailPage,
});

type StoredTeacher = {
  id: string;
  name: string;
  dept: string;
  qualification?: string;
  status?: "active" | "on-leave" | "pending";
  assignedSections?: string[];
};

type AssignedTeacher = StoredTeacher & {
  subjects: string[];
  assignmentSource: "Class teacher" | "Section assignment" | "Timetable" | "Subject assignment";
};

function loadStoredTeachers(): StoredTeacher[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEYS.teachers);
    return raw ? (JSON.parse(raw) as StoredTeacher[]) : [];
  } catch {
    return [];
  }
}

function loadAvailableTeachers(): StoredTeacher[] {
  const byId = new Map<string, StoredTeacher>();
  for (const teacher of getInstituteTeachers()) {
    byId.set(teacher.id, {
      id: teacher.id,
      name: teacher.name,
      dept: teacher.department,
      qualification: teacher.qualification,
      status: "active",
    });
  }
  for (const teacher of loadStoredTeachers()) byId.set(teacher.id, teacher);
  return [...byId.values()].filter((teacher) => teacher.status !== "pending");
}

function ClassDetailPage() {
  const { id } = Route.useParams();
  const notify = useAdminToast();
  const { profileId, profile } = useDemoProfile();
  const [classSection, setClassSection] = useState<ClassSection | null>(() =>
    findClassSection(id),
  );
  const [studentSearch, setStudentSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClassSection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setClassSection(findClassSection(id));
    setStudentSearch("");
    setEditing(false);
    setDraft(null);
    setError("");
  }, [id, profileId]);

  const teacherOptions = useMemo(
    () =>
      [...new Set([classSection?.teacher, ...loadStoredTeachers().map((teacher) => teacher.name)])]
        .filter((name): name is string => Boolean(name))
        .sort(),
    [classSection?.teacher],
  );
  const availableTeachers = useMemo(() => loadAvailableTeachers(), [profileId]);

  const startEdit = () => {
    if (!classSection) return;
    const level = profile.academic.levels.find((item) => item.id === classSection.levelId);
    const subjects = getSubjectCatalog().filter(
      (subject) => subject.status === "active" && subject.grades.includes(level?.label ?? ""),
    );
    const assignments = { ...(classSection.subjectTeacherAssignments ?? {}) };
    for (const subject of subjects) {
      if (!Object.prototype.hasOwnProperty.call(assignments, subject.id)) {
        assignments[subject.id] = subject.assignedTeacherIds[0] ?? "";
      }
    }
    setDraft({ ...classSection, subjectTeacherAssignments: assignments });
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setError("");
    setEditing(false);
  };

  const saveEdit = () => {
    if (!classSection || !draft) return;
    const capacity = Math.max(1, Number(draft.capacity) || 0);
    const students = Math.max(0, Number(draft.students) || 0);
    if (!draft.name.trim()) return setError("Class name is required.");
    if (!draft.room.trim()) return setError("Room number is required.");
    if (!draft.teacher.trim()) return setError("Class teacher is required.");
    if (students > capacity) return setError("Current students cannot exceed classroom capacity.");

    const updated: ClassSection = {
      ...draft,
      name: draft.name.trim(),
      room: draft.room.trim(),
      teacher: draft.teacher.trim(),
      students,
      capacity,
    };
    saveClassDirectory(
      loadClassDirectory().map((record) => (record.id === updated.id ? updated : record)),
    );
    setClassSection(updated);
    setDraft(null);
    setError("");
    setEditing(false);
    notify(`${updated.name} class details updated`);
  };

  const detail = useMemo(() => {
    if (!classSection) return null;
    const level = profile.academic.levels.find((item) => item.id === classSection.levelId);
    const classFilter = level?.shortLabel ?? classSection.levelId;
    const students = sortStudentsByRollNo(
      loadStudentDirectory().filter((student) =>
        matchesClassSection(
          student.grade,
          classFilter,
          classSection.section,
          classSection.departmentCode ?? "all",
        ),
      ),
    );
    const timetable =
      findTimetableForClass(classSection.timetableGrade, classSection.section) ?? null;
    const teachers = loadAvailableTeachers();
    const subjects = getSubjectCatalog().filter(
      (subject) => subject.status === "active" && subject.grades.includes(level?.label ?? ""),
    );
    const classKey = classSection.departmentCode
      ? `${classSection.departmentCode}-${classFilter}-${classSection.section}`
      : `${classFilter}-${classSection.section}`;

    const assignments = new Map<string, AssignedTeacher>();
    const addTeacher = (
      teacher: StoredTeacher,
      subjectNames: string[],
      assignmentSource: AssignedTeacher["assignmentSource"],
    ) => {
      const existing = assignments.get(teacher.id);
      assignments.set(teacher.id, {
        ...teacher,
        subjects: [...new Set([...(existing?.subjects ?? []), ...subjectNames])],
        assignmentSource:
          existing?.assignmentSource === "Class teacher"
            ? existing.assignmentSource
            : assignmentSource,
      });
    };

    const classTeacher =
      teachers.find((teacher) => teacher.name === classSection.teacher) ??
      ({
        id: `class-teacher-${classSection.id}`,
        name: classSection.teacher,
        dept: classSection.departmentName ?? "Class administration",
        status: "active",
      } satisfies StoredTeacher);
    addTeacher(classTeacher, [], "Class teacher");

    for (const teacher of teachers) {
      if (teacher.assignedSections?.some((section) => section.toUpperCase() === classKey.toUpperCase())) {
        addTeacher(teacher, [], "Section assignment");
      }
    }

    for (const subject of subjects) {
      const overrides = classSection.subjectTeacherAssignments ?? {};
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, subject.id);
      const teacherIds = hasOverride
        ? [overrides[subject.id]].filter((teacherId): teacherId is string => Boolean(teacherId))
        : subject.assignedTeacherIds;
      for (const teacherId of teacherIds) {
        const teacher = teachers.find((item) => item.id === teacherId);
        if (teacher) addTeacher(teacher, [subject.name], "Subject assignment");
      }
    }

    if (timetable) {
      for (const slot of timetable.grid.flat()) {
        if (!slot) continue;
        const teacher =
          teachers.find((item) => item.id === slot.teacherId || item.name === slot.teacher) ??
          ({
            id: slot.teacherId || `tt-${slot.teacher}`,
            name: slot.teacher,
            dept: slot.subject,
            status: "active",
          } satisfies StoredTeacher);
        addTeacher(teacher, [slot.subject], "Timetable");
      }
    }

    return {
      levelLabel: level?.label ?? classSection.timetableGrade,
      students,
      timetable,
      teachers: [...assignments.values()],
      subjects,
    };
  }, [classSection, profile.academic.levels]);

  const visibleStudents = useMemo(() => {
    if (!detail) return [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return detail.students;
    return detail.students.filter((student) => {
      const roll = getStudentRollNo(student).toLowerCase();
      return (
        student.name.toLowerCase().includes(q) ||
        roll.includes(q) ||
        student.id.toLowerCase().includes(q)
      );
    });
  }, [detail, studentSearch]);

  if (!classSection || !detail) {
    return (
      <AppShell title="Class not found" subtitle={id}>
        <Card className="p-8 text-center">
          <p className="text-sm">This class or section is not available.</p>
          <Link
            to="/classes"
            className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Return to {M.classes}
          </Link>
        </Card>
      </AppShell>
    );
  }

  const fill = Math.round((classSection.students / classSection.capacity) * 100);

  return (
    <AppShell
      title={classSection.name}
      subtitle={`${detail.levelLabel} · Section ${classSection.section}`}
      actions={
        <>
          {editing ? (
            <>
              <Button onClick={cancelEdit}>
                <X className="size-3.5" /> Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                <Save className="size-3.5" /> Save
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit class
            </Button>
          )}
          {detail.timetable && (
            <Link
              to="/timetable"
              search={{
                id: detail.timetable.id,
                createGrade: undefined,
                createSection: undefined,
                openCreate: undefined,
              }}
            >
              <Button>
                <CalendarDays className="size-3.5" /> Manage timetable
              </Button>
            </Link>
          )}
          <Link
            to="/classes"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-xs font-medium hover:bg-surface-hover"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </>
      }
    >
      {editing && draft && (
        <Card className="mb-5">
          <CardHeader
            title="Edit class details"
            hint="Update the class name, room, teacher, student count, and capacity"
          />
          <div className="grid gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 lg:grid-cols-5 sm:px-6 sm:pb-6">
            <Field label="Class name" required>
              <TextInput
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Room number" required>
              <TextInput
                value={draft.room}
                onChange={(event) => setDraft({ ...draft, room: event.target.value })}
                placeholder="Block A-101"
              />
            </Field>
            <Field
              label={profile.academic.mode === "college" ? "Faculty advisor" : "Class teacher"}
              required
            >
              <Select
                value={draft.teacher}
                onChange={(event) => setDraft({ ...draft, teacher: event.target.value })}
              >
                {teacherOptions.map((teacher) => (
                  <option key={teacher}>{teacher}</option>
                ))}
              </Select>
            </Field>
            <Field label="Current students" required>
              <TextInput
                type="number"
                min={0}
                value={draft.students}
                onChange={(event) =>
                  setDraft({ ...draft, students: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Classroom capacity" required>
              <TextInput
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(event) =>
                  setDraft({ ...draft, capacity: Number(event.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <div className="border-t border-border px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="mb-3">
              <div className="text-xs font-semibold">Subject teachers</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Choose the teacher responsible for each subject in this class.
              </div>
            </div>
            {detail.subjects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detail.subjects.map((subject) => (
                  <Field key={subject.id} label={`${subject.name} · ${subject.code}`}>
                    <Select
                      value={draft.subjectTeacherAssignments?.[subject.id] ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          subjectTeacherAssignments: {
                            ...(draft.subjectTeacherAssignments ?? {}),
                            [subject.id]: event.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {availableTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} · {teacher.dept}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active subjects are offered for this class level.
              </p>
            )}
          </div>
          {error && (
            <div className="mx-5 mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:mx-6 sm:mb-6">
              {error}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<MapPin className="size-4" />}
          label="Room number"
          value={classSection.room}
        />
        <SummaryCard
          icon={<UserRound className="size-4" />}
          label={profile.academic.mode === "college" ? "Faculty advisor" : "Class teacher"}
          value={classSection.teacher}
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Students"
          value={`${classSection.students} / ${classSection.capacity}`}
          hint={`${detail.students.length} linked records · ${fill}% of capacity`}
        />
        <SummaryCard
          icon={<Building2 className="size-4" />}
          label={profile.academic.mode === "college" ? "Department" : "Class status"}
          value={classSection.departmentName ?? (fill >= 100 ? "Full" : "Open")}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={`Students (${detail.students.length})`}
            hint="Ordered by roll number · search by name or roll no"
            action={<Users className="size-4 text-muted-foreground" />}
          />
          {detail.students.length > 0 ? (
            <>
              <div className="px-5 pb-3 sm:px-6">
                <SearchInput
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search name or roll…"
                  aria-label="Search students by name or roll number"
                  className="max-w-[14rem] sm:max-w-[16rem]"
                  fieldSize="compact"
                />
              </div>
              {visibleStudents.length > 0 ? (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Roll</Th>
                      <Th>Student</Th>
                      <Th>Class</Th>
                      <Th>Attendance</Th>
                      <Th>GPA</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-surface-hover">
                        <td className="px-5 py-3 text-xs font-mono font-medium">
                          {getStudentRollNo(student)}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            to="/students/$id"
                            params={{ id: student.id }}
                            className="block hover:text-primary"
                          >
                            <div className="text-xs font-medium">{student.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {student.id}
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {formatStudentGradeDisplay(student.grade)}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono">{student.attendance}%</td>
                        <td className="px-5 py-3 text-xs font-mono">{student.gpa.toFixed(1)}</td>
                        <td className="px-5 py-3">
                          {student.accessStatus === "hold" ? (
                            <Pill tone="warning">Hold</Pill>
                          ) : student.accessStatus === "suspended" ? (
                            <Pill tone="danger">Suspended</Pill>
                          ) : student.status === "at-risk" ? (
                            <Pill tone="danger">At risk</Pill>
                          ) : student.status === "watch" ? (
                            <Pill tone="warning">Needs attention</Pill>
                          ) : (
                            <Pill tone="success">Active</Pill>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <div className="px-5 pb-6 pt-2 text-xs text-muted-foreground">
                  No students match “{studentSearch.trim()}”.
                </div>
              )}
            </>
          ) : (
            <div className="px-5 pb-6 pt-5 text-xs text-muted-foreground">
              No student directory records are assigned to this class yet.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Assigned teachers (${detail.teachers.length})`}
            hint="Class, subject, section, and timetable assignments"
            action={<GraduationCap className="size-4 text-muted-foreground" />}
          />
          <div className="divide-y divide-border px-5 pb-2 sm:px-6">
            {detail.teachers.map((teacher) => (
              <div key={teacher.id} className="py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold">{teacher.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {teacher.dept || "Faculty"} · {teacher.assignmentSource}
                    </div>
                  </div>
                  {teacher.status && (
                    <Pill tone={teacher.status === "active" ? "success" : "warning"}>
                      {teacher.status}
                    </Pill>
                  )}
                </div>
                {teacher.subjects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {teacher.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="rounded border border-border bg-accent px-2 py-0.5 text-[10px]"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Class timetable"
          hint={
            detail.timetable
              ? `${detail.timetable.term} · ${detail.timetable.status}`
              : "No timetable has been created for this class"
          }
          action={
            detail.timetable ? (
              <Pill tone={detail.timetable.status === "published" ? "success" : "warning"}>
                {detail.timetable.status}
              </Pill>
            ) : (
              <Pill tone="neutral">Not created</Pill>
            )
          }
        />
        {detail.timetable ? (
          <div className="pointer-events-none px-4 pb-5 pt-4 sm:px-5">
            <TimetableWeekGrid
              grid={detail.timetable.grid}
              schedule={detail.timetable.schedule}
              onEdit={() => undefined}
              slotHasConflict={() => false}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-6 pt-5 sm:px-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="size-4" />
              Create a timetable to assign periods, subjects, teachers, and rooms.
            </div>
            <Link
              to="/timetable"
              search={{
                id: undefined,
                openCreate: true,
                createGrade: classSection.timetableGrade,
                createSection: classSection.section,
              }}
            >
              <Button>Create timetable</Button>
            </Link>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
