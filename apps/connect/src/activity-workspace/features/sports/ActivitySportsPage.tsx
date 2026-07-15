import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import type { SportsProgramSectionInput } from "@/lib/activity/sports/sections-types";
import { SportsSectionFormDialog } from "./components/SportsSectionFormDialog";
import { SportsSectionsView } from "./views/SportsSectionsView";
import { SportsTeamsView } from "./views/SportsTeamsView";
import { SportsTeamDetailView } from "./views/SportsTeamDetailView";
import { useSportsProgramSections } from "./hooks/useSportsProgramSections";

export function ActivitySportsPage() {
  const search = useSearch({ from: "/activity/sports" });
  const nav = useNavigate();
  const { sections, isLoading, refresh: refreshSections } = useSportsProgramSections();
  const [sectionFormOpen, setSectionFormOpen] = useState(false);

  const sectionId = search.section;
  const teamId = search.team;

  const activeSection = sectionId ? sections.find((s) => s.id === sectionId) : null;

  const goToSections = () => {
    nav({ to: "/activity/sports", search: {} });
  };

  const goToTeams = (id: string, replace = false) => {
    nav({ to: "/activity/sports", search: { section: id }, replace });
  };

  const goToTeam = (section: string, team: string) => {
    nav({ to: "/activity/sports", search: { section, team } });
  };

  const handleCreateSection = async (input: SportsProgramSectionInput) => {
    const created = await sportsRepository.createSection(input);
    toast.success("Section created", { description: created.name });
    refreshSections();
    goToTeams(created.id);
  };

  const renderBody = () => {
    if (isLoading) {
      return <PageSkeleton rows={4} />;
    }

    if (sections.length === 0) {
      return (
        <div className="activity-panel py-12 text-center">
          <p className="text-sm font-medium">No sport sections yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start by creating a section — e.g. Cricket or Kabaddi.
          </p>
          <button
            type="button"
            onClick={() => setSectionFormOpen(true)}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Create first section
          </button>
        </div>
      );
    }

    if (teamId && activeSection) {
      return (
        <SportsTeamDetailView
          teamId={teamId}
          sectionName={activeSection.name}
          onBack={() => goToTeams(activeSection.id)}
        />
      );
    }

    if (sectionId) {
      if (!activeSection) {
        return (
          <div className="activity-panel py-10 text-center">
            <p className="text-sm font-medium">Section not found</p>
            <button
              type="button"
              onClick={goToSections}
              className="mt-4 text-sm font-medium text-primary"
            >
              Back to sections
            </button>
          </div>
        );
      }

      return (
        <SportsTeamsView
          section={activeSection}
          sections={sections}
          onBack={goToSections}
          onOpenTeam={(id) => goToTeam(activeSection.id, id)}
          onSwitchSection={(id) => goToTeams(id, true)}
          onCreateSection={() => setSectionFormOpen(true)}
        />
      );
    }

    return (
      <SportsSectionsView
        sections={sections}
        onOpenSection={goToTeams}
        onCreateSection={() => setSectionFormOpen(true)}
      />
    );
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Sports"
        subtitle="Create sport sections, add teams or groups, and assign students."
      />

      {renderBody()}

      <SportsSectionFormDialog
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        onSubmit={handleCreateSection}
      />
    </div>
  );
}
