import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Pencil,
  Save,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  loadClassDirectory,
  saveClassDirectory,
  type ClassSection,
} from "@/lib/class-directory-store";
import {
  SUBJECT_CATEGORIES,
  deleteSubject,
  getGrades,
  getInstituteTeachers,
  getSubjectById,
  getSubjectCatalog,
  updateSubject,
  type InstituteTeacher,
  type SubjectCatalogItem,
} from "@/lib/subjects-data";

export const Route = createFileRoute("/subjects/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — LumenX Admin` }] }),
  component: SubjectDetailPage,
});

type SubjectDraft = SubjectCatalogItem;
type ClassAssignments = Record<string, string>;

function SubjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const notify = useAdminToast();
  const { profileId, profile } = useDemoProfile();
  const [subject, setSubject] = useState<SubjectCatalogItem | null>(() => getSubjectById(id));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SubjectDraft | null>(null);
  const [classAssignments, setClassAssignments] = useState<ClassAssignments>({});
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const teachers = useMemo(() => getInstituteTeachers(), [subject, profileId]);
  const classes = useMemo(() => loadClassDirectory(), [subject, profileId]);
  const grades = useMemo(() => [...getGrades()], [profileId]);

  useEffect(() => {
    setSubject(getSubjectById(id));
    setEditing(false);
    setDraft(null);
    setClassAssignments({});
    setError("");
  }, [id, profileId]);

  const levelLabelForClass = (classSection: ClassSection) =>
    profile.academic.levels.find((level) => level.id === classSection.levelId)?.label ??
    classSection.timetableGrade;

  const eligibleClasses = useMemo(
    () =>
      classes.filter((classSection) =>
        subject?.grades.includes(levelLabelForClass(classSection)),
      ),
    [classes, subject, profile.academic.levels],
  );

  const effectiveTeacherId = (classSection: ClassSection, source = subject) => {
    if (!source) return "";
    const overrides = classSection.subjectTeacherAssignments ?? {};
    return Object.prototype.hasOwnProperty.call(overrides, source.id)
      ? overrides[source.id] ?? ""
      : source.assignedTeacherIds[0] ?? "";
  };

  const teacherClasses = useMemo(() => {
    if (!subject) return new Map<string, ClassSection[]>();
    const map = new Map<string, ClassSection[]>();
    for (const classSection of eligibleClasses) {
      const teacherId = effectiveTeacherId(classSection, subject);
      if (!teacherId) continue;
      map.set(teacherId, [...(map.get(teacherId) ?? []), classSection]);
    }
    return map;
  }, [eligibleClasses, subject]);

  const displayedTeachers = useMemo(() => {
    if (!subject) return [];
    const ids = new Set(subject.assignedTeacherIds);
    teacherClasses.forEach((_classes, teacherId) => ids.add(teacherId));
    return teachers.filter((teacher) => ids.has(teacher.id));
  }, [subject, teacherClasses, teachers]);

  const startEdit = () => {
    if (!subject) return;
    const assignments: ClassAssignments = {};
    for (const classSection of classes) {
      assignments[classSection.id] = effectiveTeacherId(classSection, subject);
    }
    setDraft({
      ...subject,
      grades: [...subject.grades],
      assignedTeacherIds: [...subject.assignedTeacherIds],
    });
    setClassAssignments(assignments);
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setClassAssignments({});
    setError("");
  };

  const toggleGrade = (grade: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      grades: draft.grades.includes(grade)
        ? draft.grades.filter((item) => item !== grade)
        : [...draft.grades, grade],
    });
  };

  const toggleTeacher = (teacherId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      assignedTeacherIds: draft.assignedTeacherIds.includes(teacherId)
        ? draft.assignedTeacherIds.filter((id) => id !== teacherId)
        : [...draft.assignedTeacherIds, teacherId],
    });
  };

  const saveEdit = () => {
    if (!subject || !draft) return;
    const name = draft.name.trim();
    const code = draft.code.trim().toUpperCase();
    if (!name) return setError("Subject name is required.");
    if (!code) return setError("Subject code is required.");
    if (draft.grades.length === 0) return setError("Select at least one grade or year.");
    if (
      getSubjectCatalog().some(
        (item) => item.id !== subject.id && item.code.toLowerCase() === code.toLowerCase(),
      )
    ) {
      return setError("Another subject already uses this subject code.");
    }

    const updated = updateSubject(subject.id, {
      name,
      code,
      category: draft.category,
      periodsPerWeek: Math.max(1, Number(draft.periodsPerWeek) || 1),
      grades: draft.grades,
      assignedTeacherIds: draft.assignedTeacherIds,
      status: draft.status,
    });
    if (!updated) return setError("The subject could not be updated.");

    saveClassDirectory(
      classes.map((classSection) => {
        const assignments = { ...(classSection.subjectTeacherAssignments ?? {}) };
        const eligible = updated.grades.includes(levelLabelForClass(classSection));
        if (eligible) assignments[updated.id] = classAssignments[classSection.id] ?? "";
        else delete assignments[updated.id];
        return { ...classSection, subjectTeacherAssignments: assignments };
      }),
    );
    setSubject(updated);
    setEditing(false);
    setDraft(null);
    setClassAssignments({});
    setError("");
    notify(`${updated.name} subject details updated`);
  };

  const confirmDelete = () => {
    if (!subject) return;
    deleteSubject(subject.id);
    saveClassDirectory(
      classes.map((classSection) => {
        const assignments = { ...(classSection.subjectTeacherAssignments ?? {}) };
        delete assignments[subject.id];
        return { ...classSection, subjectTeacherAssignments: assignments };
      }),
    );
    notify(`${subject.name} deleted`);
    navigate({ to: "/subjects" });
  };

  if (!subject) {
    return (
      <AppShell title="Subject not found" subtitle={id}>
        <Card className="p-8 text-center">
          <p className="text-sm">This subject is not available.</p>
          <Link
            to="/subjects"
            className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Return to Subjects
          </Link>
        </Card>
      </AppShell>
    );
  }

  const editingClasses = classes.filter((classSection) =>
    draft?.grades.includes(levelLabelForClass(classSection)),
  );

  return (
    <AppShell
      title={subject.name}
      subtitle={`${subject.code} · ${subject.category}`}
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
            <>
              <Button variant="primary" onClick={startEdit}>
                <Pencil className="size-3.5" /> Edit subject
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </>
          )}
          <Link
            to="/subjects"
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
            title="Edit subject details"
            hint="Update subject information, teachers, grades, and class assignments"
          />
          <div className="grid gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 sm:pb-6">
            <Field label="Subject name" required>
              <TextInput
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Subject code" required>
              <TextInput
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {SUBJECT_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Field label="Periods per week">
              <TextInput
                type="number"
                min={1}
                max={12}
                value={draft.periodsPerWeek}
                onChange={(event) =>
                  setDraft({ ...draft, periodsPerWeek: Number(event.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as SubjectCatalogItem["status"],
                  })
                }
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label={profile.academic.mode === "college" ? "Years" : "Grades"} required>
                <div className="flex flex-wrap gap-2 pt-1">
                  {grades.map((grade) => (
                    <label
                      key={grade}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                        draft.grades.includes(grade)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={draft.grades.includes(grade)}
                        onChange={() => toggleGrade(grade)}
                      />
                      {grade}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <div className="border-t border-border px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="mb-3 text-xs font-semibold">Assigned teachers</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => {
                const checked = draft.assignedTeacherIds.includes(teacher.id);
                return (
                  <label
                    key={teacher.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      checked ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggleTeacher(teacher.id)}
                    />
                    <span>
                      <span className="block text-xs font-medium">{teacher.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {teacher.department}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="mb-3">
              <div className="text-xs font-semibold">Teacher classes</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Choose who teaches this subject in each eligible class and section.
              </div>
            </div>
            {editingClasses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {editingClasses.map((classSection) => (
                  <Field key={classSection.id} label={classSection.name}>
                    <Select
                      value={classAssignments[classSection.id] ?? ""}
                      onChange={(event) =>
                        setClassAssignments({
                          ...classAssignments,
                          [classSection.id]: event.target.value,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} · {teacher.department}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a grade or year to assign teachers to classes.
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
        <SummaryCard icon={<BookOpen className="size-4" />} label="Subject code" value={subject.code} />
        <SummaryCard
          icon={<CalendarDays className="size-4" />}
          label="Periods per week"
          value={String(subject.periodsPerWeek)}
        />
        <SummaryCard
          icon={<GraduationCap className="size-4" />}
          label={profile.academic.mode === "college" ? "Years" : "Grades"}
          value={subject.grades.join(", ")}
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Assigned teachers"
          value={String(displayedTeachers.length)}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={`Assigned teachers (${displayedTeachers.length})`}
            hint="Global and class-specific subject assignments"
            action={<UserRound className="size-4 text-muted-foreground" />}
          />
          {displayedTeachers.length > 0 ? (
            <div className="divide-y divide-border px-5 pb-2 sm:px-6">
              {displayedTeachers.map((teacher) => (
                <TeacherAssignmentRow
                  key={teacher.id}
                  teacher={teacher}
                  classes={teacherClasses.get(teacher.id) ?? []}
                  globallyAssigned={subject.assignedTeacherIds.includes(teacher.id)}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-6 pt-5 text-xs text-muted-foreground sm:px-6">
              No teachers are assigned to this subject.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Grades & classes (${eligibleClasses.length})`}
            hint={`${subject.grades.length} ${profile.academic.mode === "college" ? "years" : "grades"} offering this subject`}
            action={<GraduationCap className="size-4 text-muted-foreground" />}
          />
          <div className="flex flex-wrap gap-2 px-5 pt-5 sm:px-6">
            {subject.grades.map((grade) => (
              <Pill key={grade} tone="info">{grade}</Pill>
            ))}
          </div>
          <div className="grid gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {eligibleClasses.map((classSection) => {
              const teacherId = effectiveTeacherId(classSection, subject);
              const teacher = teachers.find((item) => item.id === teacherId);
              return (
                <Link
                  key={classSection.id}
                  to="/classes/$id"
                  params={{ id: classSection.id }}
                  className="rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold">{classSection.name}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        Room {classSection.room} · {classSection.students} students
                      </div>
                    </div>
                    <Pill tone={teacher ? "success" : "warning"}>
                      {teacher?.name ?? "Unassigned"}
                    </Pill>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete subject?"
        subtitle={`This permanently removes ${subject.name} (${subject.code}).`}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="size-3.5" /> Delete subject
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Teacher and class assignments for this subject will also be cleared.
        </p>
      </Modal>
    </AppShell>
  );
}

function TeacherAssignmentRow({
  teacher,
  classes,
  globallyAssigned,
}: {
  teacher: InstituteTeacher;
  classes: ClassSection[];
  globallyAssigned: boolean;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold">{teacher.name}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {teacher.department} · {teacher.qualification}
          </div>
        </div>
        <Pill tone={globallyAssigned ? "info" : "neutral"}>
          {globallyAssigned ? "Subject teacher" : "Class assignment"}
        </Pill>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {classes.length > 0 ? (
          classes.map((classSection) => (
            <Link
              key={classSection.id}
              to="/classes/$id"
              params={{ id: classSection.id }}
              className="rounded border border-border bg-accent px-2 py-1 text-[10px] hover:border-primary/40"
            >
              {classSection.name}
            </Link>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground">No class-specific assignment</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </Card>
  );
}
