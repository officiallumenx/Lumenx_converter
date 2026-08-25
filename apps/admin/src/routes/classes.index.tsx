import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button, Card, Field, Modal, Pill, Select, TextInput } from "@lumenx/ui-admin";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  collegeTimetableGrade,
  isCollegeMode,
} from "@/lib/academic-data";
import {
  loadClassDirectory,
  saveClassDirectory,
  type ClassSection,
} from "@/lib/class-directory-store";
import { loadTimetableDirectory } from "@/lib/timetable-directory-store";

export const Route = createFileRoute("/classes/")({
  head: () => ({ meta: [{ title: "Classes — LumenX Admin" }] }),
  component: ClassesPage,
});

function ClassesPage() {
  const navigate = useNavigate();
  const { profileId, profile } = useDemoProfile();
  const academic = profile.academic;
  const college = isCollegeMode();
  const [classes, setClasses] = useState<ClassSection[]>(() => loadClassDirectory());
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(academic.levels[0]!.label);
  const [section, setSection] = useState(academic.sections[0] ?? "A");
  const [departmentId, setDepartmentId] = useState(academic.departments[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [students, setStudents] = useState("0");
  const [teacher, setTeacher] = useState(classes[0]?.teacher ?? "Prof. Meera Nair");
  const timetables = useMemo(() => loadTimetableDirectory(), [profileId]);

  useEffect(() => {
    setClasses(loadClassDirectory());
    const { levels, sections, departments } = profile.academic;
    setLevel(levels[0]!.label);
    setSection(sections[0] ?? "A");
    setDepartmentId(departments[0]?.id ?? "");
  }, [profileId, profile.academic]);

  const departmentsForLevel = useMemo(() => {
    const levelId = academic.levels.find((item) => item.label === level)?.id;
    if (!levelId) return academic.departments;
    return academic.departments.filter((department) => department.levelIds.includes(levelId));
  }, [academic, level]);

  const persist = (next: ClassSection[]) => {
    setClasses(next);
    saveClassDirectory(next);
  };

  const addClass = () => {
    const cap = Number(capacity) || 50;
    const studentCount = Number(students) || 0;
    const levelMeta = academic.levels.find((item) => item.label === level);
    const department = academic.departments.find((item) => item.id === departmentId);
    if (!levelMeta) return;

    const created: ClassSection =
      college && department
        ? {
            id: `${department.id}-${levelMeta.id}-${section.toLowerCase()}`,
            name: `${department.code} · ${level} · Sec ${section}`,
            levelId: levelMeta.id,
            timetableGrade: collegeTimetableGrade(department.id, levelMeta.id),
            section,
            departmentId: department.id,
            departmentCode: department.code,
            departmentName: department.name,
            teacher,
            students: studentCount,
            capacity: cap,
            room: room || "TBD",
            hasTimetable: false,
            subjectTeacherAssignments: {},
          }
        : {
            id: `${levelMeta.shortLabel}-${section}`,
            name: `${level}-${section}`,
            levelId: levelMeta.id,
            timetableGrade: level,
            section,
            teacher,
            students: studentCount,
            capacity: cap,
            room: room || "TBD",
            hasTimetable: false,
            subjectTeacherAssignments: {},
          };

    persist([...classes.filter((item) => item.id !== created.id), created]);
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
          {academic.departments.map((department) => (
            <Pill key={department.id} tone="neutral">
              <span className="font-semibold">{department.code}</span>
              <span className="ml-1.5 text-muted-foreground">{department.name}</span>
            </Pill>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((classSection) => {
          const fill = (classSection.students / classSection.capacity) * 100;
          const timetable = timetables.find(
            (record) =>
              record.grade === classSection.timetableGrade &&
              record.section === classSection.section,
          );
          return (
            <Card
              key={classSection.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer p-5 transition-colors hover:bg-surface-hover"
              onClick={() =>
                navigate({ to: "/classes/$id", params: { id: classSection.id } })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate({ to: "/classes/$id", params: { id: classSection.id } });
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{classSection.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Room {classSection.room}
                    {classSection.departmentName ? ` · ${classSection.departmentName}` : ""}
                  </div>
                </div>
                {fill >= 100 ? <Pill tone="warning">Full</Pill> : <Pill tone="success">Open</Pill>}
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground">
                {college ? "Faculty advisor" : "Class teacher"}
              </div>
              <div className="mt-0.5 text-sm font-medium">{classSection.teacher}</div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-mono">
                    {classSection.students} / {classSection.capacity}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-muted">
                  <div
                    className={`h-full ${fill >= 100 ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.min(fill, 100)}%` }}
                  />
                </div>
              </div>
              <div
                className="mt-5 flex gap-2"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Link
                  to="/classes/$id"
                  params={{ id: classSection.id }}
                  className="flex-1"
                >
                  <Button className="w-full justify-center">View class</Button>
                </Link>
                <Link
                  to="/timetable"
                  search={
                    timetable
                      ? {
                          id: timetable.id,
                          createGrade: undefined,
                          createSection: undefined,
                          openCreate: undefined,
                        }
                      : {
                          id: undefined,
                          openCreate: true,
                          createGrade: classSection.timetableGrade,
                          createSection: classSection.section,
                        }
                  }
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
            <Button variant="primary" onClick={addClass}>Create</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {college && (
            <Field label={academic.departmentLabel} required className="sm:col-span-2">
              <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                {departmentsForLevel.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} — {department.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={college ? "Year" : "Grade"} required>
            <Select value={level} onChange={(event) => setLevel(event.target.value)}>
              {academic.levels.map((item) => (
                <option key={item.id} value={item.label}>{item.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select value={section} onChange={(event) => setSection(event.target.value)}>
              {academic.sections.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Room">
            <TextInput
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              placeholder="Block A-101"
            />
          </Field>
          <Field label={college ? "Faculty advisor" : "Class teacher"}>
            <Select value={teacher} onChange={(event) => setTeacher(event.target.value)}>
              {[...new Set(classes.map((item) => item.teacher))].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
          <Field label="Classroom capacity" required>
            <TextInput
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </Field>
          <Field label="Current students">
            <TextInput
              type="number"
              value={students}
              onChange={(event) => setStudents(event.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
