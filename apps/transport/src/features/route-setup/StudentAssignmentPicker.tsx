import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  existingEnrollmentsForVehicle,
  newEnrollmentsForVehicle,
  TRANSPORT_OPS_CHANGED_EVENT,
  type TransportBusEnrollment,
} from "@lumenx/utils";
import { cn } from "@lumenx/ui";
import { studentIdsAssignedElsewhere } from "@/lib/transport/route-setup/store";

type StudentMode = "new" | "existing";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Admin vehicle id for this driver's bus */
  vehicleId: string;
  /** Display bus number */
  busNumber?: string;
  /** When editing a stop, exclude it from duplicate checks */
  excludeStopId?: string;
};

/**
 * Student picker from Admin bus enrollments — search, select, remove, duplicate guard.
 */
export function StudentAssignmentPicker({
  selectedIds,
  onChange,
  disabled,
  vehicleId,
  busNumber = "—",
  excludeStopId,
}: Props) {
  const [mode, setMode] = useState<StudentMode>("new");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRANSPORT_OPS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const occupiedElsewhere = useMemo(() => {
    void tick;
    return studentIdsAssignedElsewhere(excludeStopId);
  }, [excludeStopId, tick]);

  const list = useMemo((): TransportBusEnrollment[] => {
    void tick;
    return mode === "new"
      ? newEnrollmentsForVehicle(vehicleId)
      : existingEnrollmentsForVehicle(vehicleId);
  }, [mode, vehicleId, tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentClass.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q),
    );
  }, [list, query]);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedRows = useMemo(() => {
    const byId = new Map(
      [...newEnrollmentsForVehicle(vehicleId), ...existingEnrollmentsForVehicle(vehicleId)].map(
        (s) => [s.studentId, s] as const,
      ),
    );
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as TransportBusEnrollment[];
  }, [selectedIds, vehicleId, tick]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (occupiedElsewhere.has(id)) return;
    onChange([...selectedIds, id]);
  };

  const removeSelected = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-3">
      <FormField
        id="rs-student-mode"
        label="Students"
        hint="New = on this bus, location not assigned · Existing = already on a stop"
      >
        <select
          id="rs-student-mode"
          disabled={disabled}
          value={mode}
          onChange={(e) => setMode(e.target.value as StudentMode)}
          className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="new">New (no location yet)</option>
          <option value="existing">Existing (update location)</option>
        </select>
      </FormField>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search by name, class, or ID"
          className="pl-9"
          aria-label="Search students"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Bus {busNumber} · {filtered.length} in this list
      </p>

      {selectedRows.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-transport/30 bg-transport/5 p-3">
          <p className="text-xs font-medium text-foreground">
            Selected · {selectedRows.length} (review before submit)
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {selectedRows.map((s) => (
              <li key={s.studentId}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSelected(s.studentId)}
                  className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-medium ring-1 ring-border"
                >
                  {s.studentName}
                  <X className="size-3 text-muted-foreground" aria-hidden />
                  <span className="sr-only">Remove {s.studentName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {query.trim()
              ? `No students match “${query.trim()}”.`
              : mode === "new"
                ? `No students pending a stop. In Admin → Transport → Students, assign a student to ${busNumber} first.`
                : "No students with an existing stop on this bus yet."}
          </p>
        ) : (
          filtered.map((s) => {
            const on = selected.has(s.studentId);
            const duplicate = !on && occupiedElsewhere.has(s.studentId);
            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled || duplicate}
                onClick={() => toggle(s.studentId)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  on
                    ? "bg-transport/15 text-foreground ring-1 ring-transport/40"
                    : duplicate
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted/60 text-foreground",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.studentName}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.studentClass} · {s.vehicleNumber}
                    {s.stopName ? ` · ${s.stopName}` : " · stop pending"}
                    {duplicate ? " · already on another stop" : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "size-4 shrink-0 rounded border",
                    on ? "border-transport bg-transport" : "border-border",
                  )}
                  aria-hidden
                />
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          Clear selection
        </Button>
      ) : null}
    </div>
  );
}
