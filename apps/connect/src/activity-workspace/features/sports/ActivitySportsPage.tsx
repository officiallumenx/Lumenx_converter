import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { ActivityBrowseCard } from "@/activity-workspace/shared/ui/ActivityBrowseCard";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityInlineAdd } from "@/activity-workspace/shared/ui/ActivityInlineAdd";
import { ActivitySearchField } from "@/activity-workspace/shared/ui/ActivitySearchField";
import { ActivitySectionHeader } from "@/activity-workspace/shared/ui/ActivitySectionHeader";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { HierarchyBackBar } from "@/activity-workspace/shared/components/HierarchyBackBar";
import { StudentRosterEditor } from "@/activity-workspace/shared/components/StudentRosterEditor";
import {
  activityHierarchyRepository,
  SPORTS_CATEGORY_LABELS,
  type HierarchySport,
  type HierarchyStudent,
  type HierarchyTeam,
  type SportsCategory,
} from "@/lib/activity/hierarchy";

const CATEGORIES: SportsCategory[] = ["indoor", "outdoor"];

export function ActivitySportsPage() {
  const search = useSearch({ from: "/activity/sports" });
  const nav = useNavigate();

  const category = (search.category as SportsCategory | undefined) ?? undefined;
  const sportId = search.sport;
  const teamId = search.team;

  const go = (next: { category?: SportsCategory; sport?: string; team?: string }) => {
    nav({ to: "/activity/sports", search: next });
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Sports"
        subtitle="Pick a sport, open a team, manage students."
      />

      {!category && !sportId && !teamId ? (
        <SportsLandingView
          onOpenSport={(c, id) => go({ category: c, sport: id })}
        />
      ) : category && !sportId ? (
        <SportsListView
          category={category}
          onBack={() => go({})}
          onOpenSport={(id) => go({ category, sport: id })}
        />
      ) : category && sportId && !teamId ? (
        <SportsTeamsListView
          category={category}
          sportId={sportId}
          onBack={() => go({})}
          onOpenTeam={(id) => go({ category, sport: sportId, team: id })}
        />
      ) : category && sportId && teamId ? (
        <SportsTeamStudentsView
          category={category}
          sportId={sportId}
          teamId={teamId}
          onBack={() => go({ category, sport: sportId })}
        />
      ) : (
        <SportsLandingView
          onOpenSport={(c, id) => go({ category: c, sport: id })}
        />
      )}
    </ActivityPageShell>
  );
}

