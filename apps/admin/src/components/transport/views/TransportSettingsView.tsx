import { useEffect, useState } from "react";
import { Card, CardHeader, Button, Field, TextInput } from "@lumenx/ui-admin";
import { Crosshair, MapPin, Loader2 } from "lucide-react";
import {
  saveTransportSettings,
  type TransportSettings,
  type TransportSnapshot,
} from "@/lib/transport-store";
import { useAdminToast } from "@/components/AdminActionToast";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  onSaveSettings?: (settings: TransportSettings) => void | Promise<void>;
};

const WEEKDAYS = [
  { key: "Mon", label: "Mon" },
  { key: "Tue", label: "Tue" },
  { key: "Wed", label: "Wed" },
  { key: "Thu", label: "Thu" },
  { key: "Fri", label: "Fri" },
  { key: "Sat", label: "Sat" },
  { key: "Sun", label: "Sun" },
] as const;

const DEFAULT_STOP_RADIUS_M = 150;
const DEFAULT_SCHOOL_RADIUS_M = 150;

function geolocationErrorMessage(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Location permission denied. Allow location for this site, then try again.";
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return "Location unavailable. Move outdoors or check device GPS.";
  }
  if (err.code === err.TIMEOUT) {
    return "Location timed out. Try again.";
  }
  return "Could not detect location.";
}

