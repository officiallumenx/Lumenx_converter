import { useEffect, useState } from "react";
import { Card, CardHeader, Button, Field, TextInput } from "@lumenx/ui-admin";
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

export function TransportSettingsView({
  snapshot,
  onChange,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
}: Props) {
  const notify = useAdminToast();
  const [draft, setDraft] = useState<TransportSettings>(() => ({ ...snapshot.settings }));

  useEffect(() => {
    setDraft({ ...snapshot.settings });
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

  const save = () => {
    if (!writesEnabled) return;
    if (draft.defaultNotificationRadiusM < 20) {
      notify("Notification radius should be at least 20m");
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

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader
          title="Transport settings"
          hint={
            writesEnabled
              ? "Defaults for stops and trip planning"
              : "Read-only defaults from API"
          }
        />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Default notification radius (m)" hint="Used when creating new stops">
            <TextInput
              type="number"
              min={20}
              disabled={!writesEnabled}
              value={draft.defaultNotificationRadiusM}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultNotificationRadiusM: Number(e.target.value) || 100,
                })
              }
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
