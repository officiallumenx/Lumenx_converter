import { useState } from "react";
import { toast } from "sonner";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";

const TEAMS = {
  sports: ["Cricket Team 1", "Cricket Team 2", "Kabaddi Team 1"],
  eca: ["Dance Team", "Music Group"],
};

export function ActivityCertificatesPage() {
  const [activityType, setActivityType] = useState<"sports" | "eca">("sports");
  const [teams, setTeams] = useState<string[]>([]);

  const toggle = (team: string) => {
    setTeams((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]));
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Certificates"
        subtitle="Filter by Sports or ECA, select team(s), and issue certificates with student name, team name, and section."
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

        <div className="flex flex-wrap gap-2">
          {TEAMS[activityType].map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => toggle(team)}
              className={teams.includes(team) ? "activity-filter-chip is-active" : "activity-filter-chip"}
            >
              {team}
            </button>
          ))}
        </div>

        <Button
          className="rounded-xl"
          disabled={teams.length === 0}
          onClick={() =>
            toast.success(`Certificates queued for all members in ${teams.join(", ")}`)
          }
        >
          Issue certificates
        </Button>
        <p className="text-xs text-muted-foreground">
          Each certificate includes the student name, team name, and section name.
        </p>
      </section>
    </div>
  );
}
