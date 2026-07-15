import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import type { SportsTeamGroupInput } from "@/lib/activity/sports/types";
import type { SportsProgramSection } from "../types";
import { useSportsTeams } from "../hooks/useSportsTeams";
import { SportsBackBar } from "../components/SportsBackBar";
import { SportsSectionNav } from "../components/SportsSectionNav";
import { SportsTeamsToolbar } from "../components/teams/SportsTeamsToolbar";
import { SportsTeamCard } from "../components/teams/SportsTeamCard";
import { SportsTeamFormDialog } from "../components/teams/SportsTeamFormDialog";

type Props = {
  section: SportsProgramSection;
  sections: SportsProgramSection[];
  onBack: () => void;
  onOpenTeam: (teamId: string) => void;
  onSwitchSection: (sectionId: string) => void;
  onCreateSection: () => void;
};

export function SportsTeamsView({
  section,
  sections,
  onBack,
  onOpenTeam,
  onSwitchSection,
  onCreateSection,
}: Props) {
  const { teams, isLoading, refresh } = useSportsTeams({ sectionId: section.id, status: "active" });
  const [formOpen, setFormOpen] = useState(false);

  const handleFormSubmit = async (input: SportsTeamGroupInput) => {
    const created = await sportsRepository.createTeamGroup(input);
    toast.success(`${input.unitType === "group" ? "Group" : "Team"} created`, {
      description: created.name,
    });
    refresh();
  };

  if (isLoading) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div className="min-w-0 space-y-4">
      <SportsBackBar label="Back to sections" onBack={onBack} />

      <SportsSectionNav
        sections={sections}
        activeSectionId={section.id}
        onChange={onSwitchSection}
        onCreateSection={onCreateSection}
      />

      <SportsTeamsToolbar
        sectionName={section.name}
        onCreate={() => setFormOpen(true)}
        totalCount={teams.length}
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams or groups yet"
          description={`Add teams or groups under ${section.name}, then assign students to each.`}
          action={
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Add team / group
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {teams.map((team) => (
            <SportsTeamCard key={team.id} team={team} onClick={() => onOpenTeam(team.id)} />
          ))}
        </div>
      )}

      <SportsTeamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sectionId={section.id}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