function normalizeRadius(value: number | null | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function TransportSettingsView({
  snapshot,
  onChange,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
  onSaveSettings,
}: Props) {
  const notify = useAdminToast();
  const [draft, setDraft] = useState<TransportSettings>(() => ({
    ...snapshot.settings,
    defaultNotificationRadiusM: normalizeRadius(
      snapshot.settings.defaultNotificationRadiusM,
      DEFAULT_STOP_RADIUS_M,
    ),
    schoolNotificationRadiusM: normalizeRadius(
      snapshot.settings.schoolNotificationRadiusM,
      DEFAULT_SCHOOL_RADIUS_M,
    ),
  }));
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setDraft({
      ...snapshot.settings,
      defaultNotificationRadiusM: normalizeRadius(
        snapshot.settings.defaultNotificationRadiusM,
        DEFAULT_STOP_RADIUS_M,
      ),
      schoolNotificationRadiusM: normalizeRadius(
        snapshot.settings.schoolNotificationRadiusM,
        DEFAULT_SCHOOL_RADIUS_M,
      ),
    });
  }, [snapshot.settings]);

  const toggleDay = (key: string) => {
    if (!writesEnabled) return;
    const has = draft.workingDays.includes(key);
    setDraft({
      ...draft,
      workingDays: has
        ? draft.workingDays.filter((d) => d !== key)
        : [...draft.workingDays, key],
    });
  };

  const detectSchoolLocation = () => {
    if (!writesEnabled || detecting) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      notify("Location is not supported in this browser", "error");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraft((prev) => ({
          ...prev,
          schoolLatitude: lat,
          schoolLongitude: lng,
          schoolLocationLabel: `School · ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          schoolNotificationRadiusM: normalizeRadius(
            prev.schoolNotificationRadiusM,
            DEFAULT_SCHOOL_RADIUS_M,
          ),
        }));
        setDetecting(false);
        notify("School location detected from your device", "success");
      },
      (err) => {
        setDetecting(false);
        notify(geolocationErrorMessage(err), "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      },
    );
  };

  const save = () => {
    if (!writesEnabled) return;
    if (draft.defaultNotificationRadiusM < 20) {
      notify("Normal stop radius should be at least 20m");
      return;
    }
    if ((draft.schoolNotificationRadiusM ?? DEFAULT_SCHOOL_RADIUS_M) < 20) {
      notify("School stop radius should be at least 20m");
      return;
    }
    if (onSaveSettings) {
      void Promise.resolve(onSaveSettings(draft))
        .then(() => notify("Transport settings saved"))
        .catch((err) => {
          notify(
            err instanceof Error ? err.message : "Failed to save settings",
            "error",
          );
        });
      return;
    }
    onChange(saveTransportSettings(snapshot, draft));
    notify("Transport settings saved");
  };

  if (listBlocked) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {listHint ?? "Loading transport settings…"}
      </div>
    );
  }

  const hasSchool =
    draft.schoolLatitude != null &&
    draft.schoolLongitude != null &&
    Number.isFinite(draft.schoolLatitude) &&
    Number.isFinite(draft.schoolLongitude);

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader
          title="Transport settings"
          hint={
            writesEnabled
              ? "Defaults for stops and trip planning"
              : "View-only defaults"
          }
        />
        <div className="px-5 pb-5 space-y-4">
          <Field
            label="School endpoint"
            hint="Stand at the school gate and detect your location. Used as the boarding end for every bus."
          >
            {writesEnabled ? (
              <div className="space-y-3">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={detecting}
                  onClick={detectSchoolLocation}
                  className="gap-2"
                >
                  {detecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="size-3.5" />
                  )}
                  {detecting
                    ? "Detecting…"
                    : hasSchool
                      ? "Update from my location"
                      : "Detect my location"}
                </Button>
                {hasSchool ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex gap-2">
                    <MapPin className="size-3.5 mt-0.5 text-teal-700 shrink-0" />
                    <div className="min-w-0 space-y-1 flex-1">
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {draft.schoolLatitude!.toFixed(5)},{" "}
                        {draft.schoolLongitude!.toFixed(5)}
                      </p>
                      <TextInput
                        className="h-7 text-xs"
                        value={draft.schoolLocationLabel ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolLocationLabel: e.target.value,
                          })
                        }
                        placeholder="Label (optional)"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            schoolLatitude: null,
                            schoolLongitude: null,
                            schoolLocationLabel: null,
                          })
                        }
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not set — use Detect my location while on campus.
                  </p>
                )}
              </div>
            ) : hasSchool ? (
              <p className="text-sm text-foreground">
                {draft.schoolLocationLabel?.trim() ||
                  `${draft.schoolLatitude!.toFixed(5)}, ${draft.schoolLongitude!.toFixed(5)}`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </Field>

          <Field
            label="School stop radius (m)"
            hint={`Approach radius for the school endpoint only. Default ${DEFAULT_SCHOOL_RADIUS_M}m.`}
          >
            <TextInput
              type="number"
              min={20}
              disabled={!writesEnabled}
              value={draft.schoolNotificationRadiusM ?? DEFAULT_SCHOOL_RADIUS_M}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === "") {
                  setDraft({
                    ...draft,
                    schoolNotificationRadiusM: DEFAULT_SCHOOL_RADIUS_M,
                  });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  setDraft({
                    ...draft,
                    schoolNotificationRadiusM: parsed,
                  });
                }
              }}
            />
          </Field>

          <Field
            label="Normal stop radius (m)"
            hint={`Default for student pickup/drop stops. Default ${DEFAULT_STOP_RADIUS_M}m.`}
          >
            <TextInput
              type="number"
              min={20}
              disabled={!writesEnabled}
              value={draft.defaultNotificationRadiusM}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === "") {
                  setDraft({
                    ...draft,
                    defaultNotificationRadiusM: DEFAULT_STOP_RADIUS_M,
                  });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  setDraft({
                    ...draft,
                    defaultNotificationRadiusM: parsed,
                  });
                }
              }}
            />
          </Field>

          <Field label="Pickup buffer (minutes)" hint="Lead time before scheduled pickup">
            <TextInput
              type="number"
              min={0}
              disabled={!writesEnabled}
              value={draft.defaultPickupBufferMins}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultPickupBufferMins: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="Default pickup time" hint="HH:MM used for trip planning">
            <TextInput
              type="time"
              disabled={!writesEnabled}
              value={draft.defaultPickupTime ?? "07:30"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultPickupTime: e.target.value || "07:30",
                })
              }
            />
          </Field>
          <Field label="Notifications">
            <label
              className={`flex items-center gap-2 text-xs text-muted-foreground ${
                writesEnabled ? "cursor-pointer" : "opacity-70"
              }`}
            >
              <input
                type="checkbox"
                className="size-3.5"
                disabled={!writesEnabled}
                checked={draft.notificationsEnabled !== false}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    notificationsEnabled: e.target.checked,
                  })
                }
              />
              <span>Enable transport approach notifications</span>
            </label>
          </Field>
          <Field label="Remember device">
            <label
              className={`flex items-center gap-2 text-xs text-muted-foreground ${
                writesEnabled ? "cursor-pointer" : "opacity-70"
              }`}
            >
              <input
                type="checkbox"
                className="size-3.5"
                disabled={!writesEnabled}
                checked={draft.rememberEnabled !== false}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rememberEnabled: e.target.checked,
                  })
                }
              />
              <span>Allow Transport app to remember signed-in drivers</span>
            </label>
          </Field>
          <Field label="Working days">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = draft.workingDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    disabled={!writesEnabled}
                    onClick={() => toggleDay(d.key)}
                    className={`px-2.5 h-8 rounded-lg text-[11px] font-medium border transition-colors ${
                      on
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-muted/40 border-border text-muted-foreground"
                    } ${!writesEnabled ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>
          {writesEnabled ? (
            <div className="pt-1">
              <Button variant="primary" size="sm" onClick={save}>
                Save settings
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
