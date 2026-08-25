import { useMemo, useState } from "react";
import { Button, TextInput } from "@lumenx/ui-admin";
import { GripVertical, Plus } from "lucide-react";
import type { TransportStop } from "@/lib/transport-store";
import {
  LocationPastePicker,
  type LocationPasteValue,
} from "@/components/transport/LocationPastePicker";

export type PendingRouteStop = {
  key: string;
  stopId?: string;
  name: string;
  locationLabel: string;
  lat: number;
  lng: number;
  notificationRadiusM: number;
  isNew: boolean;
};

type Props = {
  availableStops: TransportStop[];
  ordered: PendingRouteStop[];
  defaultRadiusM: number;
  onChange: (next: PendingRouteStop[]) => void;
};

export function stopsToPending(
  stopIds: string[],
  allStops: TransportStop[],
): PendingRouteStop[] {
  return stopIds
    .map((id) => {
      const s = allStops.find((x) => x.id === id);
      if (!s) return null;
      return {
        key: s.id,
        stopId: s.id,
        name: s.name,
        locationLabel: s.locationLabel,
        lat: s.lat,
        lng: s.lng,
        notificationRadiusM: s.notificationRadiusM,
        isNew: false,
      } satisfies PendingRouteStop;
    })
    .filter(Boolean) as PendingRouteStop[];
}

export function RouteStopComposer({
  availableStops,
  ordered,
  defaultRadiusM,
  onChange,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [pasteValue, setPasteValue] = useState<LocationPasteValue | null>(null);

  const orderedKeys = useMemo(() => new Set(ordered.map((s) => s.key)), [ordered]);

  const toggleExisting = (stop: TransportStop) => {
    if (orderedKeys.has(stop.id)) {
      onChange(ordered.filter((s) => s.key !== stop.id));
      return;
    }
    onChange([
      ...ordered,
      {
        key: stop.id,
        stopId: stop.id,
        name: stop.name,
        locationLabel: stop.locationLabel,
        lat: stop.lat,
        lng: stop.lng,
        notificationRadiusM: stop.notificationRadiusM,
        isNew: false,
      },
    ]);
  };

  const addPastedStop = () => {
    if (!pasteValue || !newName.trim()) return;
    const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    onChange([
      ...ordered,
      {
        key: tempId,
        name: newName.trim(),
        locationLabel: pasteValue.locationLabel,
        lat: pasteValue.lat,
        lng: pasteValue.lng,
        notificationRadiusM: defaultRadiusM,
        isNew: true,
      },
    ]);
    setPasteValue(null);
    setNewName("");
    setAddingNew(false);
  };

  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...ordered];
    const [moved] = next.splice(dragIndex, 1);
    if (!moved) return;
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(index);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Select existing stops, or paste a new location from Google Maps / OSM.
        </p>
        {availableStops.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved stops yet — add one below.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableStops.map((s) => {
              const selected = orderedKeys.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleExisting(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                    selected
                      ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!addingNew ? (
        <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}>
          <Plus className="size-3.5" /> Add stop from map link
        </Button>
      ) : (
        <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
          <TextInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Stop name (e.g. Green Park Gate)"
          />
          <LocationPastePicker
            value={pasteValue}
            onChange={setPasteValue}
            searchHint={newName}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!pasteValue || !newName.trim()}
              onClick={addPastedStop}
            >
              Add to route
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAddingNew(false);
                setPasteValue(null);
                setNewName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {ordered.length > 0 ? (
        <ul className="rounded-lg border border-border divide-y divide-border">
          {ordered.map((s, index) => (
            <li
              key={s.key}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-start gap-2 px-3 py-2 text-xs cursor-grab active:cursor-grabbing ${
                dragIndex === index ? "bg-muted/60" : "bg-background"
              }`}
            >
              <GripVertical className="size-3.5 text-muted-foreground mt-1 shrink-0" />
              <span className="mt-0.5 size-5 rounded-full bg-teal-700 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <TextInput
                  value={s.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    onChange(ordered.map((x) => (x.key === s.key ? { ...x, name } : x)));
                  }}
                  placeholder="Stop name"
                  className="h-7 text-xs"
                />
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {s.locationLabel}
                  {s.isNew ? " · new" : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 mt-1"
                onClick={() => onChange(ordered.filter((x) => x.key !== s.key))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Add at least two stops to build a route.
        </p>
      )}
    </div>
  );
}
