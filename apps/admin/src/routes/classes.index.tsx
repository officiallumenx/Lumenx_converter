import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadClassesList,
  resolveClassesListView,
  shouldCommitClassesLoad,
  type ClassListItem,
  type ClassesListStatus,
} from "@/lib/classes";
import { Button, Card, EmptyState, Field, Modal, Pill, Select, TextInput } from "@lumenx/ui-admin";
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

type ClassRow = ClassSection | ClassListItem;

function ClassesPage() {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = !apiMode;
  const { profileId, profile } = useDemoProfile();
  const academic = profile.academic;
  const college = isCollegeMode();
  const [classes, setClasses] = useState<ClassSection[]>(() =>
    apiMode ? [] : loadClassDirectory(),
  );
  const [apiItems, setApiItems] = useState<ClassListItem[]>([]);
  const [listStatus, setListStatus] = useState<ClassesListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveClassesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: ClassRow[] = apiMode ? listView.items : classes;

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(academic.levels[0]!.label);
  const [section, setSection] = useState(academic.sections[0] ?? "A");
  const [departmentId, setDepartmentId] = useState(academic.departments[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [students, setStudents] = useState("0");
  const [teacher, setTeacher] = useState(classes[0]?.teacher ?? "Prof. Meera Nair");
  const timetables = useMemo(
    () => (apiMode ? [] : loadTimetableDirectory()),
    [apiMode, profileId],
  );

  useEffect(() => {
    if (apiMode) return;
    setClasses(loadClassDirectory());
    const { levels, sections, departments } = profile.academic;
    setLevel(levels[0]!.label);
    setSection(sections[0] ?? "A");
    setDepartmentId(departments[0]?.id ?? "");
  }, [apiMode, profileId, profile.academic]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadClassesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitClassesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  useEffect(() => {
    setOpen(false);
    setRoom("");
    setStudents("0");
  }, [instituteCtx.activeInstituteId]);

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

  const openClassDetail = (id: string) => {
    void navigate({ to: "/classes/$id", params: { id } });
  };

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading classes…"
      : listView.status === "needs_institute"
        ? "Select an institute to load classes."
        : listView.status === "forbidden"
          ? listView.errorMessage ?? "You do not have access to classes for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load classes."
            : listView.status === "empty"
              ? "No class sections found for this institute."
              : null;

  return (
    <AppShell
      title={academic.classPageTitle}
      subtitle={
        apiMode
          ? `API mode · read-only · ${countLabel(displayItems.length)} sections`
          : academic.classPageSubtitle
      }
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> {college ? "New Batch" : "New Class"}
          </Button>
        ) : undefined
      }
    >
      {college && writesEnabled && (
        <div className="mb-4 flex flex-wrap gap-2">
          {academic.departments.map((department) => (
            <Pill key={department.id} tone="neutral">
              <span className="font-semibold">{department.code}</span>
              <span className="ml-1.5 text-muted-foreground">{department.name}</span>
            </Pill>
          ))}
        </div>
      )}

      {!listView.rowsValid ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {listHint ?? "Loading classes…"}
        </div>
      ) : displayItems.length === 0 ? (
        <EmptyState
          title="No classes found"
          hint={listHint ?? "Create a class section to get started."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((classSection) => {
            const fill =
              classSection.capacity > 0
                ? (classSection.students / classSection.capacity) * 100
                : 0;
            const timetable = timetables.find(
              (record) =>
                record.grade === classSection.timetableGrade &&
                record.section === classSection.section,
            );
            return (
              <Card
                key={classSection.id}
                role={writesEnabled ? "link" : undefined}
                tabIndex={writesEnabled ? 0 : undefined}
                className={
                  writesEnabled
                    ? "cursor-pointer p-5 transition-colors hover:bg-surface-hover"
                    : "p-5"
                }
                onClick={
                  writesEnabled
                    ? () => openClassDetail(classSection.id)
                    : undefined
                }
                onKeyDown={
                  writesEnabled
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openClassDetail(classSection.id);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{classSection.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Room {classSection.room}
                      {classSection.departmentName ? ` · ${classSection.departmentName}` : ""}
                    </div>
                  </div>
                  {classSection.capacity > 0 && fill >= 100 ? (
                    <Pill tone="warning">Full</Pill>
                  ) : classSection.capacity > 0 ? (
                    <Pill tone="success">Open</Pill>
                  ) : null}
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
                  {classSection.capacity > 0 ? (
                    <div className="h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className={`h-full ${fill >= 100 ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${Math.min(fill, 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                {writesEnabled ? (
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
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {writesEnabled ? (
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
      ) : null}
    </AppShell>
  );
}
