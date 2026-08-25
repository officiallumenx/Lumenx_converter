import { useState } from "react";
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

export function TransportSettingsView({ snapshot, onChange }: Props) {
  const notify = useAdminToast();
  const [draft, setDraft] = useState<TransportSettings>(() => ({ ...snapshot.settings }));

  const toggleDay = (key: string) => {
    const has = draft.workingDays.includes(key);
    setDraft({
      ...draft,
      workingDays: has
        ? draft.workingDays.filter((d) => d !== key)
        : [...draft.workingDays, key],
    });
  };

  const save = () => {
    if (draft.defaultNotificationRadiusM < 20) {
      notify("Notification radius should be at least 20m");
      return;
    }
    onChange(saveTransportSettings(snapshot, draft));
    notify("Transport settings saved");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader title="Transport settings" hint="Defaults for stops and trip planning" />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Default notification radius (m)" hint="Used when creating new stops">
            <TextInput
              type="number"
              min={20}
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
                    onClick={() => toggleDay(d.key)}
                    className={`px-2.5 h-8 rounded-lg text-[11px] font-medium border transition-colors ${
                      on
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="pt-1">
            <Button variant="primary" size="sm" onClick={save}>
              Save settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
