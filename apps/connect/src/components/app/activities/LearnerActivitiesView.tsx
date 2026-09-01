import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/app/SectionCard";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LearnerSportsView } from "@/components/app/sports/LearnerSportsView";
import { type LearnerRef } from "@/lib/sports-utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadLearnerActivities, type LearnerActivitiesData } from "@/lib/activity/learner-load";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@lumenx/ui";
import { Calendar as CalIcon, Clock, MapPin, Sparkles, Trophy } from "lucide-react";
import type { LearnerRef as SportsLearnerRef } from "@/lib/sports-utils";

type Props = {
  learner: LearnerRef;
  subtitle: string;
  showChildSwitcher?: boolean;
  instituteId?: string | null;
  studentId?: string | null;
};

function ApiSportsPanel({ data }: { data: LearnerActivitiesData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Squads" icon={Trophy}>
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

      <SectionCard title="Practice schedule" icon={CalIcon}>
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

      <SectionCard title="Achievements" icon={Sparkles}>
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
    </div>
  );
}

function ApiEcaPanel({ data }: { data: LearnerActivitiesData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Groups" icon={MapPin}>
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

      <SectionCard title="Sessions" icon={CalIcon}>
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

      <SectionCard title="Achievements" icon={Sparkles}>
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

  useEffect(() => {
    if (!canLoadApi) {
      setApiData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadLearnerActivities({ instituteId, studentId })
      .then((data) => {
        if (!cancelled) {
          setApiData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canLoadApi, instituteId, studentId]);

  if (!canLoadApi) {
    return (
      <LearnerSportsView
        learner={learner as SportsLearnerRef}
        subtitle={subtitle}
        showChildSwitcher={showChildSwitcher}
      />
    );
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