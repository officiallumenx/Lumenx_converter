import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Field,
  Select,
  EmptyState,
  SearchInput,
  PageToolbar,
  ToolbarSpacer,
  Pill,
} from "@lumenx/ui-admin";
import { Plus, Pencil, Trash2, Users, Bus } from "lucide-react";
import {
  deleteBusEnrollment,
  loadTransportOps,
  TRANSPORT_OPS_CHANGED_EVENT,
  upsertBusEnrollment,
  type TransportBusEnrollment,
} from "@lumenx/utils";
import { useWindowEvents } from "@lumenx/ui";
import {
  STUDENT_OPTIONS,
  studentDirectoryClasses,
  studentDirectoryFor,
  studentDirectorySections,
  type TransportSnapshot,
} from "@/lib/transport-store";
import { useAdminToast } from "@/components/AdminActionToast";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
};

type Draft = {
  id?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  vehicleId: string;
};

const EMPTY: Draft = {
  studentId: "",
  studentName: "",
  studentClass: "",
  vehicleId: "",
};

const TRANSPORT_OPS_EVENTS = [TRANSPORT_OPS_CHANGED_EVENT, "storage"] as const;

/**
 * Admin: assign student + bus only.
 * Driver creates/updates stops; locations sync back automatically.
 * Fees are negotiated separately in Fees → Transport (not linked to stops).
 */
