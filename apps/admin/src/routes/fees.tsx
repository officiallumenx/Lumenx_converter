import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { FeesHubNav } from "@/components/fees/FeesHubNav";
import { useFeesStore } from "@/components/fees/useFeesStore";
import { FeesOverviewView } from "@/components/fees/views/FeesOverviewView";
import { FeesClassFeesView } from "@/components/fees/views/FeesClassFeesView";
import { FeesTransportView } from "@/components/fees/views/FeesTransportView";
import { FeesExtraView } from "@/components/fees/views/FeesExtraView";
import { FeesPublishView } from "@/components/fees/views/FeesPublishView";
import { FeesStudentsView } from "@/components/fees/views/FeesStudentsView";
import { validateHubViewSearch } from "@/lib/hub-view-search";

export type FeesHubView =
  | "overview"
  | "class-fees"
  | "transport"
  | "extra"
  | "publish"
  | "students";

const VIEW_TITLES: Record<FeesHubView, string> = {
  overview: "Fees",
  "class-fees": "Class fees",
  transport: "Transport fees",
  extra: "Extra fees",
  publish: "Publish fees",
  students: "Student fees",
};

const VIEW_SUBTITLES: Record<FeesHubView, string> = {
  overview: "Class fees · transport · extras · publish · student concessions",
  "class-fees": "Default tuition and books by class",
  transport: "Default transport fee by class",
  extra: "Add custom fee fields and assign to classes",
  publish: "Publish to the institute or selected classes for parents",
  students: "Concession for one student · shown only on that parent account",
};

const FEES_VIEW_CONFIG = {
  views: [
    "overview",
    "class-fees",
    "transport",
    "extra",
    "publish",
    "students",
  ] as const,
  defaultView: "overview" as const,
  aliases: {
    initialize: "class-fees",
    sections: "students",
  } as const,
};

export const Route = createFileRoute("/fees")({
  head: () => ({ meta: [{ title: "Fees — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    validateHubViewSearch(search, FEES_VIEW_CONFIG),
  component: FeesPage,
});

function FeesPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const { snapshot, setSnapshot } = useFeesStore();

  const goToView = (v: FeesHubView) => navigate({ to: "/fees", search: { view: v } });

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={VIEW_SUBTITLES[view]}>
      <FeesHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "overview" && (
          <FeesOverviewView snapshot={snapshot} onNavigate={goToView} />
        )}
        {view === "class-fees" && (
          <FeesClassFeesView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "transport" && (
          <FeesTransportView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "extra" && <FeesExtraView snapshot={snapshot} onChange={setSnapshot} />}
        {view === "publish" && (
          <FeesPublishView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "students" && (
          <FeesStudentsView snapshot={snapshot} onChange={setSnapshot} />
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
