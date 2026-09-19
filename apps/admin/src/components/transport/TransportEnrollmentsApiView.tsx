import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageToolbar,
  Pill,
  SearchInput,
  Select,
  Td,
  Th,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { Plus, Trash2, Users } from "lucide-react";
import type { TransportEnrollmentListItem } from "@/lib/transport";
import type { StudentClassOption } from "@/components/students/StudentCreateDialog";
import { useAdminToast } from "@/components/AdminActionToast";

export type EnrollmentRouteOption = {
  id: string;
  name: string;
  vehicleId?: string | null;
};

export type EnrollmentVehicleOption = {
  id: string;
  vehicleNumber: string;
};

export type EnrollmentStudentOption = {
  id: string;
  name: string;
  /** Class label only (e.g. Class 10). */
  grade: string;
  section?: string | null;
};

type Props = {
  items: TransportEnrollmentListItem[];
  listBlocked?: boolean;
  listHint?: string | null;
  writesEnabled?: boolean;
  routes?: EnrollmentRouteOption[];
  vehicles?: EnrollmentVehicleOption[];
  studentsCatalog?: EnrollmentStudentOption[];
  /** Full institute class → section tree (preferred over student-derived labels). */
  classOptions?: StudentClassOption[];
  onAssignStudent?: (input: {
    studentId: string;
    routeId: string;
  }) => Promise<void>;
  onRemoveEnrollment?: (id: string) => void | Promise<void>;
  onEndEnrollment?: (id: string) => void | Promise<void>;
};

function statusTone(
  status: TransportEnrollmentListItem["status"],
): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "neutral";
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match Class 10 / Grade 10 / 10 and section A / a / Section A. */
function labelsCompatible(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeLabel(left ?? "");
  const b = normalizeLabel(right ?? "");
  if (!a || !b) return false;
  if (a === b) return true;
  const stripClass = (v: string) => v.replace(/^(class|grade)\s+/i, "").trim();
  const stripSection = (v: string) => v.replace(/^section\s+/i, "").trim();
  return stripClass(a) === stripClass(b) || stripSection(a) === stripSection(b);
}

