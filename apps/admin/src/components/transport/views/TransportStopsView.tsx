import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Field,
  TextInput,
  EmptyState,
  SearchInput,
  PageToolbar,
  ToolbarSpacer,
  Pill,
  Select,
} from "@lumenx/ui-admin";
import { Plus, Pencil, Trash2, MapPin, ExternalLink, Check, X } from "lucide-react";
import {
  deleteStop,
  upsertStop,
  type TransportSnapshot,
  type TransportStop,
} from "@/lib/transport-store";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  LocationPastePicker,
  type LocationPasteValue,
} from "@/components/transport/LocationPastePicker";
import { mapsUrlForCoords } from "@/lib/parse-location-paste";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
  writesEnabled?: boolean;
  /** When false, hide Add Stop and create-only modal entry (list + edit/review remain OK). */
  allowCreate?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  routeOptions?: Array<{ id: string; name: string }>;
  onPersistStop?: (input: {
    id?: string;
    routeId?: string;
    name: string;
    locationLabel: string;
    lat: number;
    lng: number;
    notificationRadiusM: number;
  }) => void | Promise<void>;
  onRemoveStop?: (id: string) => void | Promise<void>;
  /** API: approve (publish) a pending driver stop. */
  onPublishStop?: (id: string) => void | Promise<void>;
  /** API: reject a pending driver stop. */
  onDeclineStop?: (id: string, reason: string) => void | Promise<void>;
};

function statusTone(
  status: TransportStop["approvalStatus"],
): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: TransportStop["approvalStatus"]): string {
  if (status === "approved") return "Published";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return "—";
}