export function TransportStudentsView({ snapshot, onChange }: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [busFilter, setBusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pickerClass, setPickerClass] = useState(() => studentDirectoryClasses()[0] ?? "");
  const [pickerSection, setPickerSection] = useState(() =>
    studentDirectorySections(studentDirectoryClasses()[0] ?? "")[0] ?? "",
  );
  const [enrollments, setEnrollments] = useState<TransportBusEnrollment[]>(() =>
    loadTransportOps().enrollments,
  );

  const refreshEnrollments = useCallback(() => {
    setEnrollments(loadTransportOps().enrollments);
  }, []);

  useWindowEvents(TRANSPORT_OPS_EVENTS, refreshEnrollments);

  const buses = useMemo(
    () =>
      snapshot.vehicles
        .filter((v) => v.status !== "inactive")
        .slice()
        .sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber)),
    [snapshot.vehicles],
  );

  const driverNameByVehicleId = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of snapshot.vehicles) {
      if (vehicle.assignedDriverId) {
        const driver = snapshot.drivers.find((d) => d.id === vehicle.assignedDriverId);
        if (driver) map.set(vehicle.id, driver.name);
      }
    }
    for (const driver of snapshot.drivers) {
      if (driver.assignedVehicleId && !map.has(driver.assignedVehicleId)) {
        map.set(driver.assignedVehicleId, driver.name);
      }
    }
    return map;
  }, [snapshot.vehicles, snapshot.drivers]);

  const driverNameForBus = (vehicleId: string) =>
    driverNameByVehicleId.get(vehicleId) ?? "—";

  const busOptionLabel = (vehicleId: string, vehicleNumber: string) => {
    const driver = driverNameForBus(vehicleId);
    return driver && driver !== "—"
      ? `${vehicleNumber} · ${driver}`
      : vehicleNumber;
  };

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return enrollments.filter((a) => {
      if (busFilter !== "all" && a.vehicleId !== busFilter) return false;
      if (!needle) return true;
      return (
        a.studentName.toLowerCase().includes(needle) ||
        a.studentClass.toLowerCase().includes(needle) ||
        a.studentId.toLowerCase().includes(needle) ||
        a.vehicleNumber.toLowerCase().includes(needle)
      );
    });
  }, [enrollments, searchQuery, busFilter]);

  const pendingCount = rows.filter((e) => !e.stopId).length;
  const busLabel =
    busFilter === "all"
      ? "All buses"
      : (() => {
          const b = buses.find((x) => x.id === busFilter);
          return b ? busOptionLabel(b.id, b.vehicleNumber) : "Bus";
        })();

  const classes = useMemo(() => studentDirectoryClasses(), []);
  const sections = useMemo(
    () => (pickerClass ? studentDirectorySections(pickerClass) : []),
    [pickerClass],
  );
  const studentsInSection = useMemo(
    () =>
      pickerClass && pickerSection
        ? studentDirectoryFor(pickerClass, pickerSection)
        : [],
    [pickerClass, pickerSection],
  );

  const startCreate = () => {
    const cls = classes[0] ?? "";
    const sec = cls ? (studentDirectorySections(cls)[0] ?? "") : "";
    setPickerClass(cls);
    setPickerSection(sec);
    setDraft({
      ...EMPTY,
      vehicleId: busFilter !== "all" ? busFilter : "",
    });
    setOpen(true);
  };

  const openEdit = (a: TransportBusEnrollment) => {
    const opt = STUDENT_OPTIONS.find((x) => x.id === a.studentId);
    const cls = opt?.className ?? classes[0] ?? "";
    const sec = opt?.section ?? (cls ? (studentDirectorySections(cls)[0] ?? "") : "");
    setPickerClass(cls);
    setPickerSection(sec);
    setDraft({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName,
      studentClass: a.studentClass,
      vehicleId: a.vehicleId,
    });
    setOpen(true);
  };

  const onPickerClassChange = (next: string) => {
    setPickerClass(next);
    const nextSections = studentDirectorySections(next);
    const sec = nextSections[0] ?? "";
    setPickerSection(sec);
    setDraft((d) => ({ ...d, studentId: "", studentName: "", studentClass: "" }));
  };

  const onPickerSectionChange = (next: string) => {
    setPickerSection(next);
    setDraft((d) => ({ ...d, studentId: "", studentName: "", studentClass: "" }));
  };

  const onStudentChange = (studentId: string) => {
    const selectedStudent = STUDENT_OPTIONS.find((x) => x.id === studentId);
    setDraft({
      ...draft,
      studentId,
      studentName: selectedStudent?.name ?? "",
      studentClass: selectedStudent?.gradeLabel ?? "",
    });
  };

  const save = () => {
    if (!draft.studentId || !draft.vehicleId) {
      notify("Student and bus are required");
      return;
    }
    const vehicle = buses.find((v) => v.id === draft.vehicleId);
    if (!vehicle) {
      notify("Select a valid bus");
      return;
    }
    const route =
      snapshot.routes.find((r) => r.vehicleId === draft.vehicleId && r.status === "active") ??
      snapshot.routes.find((r) => r.vehicleId === draft.vehicleId) ??
      null;

    const existing = enrollments.find(
      (e) => e.id === draft.id || e.studentId === draft.studentId,
    );

    upsertBusEnrollment({
      id: existing?.id ?? draft.id ?? `enr-${Date.now().toString(36)}`,
      studentId: draft.studentId,
      studentName: draft.studentName,
      studentClass: draft.studentClass,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      routeId: route?.id ?? null,
      // Keep stop if same bus; clear if bus changed
      stopId:
        existing && existing.vehicleId === vehicle.id ? existing.stopId : null,
      stopName:
        existing && existing.vehicleId === vehicle.id ? existing.stopName : null,
      latitude:
        existing && existing.vehicleId === vehicle.id ? existing.latitude : null,
      longitude:
        existing && existing.vehicleId === vehicle.id ? existing.longitude : null,
    });
    refreshEnrollments();
    // Touch snapshot so parent can refresh-derived views if needed
    onChange({ ...snapshot });
    setOpen(false);
    notify(
      draft.id || existing
        ? "Bus assignment updated"
        : "Student assigned to bus · stop pending for driver",
    );
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <Field label="Bus" className="mb-0 min-w-[9rem]">
          <Select
            fieldSize="compact"
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
          >
            <option value="all">All buses</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {busOptionLabel(b.id, b.vehicleNumber)}
              </option>
            ))}
          </Select>
        </Field>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search students…"
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus className="size-3.5" /> Assign student + bus
        </Button>
      </PageToolbar>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground px-0.5">
        <span>
          <span className="font-medium text-foreground">{rows.length}</span> shown
          {" · "}
          {busLabel}
        </span>
        <span>·</span>
        <span>
          <span className="font-medium text-foreground">{pendingCount}</span> stop pending
          (driver)
        </span>
        <span>·</span>
        <span>Fees are set in Fees → Transport (not linked to stops)</span>
      </div>

      <Card>
        <CardHeader
          title="Students on buses"
          hint="Admin assigns bus only · driver adds/updates stops · location syncs here"
        />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Users className="size-5" />}
              title="No students on transport"
              hint="Add a student and bus number. Driver will place them on a stop."
              action={
                <Button variant="primary" size="sm" onClick={startCreate}>
                  <Plus className="size-3.5" /> Assign student + bus
                </Button>
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Bus</th>
                  <th className="py-2 pr-3 font-medium">Driver</th>
                  <th className="py-2 pr-3 font-medium">Stop (from driver)</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{a.studentName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {a.studentId}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">{a.studentClass}</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <Bus className="size-3 text-muted-foreground" />
                        {a.vehicleNumber}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">{driverNameForBus(a.vehicleId)}</td>
                    <td className="py-2.5 pr-3">
                      {a.stopId ? (
                        <span className="font-medium">{a.stopName}</span>
                      ) : (
                        <Pill tone="warning">Pending</Pill>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-muted-foreground">
                      {a.latitude != null && a.longitude != null
                        ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit bus assignment" : "Assign student + bus"}
        size="md"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Class" required>
            <Select value={pickerClass} onChange={(e) => onPickerClassChange(e.target.value)}>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select
              value={pickerSection}
              onChange={(e) => onPickerSectionChange(e.target.value)}
              disabled={sections.length === 0}
            >
              {sections.length === 0 ? (
                <option value="">No sections</option>
              ) : (
                sections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))
              )}
            </Select>
          </Field>
          <Field label="Student" required className="sm:col-span-2">
            <Select
              value={draft.studentId}
              onChange={(e) => onStudentChange(e.target.value)}
              disabled={studentsInSection.length === 0}
            >
              <option value="">Select student</option>
              {studentsInSection.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.gradeLabel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bus number" required className="sm:col-span-2">
            <Select
              value={draft.vehicleId}
              onChange={(e) => setDraft({ ...draft, vehicleId: e.target.value })}
            >
              <option value="">Select bus</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {busOptionLabel(b.id, b.vehicleNumber)}
                </option>
              ))}
            </Select>
          </Field>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Stops and GPS are set by the driver. Transport fee is set with parents in Fees →
            Transport.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Remove bus assignment"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteId) return;
                deleteBusEnrollment(deleteId);
                refreshEnrollments();
                onChange({ ...snapshot });
                setDeleteId(null);
                notify("Bus assignment removed");
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          This student will no longer be linked to a bus. Driver stop assignment will not apply.
        </p>
      </Modal>
    </div>
  );
}
