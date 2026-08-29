import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Modal,
  Field,
  TextInput,
  Select,
  TextArea,
  EmptyState,
  SearchInput,
  PageToolbar,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { ArrowLeft, Eye, Plus, Pencil, Trash2, Bus } from "lucide-react";
import { TransportVehicleDetail } from "@/components/transport/TransportVehicleDetail";
import {
  deleteVehicle,
  upsertVehicle,
  ENTITY_STATUS_PILL_TONE,
  type EntityStatus,
  type TransportSnapshot,
  type TransportVehicle,
} from "@/lib/transport-store";
import { useAdminToast } from "@/components/AdminActionToast";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
  openCreate?: boolean;
  onOpenCreateConsumed?: () => void;
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  /** When set, save/delete call API instead of local transport store. */
  onPersistVehicle?: (
    draft: Omit<TransportVehicle, "id"> & { id?: string },
  ) => void | Promise<void>;
  onRemoveVehicle?: (id: string) => void | Promise<void>;
};

const EMPTY: Omit<TransportVehicle, "id"> = {
  vehicleNumber: "",
  registrationNumber: "",
  capacity: 40,
  status: "active",
  assignedDriverId: null,
  notes: "",
};

export function TransportVehiclesView({
  snapshot,
  onChange,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
  onPersistVehicle,
  onRemoveVehicle,
}: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<TransportVehicle, "id"> & { id?: string }>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return snapshot.vehicles;
    return snapshot.vehicles.filter(
      (v) =>
        v.vehicleNumber.toLowerCase().includes(needle) ||
        v.registrationNumber.toLowerCase().includes(needle) ||
        v.notes.toLowerCase().includes(needle) ||
        (v.assignedDriverId
          ? (snapshot.drivers.find((d) => d.id === v.assignedDriverId)?.name ?? "")
              .toLowerCase()
              .includes(needle)
          : false),
    );
  }, [snapshot.vehicles, snapshot.drivers, searchQuery]);

  const selected = snapshot.vehicles.find((v) => v.id === selectedId) ?? null;

  const driverName = (id: string | null) =>
    snapshot.drivers.find((d) => d.id === id)?.name ?? "—";

  const driverOptions = useMemo(() => {
    return snapshot.drivers.map((d) => {
      const otherVehicle =
        d.assignedVehicleId && d.assignedVehicleId !== draft.id
          ? snapshot.vehicles.find((v) => v.id === d.assignedVehicleId)
          : null;
      return {
        ...d,
        optionLabel: otherVehicle
          ? `${d.name} · currently on ${otherVehicle.vehicleNumber}`
          : d.assignedVehicleId === draft.id
            ? `${d.name} · assigned here`
            : `${d.name} · available`,
      };
    });
  }, [snapshot.drivers, snapshot.vehicles, draft.id]);

  const startCreate = () => {
    setDraft({ ...EMPTY });
    setOpen(true);
  };

  const startEdit = (v: TransportVehicle) => {
    setDraft({ ...v });
    setOpen(true);
  };

  const save = () => {
    if (!writesEnabled) return;
    if (!draft.vehicleNumber.trim() || !draft.registrationNumber.trim()) {
      notify("Vehicle number and registration are required");
      return;
    }
    if (onPersistVehicle) {
      void Promise.resolve(onPersistVehicle(draft))
        .then(() => {
          setOpen(false);
          notify(draft.id ? "Vehicle updated" : "Vehicle added");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save vehicle");
        });
      return;
    }
    if (!draft.assignedDriverId) {
      notify("Assign a driver to this bus");
      return;
    }
    const next = upsertVehicle(snapshot, draft);
    onChange(next);
    setOpen(false);
    if (selectedId && draft.id === selectedId) {
      setSelectedId(next.vehicles.find((v) => v.id === draft.id)?.id ?? selectedId);
    }
    notify(
      draft.id
        ? "Vehicle updated"
        : `Vehicle added · driver ${driverName(draft.assignedDriverId)} assigned`,
    );
  };

  const confirmDelete = () => {
    if (!writesEnabled || !deleteId) return;
    if (onRemoveVehicle) {
      void Promise.resolve(onRemoveVehicle(deleteId))
        .then(() => {
          if (selectedId === deleteId) setSelectedId(null);
          setDeleteId(null);
          notify("Vehicle deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete vehicle");
        });
      return;
    }
    onChange(deleteVehicle(snapshot, deleteId));
    if (selectedId === deleteId) setSelectedId(null);
    setDeleteId(null);
    notify("Vehicle deleted");
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-3.5" /> Back to vehicles
          </Button>
          <Pill tone={ENTITY_STATUS_PILL_TONE[selected.status]}>{selected.status}</Pill>
        </div>
        <TransportVehicleDetail
          snapshot={snapshot}
          vehicleId={selected.id}
          onEdit={writesEnabled ? (vehicle) => {
            startEdit(vehicle);
          } : undefined}
        />
        {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={draft.id ? "Edit vehicle" : "Add vehicle"}
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
          <VehicleForm
            draft={draft}
            setDraft={setDraft}
            driverOptions={driverOptions}
          />
        </Modal>
        ) : null}
      </div>
    );
  }

  if (listBlocked) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {listHint ?? "Loading vehicles…"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vehicles…"
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        {writesEnabled ? (
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Vehicle
        </Button>
        ) : null}
      </PageToolbar>

      <Card>
        <CardHeader
          title="Vehicles"
          hint={
            writesEnabled
              ? `${rows.length} in fleet`
              : `${rows.length} in fleet · read-only`
          }
        />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Bus className="size-5" />}
              title="No vehicles"
              hint={
                writesEnabled
                  ? "Add a bus or van to start building routes."
                  : listHint ?? "No vehicles found for this institute."
              }
              action={
                writesEnabled ? (
                <Button variant="primary" size="sm" onClick={startCreate}>
                  <Plus className="size-3.5" /> Add Vehicle
                </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Vehicle</th>
                  <th className="py-2 pr-3 font-medium">Registration</th>
                  <th className="py-2 pr-3 font-medium">Capacity</th>
                  <th className="py-2 pr-3 font-medium">Driver</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{v.vehicleNumber}</td>
                    <td className="py-2.5 pr-3 font-mono">{v.registrationNumber}</td>
                    <td className="py-2.5 pr-3">{v.capacity}</td>
                    <td className="py-2.5 pr-3">{driverName(v.assignedDriverId)}</td>
                    <td className="py-2.5 pr-3">
                      <Pill tone={ENTITY_STATUS_PILL_TONE[v.status]}>{v.status}</Pill>
                    </td>
                    {writesEnabled ? (
                    <td className="py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" onClick={() => setSelectedId(v.id)}>
                          <Eye className="size-3" />
                        </Button>
                        <Button size="sm" onClick={() => startEdit(v)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(v.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                    ) : (
                    <td className="py-2.5 text-right">
                      <Button size="sm" onClick={() => setSelectedId(v.id)}>
                        <Eye className="size-3" />
                      </Button>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {writesEnabled ? (
      <>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit vehicle" : "Add vehicle"}
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
        <VehicleForm draft={draft} setDraft={setDraft} driverOptions={driverOptions} />
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete vehicle"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Remove this vehicle from the fleet? Routes using it will be unassigned.
        </p>
      </Modal>
      </>
      ) : null}
    </div>
  );
}

function VehicleForm({
  draft,
  setDraft,
  driverOptions,
}: {
  draft: Omit<TransportVehicle, "id"> & { id?: string };
  setDraft: (next: Omit<TransportVehicle, "id"> & { id?: string }) => void;
  driverOptions: Array<{ id: string; optionLabel: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Vehicle number" required>
        <TextInput
          value={draft.vehicleNumber}
          onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })}
          placeholder="BUS-04"
        />
      </Field>
      <Field label="Registration number" required>
        <TextInput
          value={draft.registrationNumber}
          onChange={(e) => setDraft({ ...draft, registrationNumber: e.target.value })}
          placeholder="KA-01-LX-0000"
        />
      </Field>
      <Field label="Capacity" required>
        <TextInput
          type="number"
          min={1}
          value={draft.capacity}
          onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) || 0 })}
        />
      </Field>
      <Field label="Status">
        <Select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as EntityStatus })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </Select>
      </Field>
      <Field
        label="Assigned driver"
        required
        className="sm:col-span-2"
        hint="Required · selecting a driver on another bus will move them here"
      >
        <Select
          value={draft.assignedDriverId ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              assignedDriverId: e.target.value || null,
            })
          }
        >
          <option value="">Select a driver</option>
          {driverOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.optionLabel}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <TextArea
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </Field>
    </div>
  );
}
