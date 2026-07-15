import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  collegeTimetableGrade,
  getClassGroups,
  getDepartmentById,
  getLevelLabelById,
  isCollegeMode,
} from "@/lib/academic-data";

export const Route = createFileRoute("/classes")({
  head: () => ({ meta: [{ title: "Classes — LumenX Admin" }] }),
  component: ClassesPage,
});

export type ClassSection = {
  id: string;
  name: string;
  timetableGrade: string;
  section: string;
  departmentCode?: string;
  departmentName?: string;
  teacher: string;
  students: number;
  capacity: number;
  room: string;
  hasTimetable: boolean;
};

function classGroupsToSections(): ClassSection[] {
  return getClassGroups().map((g) => {
    const deptId = g.departmentId ?? g.courseId;
    const dept = deptId ? getDepartmentById(deptId) : undefined;
    return {
      id: g.id,
      name: g.displayName,
      timetableGrade: deptId ? collegeTimetableGrade(deptId, g.levelId) : getLevelLabelById(g.levelId),
      section: g.section,
      departmentCode: dept?.code,
      departmentName: dept?.name,
      teacher: g.teacher,
      students: g.students,
      capacity: g.capacity,
      room: g.room,
      hasTimetable: g.hasTimetable,
    };
  });
}

/** @deprecated Use classGroupsToSections() */
export const ADMIN_CLASSES_LIST: ClassSection[] = classGroupsToSections();

function ClassesPage() {
  const { profileId, profile } = useDemoProfile();
  const academic = profile.academic;
  const college = isCollegeMode();

  const [classes, setClasses] = useState<ClassSection[]>(() => classGroupsToSections());
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(academic.levels[0]!.label);
  const [section, setSection] = useState(academic.sections[0] ?? "A");
  const [departmentId, setDepartmentId] = useState(academic.departments[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [students, setStudents] = useState("0");
  const [teacher, setTeacher] = useState(classes[0]?.teacher ?? "Prof. Meera Nair");

  useEffect(() => {
    setClasses(classGroupsToSections());
    const { levels, sections, departments } = profile.academic;
    setLevel(levels[0]!.label);
    setSection(sections[0] ?? "A");
    setDepartmentId(departments[0]?.id ?? "");
  }, [profileId, profile.academic]);

  const departmentsForLevel = useMemo(() => {
    const levelId = academic.levels.find((l) => l.label === level)?.id;
    if (!levelId) return academic.departments;
    return academic.departments.filter((d) => d.levelIds.includes(levelId));
  }, [academic, level]);

  const addClass = () => {
    const cap = Number(capacity) || 50;
    const stu = Number(students) || 0;
    const levelMeta = academic.levels.find((l) => l.label === level);
    const dept = academic.departments.find((d) => d.id === departmentId);

    if (college && dept && levelMeta) {
      const displayName = `${dept.code} · ${level} · Sec ${section}`;
      const id = `${dept.id}-${levelMeta.id}-${section.toLowerCase()}`;
      setClasses((p) => [
        ...p,
        {
          id,
          name: displayName,
          timetableGrade: collegeTimetableGrade(dept.id, levelMeta.id),
          section,
          departmentCode: dept.code,
          departmentName: dept.name,
          teacher,
          students: stu,
          capacity: cap,
          room: room || "TBD",
          hasTimetable: false,
        },
      ]);
    } else if (levelMeta) {
      setClasses((p) => [
        ...p,
        {
          id: `${levelMeta.shortLabel}-${section}`,
          name: `${level}-${section}`,
          timetableGrade: level,
          section,
          teacher,
          students: stu,
          capacity: cap,
          room: room || "TBD",
          hasTimetable: false,
        },
      ]);
    }

    setOpen(false);
    setRoom("");
    setStudents("0");
  };

  return (
    <AppShell
      title={academic.classPageTitle}
      subtitle={academic.classPageSubtitle}
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> {college ? "New Batch" : "New Class"}
        </Button>
      }
    >
      {college && (
        <div className="mb-4 flex flex-wrap gap-2">
          {academic.departments.map((d) => (
            <Pill key={d.id} tone="neutral">
              <span className="font-semibold">{d.code}</span>
              <span className="text-muted-foreground ml-1.5">{d.name}</span>
            </Pill>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const fill = (c.students / c.capacity) * 100;
          return (
            <Card key={c.id} className="p-5 hover:bg-surface-hover transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Room {c.room}
                    {c.departmentName ? ` · ${c.departmentName}` : ""}
                  </div>
                </div>
                {fill >= 100 ? <Pill tone="warning">Full</Pill> : <Pill tone="success">Open</Pill>}
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground">
                {college ? "Faculty advisor" : "Class teacher"}
              </div>
              <div className="text-sm font-medium mt-0.5">{c.teacher}</div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-mono">
                    {c.students} / {c.capacity}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    className={`h-full ${fill >= 100 ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.min(fill, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button className="flex-1 justify-center">Roster</Button>
                <Link
                  to="/timetable"
                  search={{
                    grade: c.timetableGrade,
                    section: c.section,
                  }}
                  className="flex-1"
                >
                  <Button className="w-full justify-center">Timetable</Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={college ? "New department · year · section" : "New class section"}
        size="lg"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={addClass}>
              Create
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {college && (
            <Field label={academic.departmentLabel} required className="sm:col-span-2">
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                {departmentsForLevel.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={college ? "Year" : "Grade"} required>
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {academic.levels.map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select value={section} onChange={(e) => setSection(e.target.value)}>
              {academic.sections.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Room">
            <TextInput value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Block A-101" />
          </Field>
          <Field label={college ? "Faculty advisor" : "Class teacher"}>
            <Select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
              {[...new Set(classes.map((c) => c.teacher))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Classroom capacity" required>
            <TextInput
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
          <Field label="Current students">
            <TextInput
              type="number"
              value={students}
              onChange={(e) => setStudents(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
