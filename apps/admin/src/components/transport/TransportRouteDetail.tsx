import { useState } from "react";
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
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { AdminStudentAssignmentPicker } from "@/components/transport/AdminStudentAssignmentPicker";
import {
  LocationPastePicker,
  type LocationPasteValue,
} from "@/components/transport/LocationPastePicker";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  deleteRouteSetupStop,
  moveStudentsBetweenStops,
  reorderRouteSetupStop,
  setRouteStopStudents,
  studentsByIds,
  upsertRouteSetupStop,
  type AdminRouteStop,
  type TransportRoute,
  type TransportSnapshot,
} from "@/lib/transport-store";

type Props = {
  snapshot: TransportSnapshot;
  route: TransportRoute;
  onChange: (next: TransportSnapshot) => void;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TransportRouteDetail({ snapshot, route, onChange }: Props) {
  const notify = useAdminToast();
  const locked = route.configStatus === "locked";
  const canManageStops = false;
  const [expandedGps, setExpandedGps] = useState<Record<string, boolean>>({});
  const [editStop, setEditStop] = useState<AdminRouteStop | null>(null);
  const [assignStop, setAssignStop] = useState<AdminRouteStop | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [moveStop, setMoveStop] = useState<AdminRouteStop | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [deleteStopId, setDeleteStopId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLocation, setAddLocation] = useState<LocationPasteValue | null>(null);
  const [addStudents, setAddStudents] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState<LocationPasteValue | null>(null);

  const stops = [...route.setupStops].sort((a, b) => a.routeOrder - b.routeOrder);

  const openEdit = (s: AdminRouteStop) => {
    setEditStop(s);
    setEditName(s.name);
    setEditLocation({
      lat: s.latitude,
      lng: s.longitude,
      locationLabel: s.locationLabel,
    });
  };

  const saveEdit = () => {
    if (!editStop || !editName.trim() || !editLocation) {
      notify("Name and location are required");
      return;
    }
    onChange(
      upsertRouteSetupStop(snapshot, route.id, {
        ...editStop,
        name: editName.trim(),
        locationLabel: editLocation.locationLabel,
        latitude: editLocation.lat,
        longitude: editLocation.lng,
      }),
    );
    setEditStop(null);
    notify("Stop updated");
  };

  const saveAssign = () => {
    if (!assignStop) return;
    onChange(setRouteStopStudents(snapshot, route.id, assignStop.id, assignIds));
    setAssignStop(null);
    notify("Student assignment updated");
  };

  const saveMove = () => {
    if (!moveStop || !moveTarget || moveIds.length === 0) {
      notify("Select students and a destination stop");
      return;
    }
    onChange(
      moveStudentsBetweenStops(snapshot, route.id, moveStop.id, moveTarget, moveIds),
    );
    setMoveStop(null);
    notify("Students moved");
  };

  const saveAdd = () => {
    if (!addName.trim() || !addLocation) {
      notify("Stop name and location are required");
      return;
    }
    onChange(
      upsertRouteSetupStop(snapshot, route.id, {
        id: "",
        name: addName.trim(),
        locationLabel: addLocation.locationLabel,
        latitude: addLocation.lat,
        longitude: addLocation.lng,
        timestampCreated: new Date().toISOString(),
        createdBy: "admin",
        createdByName: "Admin",
        studentIds: addStudents,
      }),
    );
    setAddOpen(false);
    setAddName("");
    setAddLocation(null);
    setAddStudents([]);
    notify("Stop added");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Route information" hint={route.name} />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="mt-1">
              <Pill
                tone={
                  route.configStatus === "locked"
                    ? "warning"
                    : route.configStatus === "configured"
                      ? "success"
                      : "neutral"
                }
              >
                {route.configStatus === "not_configured"
                  ? "Not Configured"
                  : route.configStatus === "locked"
                    ? "Route Locked"
                    : "Configured"}
              </Pill>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stops</div>
            <div className="mt-1 font-medium">{stops.length}</div>
          </div>
          {route.configStatus === "locked" ? (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Locked by
                </div>
                <div className="mt-1 font-medium">{route.lockedBy ?? "Admin"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Locked date
                </div>
                <div className="mt-1 font-medium">{formatDate(route.lockedAt)}</div>
              </div>
            </>
          ) : null}
          {route.setupFinishedAt ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Setup finished
              </div>
              <div className="mt-1 font-medium">{formatDate(route.setupFinishedAt)}</div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ordered stop list</h3>
        {canManageStops && !locked ? (
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            Add stop
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Driver-managed · Admin view only
          </span>
        )}
      </div>

      {stops.length === 0 ? (
        <Card>
          <div className="px-5 py-8 text-center text-xs text-muted-foreground">
            No stops from the Transport App yet. Pending route setup by the driver.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {stops.map((stop, index) => {
            const students = studentsByIds(stop.studentIds);
            const gpsOpen = Boolean(expandedGps[stop.id]);
            return (
              <Card key={stop.id}>
                <div className="px-4 py-3 sm:px-5 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                      {stop.routeOrder}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{stop.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>Order · {stop.routeOrder}</span>
                        <span>Students · {stop.studentIds.length}</span>
                        <span>Created by · {stop.createdByName}</span>
                        <span>{formatDate(stop.timestampCreated)}</span>
                      </div>
                      <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                        <Users className="size-3 mt-0.5 shrink-0" />
                        <span>
                          {students.length > 0
                            ? students.map((s) => s.name).join(", ")
                            : "No students assigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setExpandedGps((prev) => ({ ...prev, [stop.id]: !prev[stop.id] }))
                    }
                  >
                    {gpsOpen ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                    Location details
                  </button>
                  {gpsOpen ? (
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] space-y-1">
                      <p>{stop.locationLabel}</p>
                      <p className="font-mono text-muted-foreground">
                        {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                      </p>
                    </div>
                  ) : null}

                  {canManageStops && !locked ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Button size="sm" onClick={() => openEdit(stop)}>
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAssignStop(stop);
                          setAssignIds([...stop.studentIds]);
                        }}
                      >
                        <Users className="size-3" /> Students
                      </Button>
                      <Button
                        size="sm"
                        disabled={stop.studentIds.length === 0 || stops.length < 2}
                        onClick={() => {
                          setMoveStop(stop);
                          setMoveIds([...stop.studentIds]);
                          setMoveTarget(stops.find((s) => s.id !== stop.id)?.id ?? "");
                        }}
                      >
                        Move students
                      </Button>
                      <Button
                        size="sm"
                        disabled={index === 0}
                        onClick={() =>
                          onChange(reorderRouteSetupStop(snapshot, route.id, stop.id, "up"))
                        }
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        disabled={index === stops.length - 1}
                        onClick={() =>
                          onChange(reorderRouteSetupStop(snapshot, route.id, stop.id, "down"))
                        }
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteStopId(stop.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(editStop)}
        onClose={() => setEditStop(null)}
        title="Edit stop"
        size="lg"
        footer={
          <>
            <Button onClick={() => setEditStop(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Stop name" required>
            <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label="GPS location" required hint="Paste from Google Maps or OSM">
            <LocationPastePicker value={editLocation} onChange={setEditLocation} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignStop)}
        onClose={() => setAssignStop(null)}
        title={`Students · ${assignStop?.name ?? ""}`}
        size="md"
        footer={
          <>
            <Button onClick={() => setAssignStop(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveAssign}>
              Save assignment
            </Button>
          </>
        }
      >
        <AdminStudentAssignmentPicker selectedIds={assignIds} onChange={setAssignIds} />
      </Modal>

      <Modal
        open={Boolean(moveStop)}
        onClose={() => setMoveStop(null)}
        title="Move students"
        size="md"
        footer={
          <>
            <Button onClick={() => setMoveStop(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveMove}>
              Move
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="To stop" required>
            <Select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
              {stops
                .filter((s) => s.id !== moveStop?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.routeOrder}. {s.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Students to move">
            <AdminStudentAssignmentPicker selectedIds={moveIds} onChange={setMoveIds} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add stop"
        size="lg"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveAdd}>
              Add stop
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Stop name" required>
            <TextInput
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Market Square"
            />
          </Field>
          <Field label="Location" required>
            <LocationPastePicker value={addLocation} onChange={setAddLocation} />
          </Field>
          <Field label="Students">
            <AdminStudentAssignmentPicker selectedIds={addStudents} onChange={setAddStudents} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteStopId)}
        onClose={() => setDeleteStopId(null)}
        title="Delete stop"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteStopId(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteStopId) return;
                onChange(deleteRouteSetupStop(snapshot, route.id, deleteStopId));
                setDeleteStopId(null);
                notify("Stop deleted");
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Remove this stop from the route? Student links on this stop will be cleared.
        </p>
      </Modal>
    </div>
  );
}