export function TransportStopsView({
  snapshot,
  onChange,
  writesEnabled = true,
  allowCreate = true,
  listBlocked = false,
  listHint = null,
  routeOptions,
  onPersistStop,
  onRemoveStop,
  onPublishStop,
  onDeclineStop,
}: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(snapshot.settings.defaultNotificationRadiusM);
  const [location, setLocation] = useState<LocationPasteValue | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [routeId, setRouteId] = useState("");
  const [editRouteId, setEditRouteId] = useState<string | undefined>();

  const canCreate = writesEnabled && allowCreate;
  const canOpenModal = writesEnabled && (allowCreate || Boolean(editId));
  const pendingCount = useMemo(
    () => snapshot.stops.filter((s) => s.approvalStatus === "pending").length,
    [snapshot.stops],
  );

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return snapshot.stops;
    return snapshot.stops.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.locationLabel.toLowerCase().includes(needle),
    );
  }, [snapshot.stops, searchQuery]);

  const startCreate = () => {
    if (!canCreate) return;
    setEditId(undefined);
    setEditRouteId(undefined);
    setName("");
    setRadius(snapshot.settings.defaultNotificationRadiusM);
    setLocation(null);
    setRouteId(routeOptions?.[0]?.id ?? "");
    setOpen(true);
  };

  const startEdit = (s: TransportStop) => {
    setEditId(s.id);
    setEditRouteId(s.routeId);
    setName(s.name.includes(" · ") ? s.name.split(" · ").slice(1).join(" · ") : s.name);
    setRadius(s.notificationRadiusM);
    setLocation({ lat: s.lat, lng: s.lng, locationLabel: s.locationLabel });
    setRouteId(s.routeId ?? "");
    setOpen(true);
  };

  const publishStop = (id: string) => {
    if (!onPublishStop) return;
    setBusyId(id);
    void Promise.resolve(onPublishStop(id))
      .then(() => notify("Stop published"))
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to publish stop");
      })
      .finally(() => setBusyId(null));
  };

  const confirmDecline = () => {
    if (!declineId || !onDeclineStop) return;
    const reason = declineReason.trim();
    if (!reason) {
      notify("Enter a reason to decline");
      return;
    }
    const id = declineId;
    setBusyId(id);
    void Promise.resolve(onDeclineStop(id, reason))
      .then(() => {
        setDeclineId(null);
        setDeclineReason("");
        notify("Stop declined");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to decline stop");
      })
      .finally(() => setBusyId(null));
  };

  const save = () => {
    if (!editId && !canCreate) {
      notify("Admin cannot create stops — publish driver submissions on this list");
      return;
    }
    if (!name.trim()) {
      notify("Stop name is required");
      return;
    }
    if (!location) {
      notify("Paste a location from Google Maps or OpenStreetMap");
      return;
    }
    if (onPersistStop) {
      const resolvedRouteId = editId ? editRouteId ?? routeId : routeId;
      if (!resolvedRouteId) {
        notify("Select a route for this stop");
        return;
      }
      void Promise.resolve(
        onPersistStop({
          id: editId,
          routeId: resolvedRouteId,
          name: name.trim(),
          locationLabel: location.locationLabel,
          lat: location.lat,
          lng: location.lng,
          notificationRadiusM: radius || snapshot.settings.defaultNotificationRadiusM || 100,
        }),
      )
        .then(() => {
          setOpen(false);
          notify(editId ? "Stop updated" : "Stop added");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save stop");
        });
      return;
    }
    onChange(
      upsertStop(snapshot, {
        id: editId,
        name: name.trim(),
        locationLabel: location.locationLabel,
        lat: location.lat,
        lng: location.lng,
        notificationRadiusM: radius || snapshot.settings.defaultNotificationRadiusM || 100,
      }),
    );
    setOpen(false);
    notify(editId ? "Stop updated" : "Stop added");
  };

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stops…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <ToolbarSpacer />
        {pendingCount > 0 ? (
          <Pill tone="warning">{pendingCount} pending publish</Pill>
        ) : null}
        {canCreate ? (
          <Button variant="primary" size="sm" onClick={startCreate}>
            <Plus className="size-3.5" /> Add Stop
          </Button>
        ) : writesEnabled && !allowCreate ? (
          <Pill tone="neutral">Driver creates · Admin publishes</Pill>
        ) : !writesEnabled ? (
          <Pill tone="neutral">View only</Pill>
        ) : null}
      </PageToolbar>

      <Card>
        <CardHeader
          title="Stops"
          hint={
            listBlocked
              ? listHint ?? "Loading stops…"
              : `${rows.length} stops · ${
                  canCreate
                    ? "paste from Google Maps or OSM"
                    : "publish pending driver stops to make them live"
                }`
          }
        />
        {listBlocked ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<MapPin className="size-5" />}
              title="No stops yet"
              hint={
                allowCreate
                  ? "Open a map site, copy the link or coordinates, and paste here."
                  : "When drivers submit stops, use Publish on each pending stop here."
              }
              action={
                canCreate ? (
                  <Button variant="primary" size="sm" onClick={startCreate}>
                    <Plus className="size-3.5" /> Add Stop
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 divide-y divide-border">
            {rows.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-semibold">{s.name}</div>
                    {s.approvalStatus ? (
                      <Pill tone={statusTone(s.approvalStatus)}>
                        {statusLabel(s.approvalStatus)}
                      </Pill>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {s.locationLabel}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {s.lat.toFixed(5)}, {s.lng.toFixed(5)} · Radius {s.notificationRadiusM} m
                  </div>
                </div>
                <div className="inline-flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    title="Open in Google Maps"
                    onClick={() =>
                      window.open(
                        mapsUrlForCoords(s.lat, s.lng, "google"),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink className="size-3" />
                  </Button>
                  {writesEnabled && onPublishStop && s.approvalStatus === "pending" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busyId === s.id}
                      title="Publish stop"
                      onClick={() => publishStop(s.id)}
                    >
                      <Check className="size-3" />
                      Publish
                    </Button>
                  ) : null}
                  {writesEnabled && onDeclineStop && s.approvalStatus === "pending" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === s.id}
                      title="Decline stop"
                      onClick={() => {
                        setDeclineId(s.id);
                        setDeclineReason("");
                      }}
                    >
                      <X className="size-3" />
                      Decline
                    </Button>
                  ) : null}
                  {writesEnabled ? (
                    <>
                      <Button size="sm" onClick={() => startEdit(s)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {writesEnabled ? (
        <>
          <Modal
            open={open && (allowCreate || Boolean(editId))}
            onClose={() => setOpen(false)}
            title={editId ? "Edit stop" : "Add stop"}
            subtitle="Pick the place in Google Maps or OSM, then paste the link here"
            size="lg"
            footer={
              <>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={!canOpenModal && !editId}>
                  Save stop
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              {onPersistStop && !editId && routeOptions && routeOptions.length > 0 ? (
                <Field label="Route" required>
                  <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                    {routeOptions.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Stop name" required>
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Green Park Gate"
                />
              </Field>
              <Field label="Location" required hint="Open map → copy link or coordinates → paste">
                <LocationPastePicker
                  value={location}
                  onChange={setLocation}
                  searchHint={name}
                />
              </Field>
              <Field
                label="Notification radius (m)"
                hint={`Default ${snapshot.settings.defaultNotificationRadiusM || 100}m`}
              >
                <TextInput
                  type="number"
                  min={20}
                  value={radius}
                  onChange={(e) =>
                    setRadius(
                      Number(e.target.value) ||
                        snapshot.settings.defaultNotificationRadiusM ||
                        100,
                    )
                  }
                />
              </Field>
            </div>
          </Modal>

          <Modal
            open={Boolean(deleteId)}
            onClose={() => setDeleteId(null)}
            title="Delete stop"
            size="sm"
            footer={
              <>
                <Button onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (!deleteId) return;
                    if (onRemoveStop) {
                      void Promise.resolve(onRemoveStop(deleteId))
                        .then(() => {
                          setDeleteId(null);
                          notify("Stop deleted");
                        })
                        .catch((err) => {
                          notify(
                            err instanceof Error ? err.message : "Failed to delete stop",
                          );
                        });
                      return;
                    }
                    onChange(deleteStop(snapshot, deleteId));
                    setDeleteId(null);
                    notify("Stop deleted");
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="text-xs text-muted-foreground">
              Removing this stop also clears it from routes and students.
            </p>
          </Modal>

          <Modal
            open={Boolean(declineId)}
            onClose={() => {
              setDeclineId(null);
              setDeclineReason("");
            }}
            title="Decline stop"
            size="sm"
            footer={
              <>
                <Button
                  onClick={() => {
                    setDeclineId(null);
                    setDeclineReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={busyId === declineId}
                  onClick={confirmDecline}
                >
                  Decline
                </Button>
              </>
            }
          >
            <Field label="Reason" required>
              <TextInput
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Why this stop is declined"
              />
            </Field>
          </Modal>
        </>
      ) : null}
    </div>
  );
}