export function TransportEnrollmentsApiView({
  items,
  listBlocked = false,
  listHint = null,
  writesEnabled = false,
  routes = [],
  vehicles = [],
  studentsCatalog = [],
  classOptions: classOptionsProp = [],
  onAssignStudent,
  onRemoveEnrollment,
  onEndEnrollment,
}: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClass, setAssignClass] = useState("");
  const [assignSection, setAssignSection] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  const classOptions = useMemo(() => {
    if (classOptionsProp.length > 0) {
      return classOptionsProp.map((item) => item.label);
    }
    const set = new Set<string>();
    for (const student of studentsCatalog) {
      const grade = student.grade?.trim();
      if (grade) set.add(grade);
    }
    for (const row of items) {
      const grade = row.classLabel?.trim() || row.studentClass?.trim();
      if (grade && grade !== "—") set.add(grade);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classOptionsProp, items, studentsCatalog]);

  const sectionOptionsFor = (classLabel: string) => {
    if (classOptionsProp.length > 0) {
      if (!classLabel) {
        const set = new Set<string>();
        for (const cls of classOptionsProp) {
          for (const section of cls.sections) {
            if (section.label.trim()) set.add(section.label.trim());
          }
        }
        return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      }
      const match = classOptionsProp.find((item) => labelsCompatible(item.label, classLabel));
      return (match?.sections ?? []).map((section) => section.label);
    }
    const set = new Set<string>();
    for (const student of studentsCatalog) {
      if (classLabel && !labelsCompatible(student.grade, classLabel)) continue;
      const section = student.section?.trim();
      if (section) set.add(section);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const filterSectionOptions = useMemo(
    () => sectionOptionsFor(classFilter),
    // sectionOptionsFor closes over catalog props
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classFilter, classOptionsProp, studentsCatalog],
  );

  const assignSectionOptions = useMemo(
    () => sectionOptionsFor(assignClass),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignClass, classOptionsProp, studentsCatalog],
  );

  const studentsById = useMemo(() => {
    const map = new Map<string, EnrollmentStudentOption>();
    for (const student of studentsCatalog) map.set(student.id, student);
    return map;
  }, [studentsCatalog]);

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return items.filter((row) => {
      if (routeFilter && row.routeName !== routes.find((r) => r.id === routeFilter)?.name) {
        const route = routes.find((r) => r.id === routeFilter);
        if (!route || row.routeName !== route.name) return false;
      }
      if (vehicleFilter) {
        const matchedRoutes = routes.filter((r) => r.vehicleId === vehicleFilter);
        if (
          matchedRoutes.length > 0 &&
          !matchedRoutes.some((r) => r.name === row.routeName)
        ) {
          return false;
        }
      }
      if (classFilter) {
        const fromRow = row.classLabel || row.studentClass;
        const fromCatalog = studentsById.get(row.studentId)?.grade;
        if (
          !labelsCompatible(fromRow, classFilter) &&
          !labelsCompatible(fromCatalog, classFilter)
        ) {
          return false;
        }
      }
      if (sectionFilter) {
        const fromRow = row.sectionLabel;
        const fromCatalog = studentsById.get(row.studentId)?.section;
        if (
          !labelsCompatible(fromRow, sectionFilter) &&
          !labelsCompatible(fromCatalog, sectionFilter)
        ) {
          return false;
        }
      }
      if (!needle) return true;
      return (
        row.studentName.toLowerCase().includes(needle) ||
        row.studentClass.toLowerCase().includes(needle) ||
        row.routeName.toLowerCase().includes(needle) ||
        row.pickupStopName.toLowerCase().includes(needle) ||
        row.dropStopName.toLowerCase().includes(needle)
      );
    });
  }, [
    items,
    searchQuery,
    routeFilter,
    vehicleFilter,
    classFilter,
    sectionFilter,
    routes,
    studentsById,
  ]);

  const assignStudents = useMemo(() => {
    return studentsCatalog.filter((student) => {
      if (assignClass && !labelsCompatible(student.grade, assignClass)) return false;
      if (assignSection && !labelsCompatible(student.section, assignSection)) return false;
      return true;
    });
  }, [studentsCatalog, assignClass, assignSection]);

  const startAssign = () => {
    setAssignClass(classOptions[0] ?? "");
    const sections = sectionOptionsFor(classOptions[0] ?? "");
    setAssignSection(sections[0] ?? "");
    setAssignStudentId("");
    setAssignRouteId(routes[0]?.id ?? "");
    setAssignOpen(true);
  };

  const submitAssign = () => {
    if (!onAssignStudent) return;
    if (!assignStudentId) {
      notify("Select a student");
      return;
    }
    if (!assignRouteId) {
      notify("Select a route / bus");
      return;
    }
    setAssignBusy(true);
    void Promise.resolve(onAssignStudent({ studentId: assignStudentId, routeId: assignRouteId }))
      .then(() => {
        setAssignOpen(false);
        notify("Student assigned to transport");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to assign student");
      })
      .finally(() => setAssignBusy(false));
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search student, route, or stop…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <ToolbarSpacer />
        {writesEnabled && onAssignStudent ? (
          <Button variant="primary" size="sm" onClick={startAssign}>
            <Plus className="size-3.5" /> Add student
          </Button>
        ) : (
          <Pill tone="neutral">
            {writesEnabled ? "Editable" : "Read-only"}
          </Pill>
        )}
      </PageToolbar>

      <div className="flex flex-wrap gap-2">
        <Select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
        >
          <option value="">All routes</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name}
            </option>
          ))}
        </Select>
        <Select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">All buses</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.vehicleNumber}
            </option>
          ))}
        </Select>
        <Select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setSectionFilter("");
          }}
        >
          <option value="">All classes</option>
          {classOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </Select>
        <Select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="">All sections</option>
          {filterSectionOptions.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardHeader
          title="Transport enrollments"
          hint={
            listBlocked
              ? listHint ?? "Loading enrollments…"
              : `${rows.length} student route assignments`
          }
        />
        {listBlocked ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Users className="size-5" />}
              title="No transport enrollments"
              hint={
                listHint ??
                (writesEnabled
                  ? "Assign a student to a route or bus to get started."
                  : "When students are assigned to routes, they appear here.")
              }
              action={
                writesEnabled && onAssignStudent ? (
                  <Button variant="primary" size="sm" onClick={startAssign}>
                    <Plus className="size-3.5" /> Add student
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Route</Th>
                <Th>Pickup</Th>
                <Th>Drop</Th>
                <Th>Status</Th>
                {writesEnabled ? <Th>Actions</Th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.studentName}</Td>
                  <Td>{row.studentClass}</Td>
                  <Td>{row.routeName}</Td>
                  <Td className="text-xs text-muted-foreground">{row.pickupStopName}</Td>
                  <Td className="text-xs text-muted-foreground">{row.dropStopName}</Td>
                  <Td>
                    <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                  </Td>
                  {writesEnabled ? (
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {row.status === "active" && onEndEnrollment ? (
                          <Button
                            size="sm"
                            disabled={busyId === row.id}
                            onClick={() => {
                              setBusyId(row.id);
                              void Promise.resolve(onEndEnrollment(row.id)).finally(() =>
                                setBusyId(null),
                              );
                            }}
                          >
                            End
                          </Button>
                        ) : null}
                        {onRemoveEnrollment ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyId === row.id}
                            onClick={() => {
                              setBusyId(row.id);
                              void Promise.resolve(onRemoveEnrollment(row.id)).finally(() =>
                                setBusyId(null),
                              );
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      {writesEnabled && onAssignStudent ? (
        <Modal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="Assign student to transport"
          subtitle="Pick class/section, then assign the student to a route or bus (stops optional)"
          size="md"
          footer={
            <>
              <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={assignBusy} onClick={submitAssign}>
                Assign
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Class">
              <Select
                value={assignClass}
                onChange={(e) => {
                  const next = e.target.value;
                  setAssignClass(next);
                  const sections = sectionOptionsFor(next);
                  setAssignSection(sections[0] ?? "");
                  setAssignStudentId("");
                }}
              >
                <option value="">All classes</option>
                {classOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section">
              <Select
                value={assignSection}
                onChange={(e) => {
                  setAssignSection(e.target.value);
                  setAssignStudentId("");
                }}
                disabled={assignSectionOptions.length === 0}
              >
                <option value="">All sections</option>
                {assignSectionOptions.length === 0 ? (
                  <option value="" disabled>
                    No sections
                  </option>
                ) : (
                  assignSectionOptions.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Field label="Student" required className="sm:col-span-2">
              <Select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
              >
                <option value="">Select student</option>
                {assignStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                    {student.grade ? ` · ${student.grade}` : ""}
                    {student.section ? `-${student.section}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Route / bus" required className="sm:col-span-2">
              <Select
                value={assignRouteId}
                onChange={(e) => setAssignRouteId(e.target.value)}
              >
                <option value="">Select route</option>
                {routes.map((route) => {
                  const bus = vehicles.find((v) => v.id === route.vehicleId);
                  return (
                    <option key={route.id} value={route.id}>
                      {route.name}
                      {bus ? ` · ${bus.vehicleNumber}` : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
