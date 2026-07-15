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
  Textarea,
} from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { WorkspaceCommunicationPage } from "../communication";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";

const DEMO_TEAMS = {
  sports: ["Cricket Team 1", "Cricket Team 2", "Kabaddi Team 1", "Group 2"],
  eca: ["Dance Team", "Music Group", "Drama Club"],
};

export function ActivityMessagesPage() {
  const [activityType, setActivityType] = useState<"sports" | "eca">("sports");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const teams = DEMO_TEAMS[activityType];

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team],
    );
  };

  const send = async () => {
    if (!title.trim() || !body.trim() || selectedTeams.length === 0) return;
    await workspaceCommunicationRepository.sendMessage({
      title: title.trim(),
      body: body.trim(),
      activityType,
      teamLabels: selectedTeams,
    });
    toast.success("Message sent to selected teams");
    setTitle("");
    setBody("");
    setSelectedTeams([]);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Send messages team-wise — select Sports or ECA, then one or more teams."
      />

      <section className="activity-panel space-y-4">
        <h2 className="font-semibold text-sm">Send to teams</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</label>
            <Select
              value={activityType}
              onValueChange={(v) => {
                setActivityType(v as "sports" | "eca");
                setSelectedTeams([]);
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="eca">Extra-Curricular (ECA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Select team(s)
          </label>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => {
              const active = selectedTeams.includes(team);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => toggleTeam(team)}
                  className={
                    active
                      ? "activity-filter-chip is-active"
                      : "activity-filter-chip"
                  }
                >
                  {team}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Message subject"
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Message</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message to related students…"
            className="min-h-[100px] rounded-xl"
          />
        </div>
        <Button
          className="rounded-xl"
          disabled={!title.trim() || !body.trim() || selectedTeams.length === 0}
          onClick={() => void send()}
        >
          Send to selected teams
        </Button>
      </section>

      <WorkspaceCommunicationPage
        key={refreshKey}
        embedded
        kind="message"
        title="Inbox"
        subtitle="Activity workspace messages only — not subject-teacher class messages."
      />
    </div>
  );
}
