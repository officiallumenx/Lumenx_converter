import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";

const TEAMS = {
  sports: ["Cricket Team 1", "Cricket Team 2", "Kabaddi Team 1"],
  eca: ["Dance Team", "Music Group"],
};

export function ActivityPracticePage() {
  const [activityType, setActivityType] = useState<"sports" | "eca">("sports");
  const [teams, setTeams] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const toggleTeam = (team: string) => {
    setTeams((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]));
  };

  const assign = () => {
    if (!date || !time || teams.length === 0) return;
    toast.success("Practice session assigned", {
      description: `${teams.join(", ")} · ${date} at ${time}`,
    });
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Practice sessions"
        subtitle="Select Sports or ECA, choose team(s), and assign date, day, and time."
      />

      <section className="activity-panel space-y-4">
        <Select
          value={activityType}
          onValueChange={(v) => {
            setActivityType(v as "sports" | "eca");
            setTeams([]);
          }}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="eca">Extra-Curricular</SelectItem>
          </SelectContent>
        </Select>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Select team(s)
          </label>
          <div className="flex flex-wrap gap-2">
            {TEAMS[activityType].map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => toggleTeam(team)}
                className={teams.includes(team) ? "activity-filter-chip is-active" : "activity-filter-chip"}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <Button
          className="rounded-xl"
          disabled={!date || !time || teams.length === 0}
          onClick={assign}
        >
          Assign practice session
        </Button>
      </section>
    </div>
  );
}
