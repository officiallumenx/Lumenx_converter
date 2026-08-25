import { useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { captureCurrentGps } from "@/lib/transport/capture-gps";
import type { GpsFix } from "@/lib/transport/route-setup/types";

import { StudentAssignmentPicker } from "./StudentAssignmentPicker";

type Props = {
  progressLabel: string;
  initialName?: string;
  initialLocationLabel?: string;
  initialStudentIds?: string[];
  initialGps?: GpsFix | null;
  /** When editing, allow refreshing GPS */
  allowGpsRefresh?: boolean;
  submitLabel?: string;
  /** Admin vehicle id for this driver's bus */
  vehicleId: string;
  /** Display bus number for student picker hint */
  busNumber?: string;
  /** When editing / change-request, exclude this stop from duplicate student checks */
  excludeStopId?: string;
  /** When true, form is a change request against an approved stop */
  isChangeRequest?: boolean;
  onCancel: () => void;
  onSave: (data: {
    name: string;
    locationLabel: string;
    studentIds: string[];
    latitude: number;
    longitude: number;
  }) => Promise<void>;
};

export function SaveStopForm({
  progressLabel,
  initialName = "",
  initialLocationLabel = "",
  initialStudentIds = [],
  initialGps,
  allowGpsRefresh = false,
  submitLabel = "Submit for Approval",
  vehicleId,
  busNumber,
  excludeStopId,
  isChangeRequest = false,
  onCancel,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [locationLabel, setLocationLabel] = useState(
    initialLocationLabel ||
      (initialGps ? `${initialGps.latitude.toFixed(5)}, ${initialGps.longitude.toFixed(5)}` : ""),
  );
  const [studentIds, setStudentIds] = useState<string[]>(initialStudentIds);
  const [gps, setGps] = useState<GpsFix | null>(initialGps ?? null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshGps = async () => {
    setRefreshing(true);
    try {
      const fix = await captureCurrentGps({ allowDemo: false });
      setGps(fix);
      setLocationLabel(`${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)}`);
      toast.success("GPS updated");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not get GPS. Turn on location and try again.";
      toast.error("Location needed", { description: message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Enter a stop name");
      return;
    }
    if (!gps) {
      toast.error("GPS location missing. Capture location first.");
      return;
    }
    if (gps.source === "demo") {
      toast.error("Real GPS required", {
        description: "Turn on location and refresh GPS before submitting this stop.",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        locationLabel: locationLabel.trim(),
        studentIds,
        latitude: gps.latitude,
        longitude: gps.longitude,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save stop.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-transport/30 bg-transport/10 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-transport">Route Setup</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-foreground">{progressLabel}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-transport" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">GPS captured</p>
            {gps ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
                {gps.accuracyM != null ? ` · ±${Math.round(gps.accuracyM)}m` : ""}
                {gps.source === "demo" ? " · demo" : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No fix yet</p>
            )}
          </div>
        </div>
        {allowGpsRefresh ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={refreshing}
            onClick={() => void refreshGps()}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Update Current GPS
          </Button>
        ) : null}
      </div>

      <FormField id="stop-name" label="Stop Name" hint="Name this bus stop for parents and Admin">
        <Input
          id="stop-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lakeview Gate"
          autoFocus
        />
      </FormField>

      <FormField id="stop-location" label="Location / address" hint="Area label shown to Admin and parents">
        <Input
          id="stop-location"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          placeholder="e.g. Lakeview Apartments gate"
        />
      </FormField>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Add students</p>
        <StudentAssignmentPicker
          selectedIds={studentIds}
          onChange={setStudentIds}
          vehicleId={vehicleId}
          busNumber={busNumber}
          excludeStopId={excludeStopId}
        />
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
        <p className="font-semibold text-foreground">Review before submit</p>
        <p className="text-muted-foreground">
          Stop: <span className="text-foreground">{name.trim() || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Students:{" "}
          <span className="text-foreground">
            {studentIds.length === 0 ? "None selected" : `${studentIds.length} selected`}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {isChangeRequest
            ? "Submitting creates a change request. The approved stop stays active until Admin approves."
            : "After you submit, this stop shows Waiting for Admin until they approve."}
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          type="button"
          variant="transport"
          size="lg"
          expanded
          loading={saving}
          onClick={() => void handleSave()}
        >
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" expanded onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
