import { useEffect, useState } from "react";
import { SectionCard } from "@/components/app/SectionCard";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LearnerSportsView } from "@/components/app/sports/LearnerSportsView";
import { type LearnerRef } from "@/lib/sports-utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadLearnerActivities, type LearnerActivitiesData, type LearnerTeamAnnouncement } from "@/lib/activity/learner-load";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@lumenx/ui";
import { Clock } from "lucide-react";
import type { LearnerRef as SportsLearnerRef } from "@/lib/sports-utils";

type Props = {
  learner: LearnerRef;
  subtitle: string;
  showChildSwitcher?: boolean;
  instituteId?: string | null;
  studentId?: string | null;
};

function ApiAnnouncementsList({
  items,
  emptyLabel,
}: {
  items: LearnerTeamAnnouncement[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
          <p className="font-medium">{a.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{a.body}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {a.teamName} · {a.sentAt.slice(0, 10)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ApiSportsPanel({ data }: { data: LearnerActivitiesData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Squads">
        {data.sportsSquads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sports teams yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.sportsSquads.map((s) => (
              <li key={s.teamId} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{s.teamName}</p>
                <p className="text-xs text-muted-foreground">{s.sectionName}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Practice schedule">
        {data.sportsPractice.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming practice sessions.</p>
        ) : (
          <ul className="space-y-2">
            {data.sportsPractice.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.date}
                    {p.startTime ? ` · ${p.startTime}` : ""} · {p.teamName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Achievements">
        {data.sportsAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No achievements recorded yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.sportsAchievements.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.teamName} · {a.date}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Team announcements">
        <ApiAnnouncementsList
          items={data.sportsAnnouncements}
          emptyLabel="No team announcements yet."
        />
      </SectionCard>
    </div>
  );
}

function ApiEcaPanel({ data }: { data: LearnerActivitiesData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Groups">
        {data.ecaGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ECA groups yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.ecaGroups.map((g) => (
              <li key={g.teamId} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{g.teamName}</p>
                <p className="text-xs text-muted-foreground">{g.sectionName}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Sessions">
        {data.ecaPractice.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled sessions.</p>
        ) : (
          <ul className="space-y-2">
            {data.ecaPractice.slice(0, 8).map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.date}
                  {p.startTime ? ` · ${p.startTime}` : ""} · {p.teamName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Achievements">
        {data.ecaAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ECA achievements yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.ecaAchievements.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.teamName} · {a.date}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Group announcements">
        <ApiAnnouncementsList
          items={data.ecaAnnouncements}
          emptyLabel="No group announcements yet."
        />
      </SectionCard>
    </div>
  );
}

export function LearnerActivitiesView({
  learner,
  subtitle,
  showChildSwitcher,
  instituteId,
  studentId,
}: Props) {
  const apiMode = isApiAuthMode();
  const canLoadApi = apiMode && instituteId && studentId;
  const [apiData, setApiData] = useState<LearnerActivitiesData | null>(null);
  const [loading, setLoading] = useState(Boolean(canLoadApi));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!canLoadApi) {
      setApiData(null);
      setLoading(false);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void loadLearnerActivities({ instituteId, studentId })
      .then((data) => {
        if (!cancelled) {
          setApiData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load activities");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canLoadApi, instituteId, studentId]);

  if (apiMode && !studentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Link a student profile to view live activities for this institute.
      </p>
    );
  }

  if (!canLoadApi) {
    return (
      <LearnerSportsView
        learner={learner as SportsLearnerRef}
        subtitle={subtitle}
        showChildSwitcher={showChildSwitcher}
      />
    );
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (loading || !apiData) {
    return <p className="text-sm text-muted-foreground">Loading activities…</p>;
  }

  return (
    <div className="min-w-0 space-y-4">
      {showChildSwitcher ? (
        <div className="space-y-2">
          <ChildSwitcher />
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}

      <Tabs defaultValue="sports" className="min-w-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sports">Sports</TabsTrigger>
          <TabsTrigger value="eca">ECA</TabsTrigger>
        </TabsList>
        <TabsContent value="sports" className="mt-4">
          <ApiSportsPanel data={apiData} />
        </TabsContent>
        <TabsContent value="eca" className="mt-4">
          <ApiEcaPanel data={apiData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}