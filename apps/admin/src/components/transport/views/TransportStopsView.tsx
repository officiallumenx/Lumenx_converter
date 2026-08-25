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
} from "@lumenx/ui-admin";
import { Plus, Pencil, Trash2, MapPin, ExternalLink } from "lucide-react";
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
};

export function TransportStopsView({ snapshot, onChange }: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(snapshot.settings.defaultNotificationRadiusM);
  const [location, setLocation] = useState<LocationPasteValue | null>(null);
  const [editId, setEditId] = useState<string | undefined>();

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
    setEditId(undefined);
    setName("");
    setRadius(snapshot.settings.defaultNotificationRadiusM);
    setLocation(null);
    setOpen(true);
  };

  const startEdit = (s: TransportStop) => {
    setEditId(s.id);
    setName(s.name);
    setRadius(s.notificationRadiusM);
    setLocation({ lat: s.lat, lng: s.lng, locationLabel: s.locationLabel });
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) {
      notify("Stop name is required");
      return;
    }
    if (!location) {
      notify("Paste a location from Google Maps or OpenStreetMap");
      return;
    }
    onChange(
      upsertStop(snapshot, {
        id: editId,
        name: name.trim(),
        locationLabel: location.locationLabel,
        lat: location.lat,
        lng: location.lng,
        notificationRadiusM: radius || 100,
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
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Stop
        </Button>
      </PageToolbar>

      <Card>
        <CardHeader
          title="Stops"
          hint={`${rows.length} stops · paste from Google Maps or OSM`}
        />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<MapPin className="size-5" />}
              title="No stops yet"
              hint="Open a map site, copy the link or coordinates, and paste here."
              action={
                <Button variant="primary" size="sm" onClick={startCreate}>
                  <Plus className="size-3.5" /> Add Stop
                </Button>
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
                  <div className="text-xs font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {s.locationLabel}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {s.lat.toFixed(5)}, {s.lng.toFixed(5)} · Radius {s.notificationRadiusM} m
                  </div>
                </div>
                <div className="inline-flex gap-1">
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
                  <Button size="sm" onClick={() => startEdit(s)}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit stop" : "Add stop"}
        subtitle="Pick the place in Google Maps or OSM, then paste the link here"
        size="lg"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save stop
            </Button>
          </>
        }
      >
        <div className="space-y-3">
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
          <Field label="Notification radius (m)" hint="Default 100m">
            <TextInput
              type="number"
              min={20}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value) || 100)}
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
    </div>
  );
}