/** Indoor + Outdoor on one screen — avoids an extra category click. */
function SportsLandingView({
  onOpenSport,
}: {
  onOpenSport: (category: SportsCategory, sportId: string) => void;
}) {
  const [sports, setSports] = useState<HierarchySport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingFor, setAddingFor] = useState<SportsCategory | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void activityHierarchyRepository
      .listSports()
      .then((list) => {
        if (!cancelled) {
          setSports(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSports([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => {
    setLoading(true);
    void activityHierarchyRepository
      .listSports()
      .then((list) => {
        setSports(list);
        setLoading(false);
      })
      .catch(() => {
        setSports([]);
        setLoading(false);
      });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sports;
    return sports.filter((s) => s.name.toLowerCase().includes(q));
  }, [sports, query]);

  const byCategory = (c: SportsCategory) => filtered.filter((s) => s.category === c);

  const create = async (category: SportsCategory) => {
    if (!name.trim()) return;
    const created = await activityHierarchyRepository.createSport({
      name: name.trim(),
      category,
    });
    toast.success("Sport added", { description: created.name });
    setName("");
    setAddingFor(null);
    refresh();
    onOpenSport(category, created.id);
  };

  if (loading) return <PageSkeleton variant="list" rows={4} />;

  return (
    <div className="space-y-6">
      <ActivitySearchField
        value={query}
        onChange={setQuery}
        placeholder="Search sports…"
      />

      {CATEGORIES.map((c) => {
        const list = byCategory(c);
        return (
          <section key={c} className="space-y-3">
            <ActivitySectionHeader
              title={SPORTS_CATEGORY_LABELS[c]}
              subtitle={`${list.length} sport${list.length === 1 ? "" : "s"}`}
            />

            {list.length === 0 && !query ? (
              <ActivityEmptyState
                icon={Trophy}
                title={`No ${SPORTS_CATEGORY_LABELS[c].toLowerCase()} yet`}
                description="Add one below to create teams and add students."
              />
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches in this branch.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((s) => (
                  <ActivityBrowseCard
                    key={s.id}
                    title={s.name}
                    onClick={() => onOpenSport(c, s.id)}
                  />
                ))}
              </div>
            )}

            {addingFor === c ? (
              <ActivityInlineAdd
                label={`Add to ${SPORTS_CATEGORY_LABELS[c]}`}
                placeholder="e.g. Cricket, Badminton"
                value={name}
                onChange={setName}
                onSubmit={() => void create(c)}
                submitLabel="Add sport"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingFor(c);
                  setName("");
                }}
                className="activity-section-link text-sm"
              >
                + Add sport
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SportsListView({
  category,
  onBack,
  onOpenSport,
}: {
  category: SportsCategory;
  onBack: () => void;
  onOpenSport: (id: string) => void;
}) {
  const [sports, setSports] = useState<HierarchySport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void activityHierarchyRepository
      .listSportsByCategory(category)
      .then((list) => {
        if (!cancelled) {
          setSports(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSports([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const refresh = () => {
    setLoading(true);
    void activityHierarchyRepository
      .listSportsByCategory(category)
      .then((list) => {
        setSports(list);
        setLoading(false);
      })
      .catch(() => {
        setSports([]);
        setLoading(false);
      });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sports;
    return sports.filter((s) => s.name.toLowerCase().includes(q));
  }, [sports, query]);

  const create = async () => {
    if (!name.trim()) return;
    const created = await activityHierarchyRepository.createSport({
      name: name.trim(),
      category,
    });
    toast.success("Sport added", { description: created.name });
    setName("");
    refresh();
    onOpenSport(created.id);
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;

  return (
    <div className="space-y-4">
      <HierarchyBackBar label="All sports" onBack={onBack} />
      <ActivitySectionHeader
        title={SPORTS_CATEGORY_LABELS[category]}
        subtitle="Select a sport to manage teams."
      />
      <ActivitySearchField value={query} onChange={setQuery} placeholder="Search sports…" />

      {filtered.length === 0 ? (
        <ActivityEmptyState
          icon={Trophy}
          title={sports.length === 0 ? "No sports yet" : "No matches"}
          description={
            sports.length === 0
              ? "Add a sport below, then create teams."
              : "Try a different search."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {filtered.map((s) => (
            <ActivityBrowseCard key={s.id} title={s.name} onClick={() => onOpenSport(s.id)} />
          ))}
        </div>
      )}

      <ActivityInlineAdd
        label="Add sport"
        placeholder="e.g. Cricket"
        value={name}
        onChange={setName}
        onSubmit={() => void create()}
      />
    </div>
  );
}

function SportsTeamsListView({
  category,
  sportId,
  onBack,
  onOpenTeam,
}: {
  category: SportsCategory;
  sportId: string;
  onBack: () => void;
  onOpenTeam: (id: string) => void;
}) {
  const [sport, setSport] = useState<HierarchySport | null>(null);
  const [teams, setTeams] = useState<HierarchyTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      activityHierarchyRepository.getSport(sportId),
      activityHierarchyRepository.listTeamsBySport(sportId),
    ])
      .then(([s, t]) => {
        if (!cancelled) {
          setSport(s);
          setTeams(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSport(null);
          setTeams([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sportId]);

  const refresh = () => {
    setLoading(true);
    void Promise.all([
      activityHierarchyRepository.getSport(sportId),
      activityHierarchyRepository.listTeamsBySport(sportId),
    ])
      .then(([s, t]) => {
        setSport(s);
        setTeams(t);
        setLoading(false);
      })
      .catch(() => {
        setSport(null);
        setTeams([]);
        setLoading(false);
      });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, query]);

  const create = async () => {
    if (!name.trim()) return;
    const created = await activityHierarchyRepository.createTeam({
      sportId,
      name: name.trim(),
    });
    toast.success("Team created", { description: created.name });
    setName("");
    refresh();
    onOpenTeam(created.id);
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;
  if (!sport) {
    return (
      <ActivityEmptyState
        title="Sport not found"
        description="It may have been removed."
        action={
          <button type="button" className="activity-section-link" onClick={onBack}>
            Back to sports
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <HierarchyBackBar label="All sports" onBack={onBack} />
      <div>
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {SPORTS_CATEGORY_LABELS[category]}
        </p>
        <ActivitySectionHeader
          title={sport.name}
          subtitle="Teams are where you mark attendance and send messages."
        />
      </div>

      {teams.length > 3 ? (
        <ActivitySearchField value={query} onChange={setQuery} placeholder="Search teams…" />
      ) : null}

      {filtered.length === 0 ? (
        <ActivityEmptyState
          title={teams.length === 0 ? "No teams yet" : "No matches"}
          description={
            teams.length === 0
              ? "Add Team 1 below, then add students to the roster."
              : "Try a different search."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {filtered.map((t) => (
            <ActivityBrowseCard
              key={t.id}
              title={t.name}
              meta={`${t.students.length} student${t.students.length === 1 ? "" : "s"}`}
              onClick={() => onOpenTeam(t.id)}
            />
          ))}
        </div>
      )}

      <ActivityInlineAdd
        label="Add team"
        placeholder="e.g. Team 1"
        value={name}
        onChange={setName}
        onSubmit={() => void create()}
      />
    </div>
  );
}

function SportsTeamStudentsView({
  category,
  sportId,
  teamId,
  onBack,
}: {
  category: SportsCategory;
  sportId: string;
  teamId: string;
  onBack: () => void;
}) {
  const [team, setTeam] = useState<HierarchyTeam | null>(null);
  const [sport, setSport] = useState<HierarchySport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      activityHierarchyRepository.getTeam(teamId),
      activityHierarchyRepository.getSport(sportId),
    ])
      .then(([t, s]) => {
        if (!cancelled) {
          setTeam(t);
          setSport(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeam(null);
          setSport(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, sportId]);

  const saveStudents = async (students: HierarchyStudent[]) => {
    const updated = await activityHierarchyRepository.setTeamStudents(teamId, students);
    if (updated) {
      setTeam(updated);
      toast.success("Roster updated");
    }
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;
  if (!team) {
    return (
      <ActivityEmptyState
        title="Team not found"
        action={
          <button type="button" className="activity-section-link" onClick={onBack}>
            Back to teams
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <HierarchyBackBar label={`${sport?.name ?? "Sport"} teams`} onBack={onBack} />
      <div>
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {SPORTS_CATEGORY_LABELS[category]} · {sport?.name}
        </p>
        <ActivitySectionHeader
          title={team.name}
          subtitle="Add students who belong on this team."
        />
      </div>
      <StudentRosterEditor
        students={team.students}
        onChange={(s) => void saveStudents(s)}
        unitLabel="team"
      />
    </div>
  );
}
