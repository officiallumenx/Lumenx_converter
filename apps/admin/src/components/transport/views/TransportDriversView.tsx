import { useCallback, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import {
  findDriverAccountByAdminDriverId,
  setDriverAccountStatus,
  TRANSPORT_OPS_CHANGED_EVENT,
} from "@lumenx/utils";
import { useWindowEvents } from "@lumenx/ui";
import {
  createDriverTransportAccount,
  deleteDriver,
  upsertDriver,
  ENTITY_STATUS_PILL_TONE,
  type EntityStatus,
  type TransportDriver,
  type TransportSnapshot,
} from "@/lib/transport-store";
import { useAdminToast } from "@/components/AdminActionToast";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
};

const EMPTY: Omit<TransportDriver, "id"> = {
  name: "",
  phone: "",
  licenseNumber: "",
  licenseExpiry: "",
  assignedVehicleId: null,
  status: "active",
  notes: "",
};

const OPS_EVENTS = [TRANSPORT_OPS_CHANGED_EVENT, "storage"] as const;

export function TransportDriversView({ snapshot, onChange }: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<TransportDriver, "id"> & { id?: string }>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(true);
  const [accountTick, setAccountTick] = useState(0);

  const refreshAccounts = useCallback(() => setAccountTick((n) => n + 1), []);
  useWindowEvents(OPS_EVENTS, refreshAccounts);

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return snapshot.drivers;
    return snapshot.drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.phone.toLowerCase().includes(needle) ||
        d.licenseNumber.toLowerCase().includes(needle),
    );
  }, [snapshot.drivers, searchQuery]);

  const vehicleLabel = (id: string | null) => {
    const vehicle = snapshot.vehicles.find((x) => x.id === id);
    return vehicle ? `${vehicle.vehicleNumber} · ${vehicle.registrationNumber}` : "—";
  };

  const accountLabel = (driverId: string) => {
    void accountTick;
    const account = findDriverAccountByAdminDriverId(driverId);
    if (!account) return "None";
    return account.status === "active" ? "Active" : "Inactive";
  };

  const startCreate = () => {
    setDraft({ ...EMPTY });
    setCreateAccount(true);
    setOpen(true);
  };

  const startEdit = (driver: TransportDriver) => {
    setDraft({ ...driver });
    setCreateAccount(false);
    setOpen(true);
  };

  const existingAccount = draft.id ? findDriverAccountByAdminDriverId(draft.id) : null;

  const save = () => {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.licenseNumber.trim()) {
      notify("Name, phone, and license number are required");
      return;
    }

    const next = upsertDriver(snapshot, draft);
    const saved =
      draft.id != null
        ? next.drivers.find((d) => d.id === draft.id)
        : next.drivers.find(
            (d) =>
              d.name === draft.name.trim() &&
              d.phone === draft.phone.trim() &&
              d.licenseNumber === draft.licenseNumber.trim(),
          );

    if (saved && (createAccount || existingAccount)) {
      createDriverTransportAccount(next, saved.id);
    }

    onChange(next);
    setOpen(false);
    refreshAccounts();
    notify(
      draft.id
        ? "Driver updated"
        : createAccount
          ? "Driver added · Transport app account created"
          : "Driver added",
    );
  };

  const toggleAccountStatus = () => {
    if (!draft.id || !existingAccount) return;
    const nextStatus = existingAccount.status === "active" ? "inactive" : "active";
    setDriverAccountStatus(draft.id, nextStatus);
    refreshAccounts();
    notify(nextStatus === "active" ? "Transport account activated" : "Transport account deactivated");
  };

  const createAccountForExisting = () => {
    if (!draft.id) return;
    const next = upsertDriver(snapshot, draft);
    createDriverTransportAccount(next, draft.id);
    refreshAccounts();
    notify("Transport app account created");
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search drivers…"
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Driver
        </Button>
      </PageToolbar>

      <Card>
        <CardHeader title="Drivers" hint={`${rows.length} drivers`} />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<UserRound className="size-5" />}
              title="No drivers"
              hint="Add a driver and assign them to a vehicle."
              action={
                <Button variant="primary" size="sm" onClick={startCreate}>
                  <Plus className="size-3.5" /> Add Driver
                </Button>
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">License</th>
                  <th className="py-2 pr-3 font-medium">Vehicle</th>
                  <th className="py-2 pr-3 font-medium">App account</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{d.name}</td>
                    <td className="py-2.5 pr-3">{d.phone}</td>
                    <td className="py-2.5 pr-3 font-mono">{d.licenseNumber}</td>
                    <td className="py-2.5 pr-3">{vehicleLabel(d.assignedVehicleId)}</td>
                    <td className="py-2.5 pr-3">
                      <Pill
                        tone={
                          accountLabel(d.id) === "Active"
                            ? "success"
                            : accountLabel(d.id) === "Inactive"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {accountLabel(d.id)}
                      </Pill>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Pill tone={ENTITY_STATUS_PILL_TONE[d.status]}>{d.status}</Pill>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" onClick={() => startEdit(d)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(d.id)}>
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
        title={draft.id ? "Edit driver" : "Add driver"}
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
          <Field label="Name" required>
            <TextInput
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Phone" required hint="Used for Transport app login">
            <TextInput
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="License number" required>
            <TextInput
              value={draft.licenseNumber}
              onChange={(e) => setDraft({ ...draft, licenseNumber: e.target.value })}
            />
          </Field>
          <Field label="License expiry">
            <TextInput
              type="date"
              value={draft.licenseExpiry}
              onChange={(e) => setDraft({ ...draft, licenseExpiry: e.target.value })}
            />
          </Field>
          <Field label="Assigned vehicle">
            <Select
              value={draft.assignedVehicleId ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, assignedVehicleId: e.target.value || null })
              }
            >
              <option value="">Unassigned</option>
              {snapshot.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as EntityStatus })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">On leave</option>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <TextArea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>

          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="text-xs font-semibold text-foreground">Transport app account</div>
            {existingAccount ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Employee ID:{" "}
                  <span className="font-medium text-foreground">{existingAccount.employeeId}</span>
                </p>
                <p>
                  Login mobile:{" "}
                  <span className="font-medium text-foreground">{existingAccount.phoneDigits}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Pill tone={existingAccount.status === "active" ? "success" : "neutral"}>
                    {existingAccount.status}
                  </Pill>
                  <Button size="sm" onClick={toggleAccountStatus}>
                    {existingAccount.status === "active" ? "Deactivate account" : "Activate account"}
                  </Button>
                </div>
                <p className="text-[11px]">
                  Driver signs in with this mobile and the demo OTP. No backend authentication.
                </p>
              </div>
            ) : draft.id ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">No Transport app account yet.</p>
                <Button size="sm" variant="primary" onClick={createAccountForExisting}>
                  Create Transport account
                </Button>
              </div>
            ) : (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                />
                <span>
                  Create Transport app account for this driver (mobile login + demo OTP)
                </span>
              </label>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete driver"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteId) return;
                onChange(deleteDriver(snapshot, deleteId));
                setDeleteId(null);
                refreshAccounts();
                notify("Driver deleted");
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Remove this driver from transport? Their Transport app account will also be removed.
        </p>
      </Modal>
    </div>
  );
}
