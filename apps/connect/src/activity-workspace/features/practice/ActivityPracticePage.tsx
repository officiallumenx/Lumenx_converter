import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { HierarchyDomainSelect } from "@/activity-workspace/shared/components/HierarchyDomainSelect";
import { HierarchyUnitMultiSelect } from "@/activity-workspace/shared/components/HierarchyUnitSelect";
import { useHierarchyUnits } from "@/activity-workspace/shared/hooks/useHierarchyUnits";
import {
  formatUnitLabel,
  unitKindLabel,
  type ActivityDomain,
} from "@/lib/activity/hierarchy";
import { workspaceCalendarRepository } from "@/lib/activity/workspace-calendar";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import { createPracticeSession } from "@/lib/activity/api";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ActivityPracticePage() {
  const [domain, setDomain] = useState<ActivityDomain>("sports");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const { units, loading } = useHierarchyUnits(domain);

  const day = useMemo(() => {
    if (!date) return "";
    const d = new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
  }, [date]);

  const selected = useMemo(
    () => units.filter((u) => selectedIds.includes(u.id)),
    [units, selectedIds],
  );

  const unitWord = units[0] ? unitKindLabel(units[0].kind).toLowerCase() : "team";

  const assign = async () => {
    if (!date || !time || !day || selected.length === 0) return;
    const labels = selected.map(formatUnitLabel);
    if (isApiAuthMode()) {
      const instituteId = getActivityApiInstituteId();
      if (!instituteId) return;
      await Promise.all(
        selected.map((unit) =>
          createPracticeSession({
            instituteId,
            teamId: unit.id,
            title: `Practice · ${formatUnitLabel(unit)}`,
            scheduledOn: date,
            startTime: time,
            notes: `${day} practice`,
          }),
        ),
      );
      await workspaceCalendarRepository.preload();
    } else {
      await workspaceCalendarRepository.addPractice({
        title: `Practice · ${labels.join(", ")}`,
        date,
        startTime: time,
        unitIds: selected.map((u) => u.id),
        unitLabels: labels,
      });
    }
    await workspaceCommunicationRepository.pushFromActivity({
      title: "Practice assigned",
      body: `${labels.join(", ")} · ${day} ${date} at ${time} — added to Calendar.`,
      audienceLabel: `Practice · ${labels.join(", ")}`,
    });
    toast.success("Practice assigned", {
      description: `${labels.join(", ")} · ${day} ${date} at ${time} — on Calendar`,
    });
    setSelectedIds([]);
    setDate("");
    setTime("");
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Practice"
        subtitle="Pick a team or group, then set date and time."
      />

      <section className="activity-panel space-y-5">
        <div>
          <p className="activity-stat-label mb-2">1 · Sports or ECA</p>
          <HierarchyDomainSelect
            value={domain}
            hideLabel
            onChange={(d) => {
              setDomain(d);
              setSelectedIds([]);
            }}
          />
        </div>
        <div>
          <p className="activity-stat-label mb-2">2 · Select {unitWord}(s)</p>
          <HierarchyUnitMultiSelect
            units={units}
            selectedIds={selectedIds}
            hideLabel
            onChange={setSelectedIds}
            loading={loading}
          />
        </div>

        <div>
          <p className="activity-stat-label mb-2">3 · Date and time</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <ConnectDatePicker
                label="Date"
                value={date}
                onChange={setDate}
                placeholder="Select date"
              />
              {day ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{day}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="min-h-11 rounded-xl border-border bg-card"
              />
            </div>
          </div>
        </div>

        <Button
          className="activity-primary-action w-full rounded-xl sm:w-auto"
          disabled={!date || !time || !day || selected.length === 0}
          onClick={() => void assign()}
        >
          Assign practice
        </Button>
        <p className="text-xs text-muted-foreground">
          Assigned practice appears on the Calendar under Practice.
        </p>
      </section>
    </ActivityPageShell>
  );
}
