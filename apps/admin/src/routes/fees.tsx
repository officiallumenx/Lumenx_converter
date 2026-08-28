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
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadFeesSnapshot,
  resolveFeesLoadView,
  shouldCommitFeesLoad,
  type FeesLoadStatus,
} from "@/lib/fees";
import type { FeesSnapshot } from "@lumenx/module-fees";

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

function feesLoadHint(
  status: FeesLoadStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading fees…";
  if (status === "needs_institute") return "Select an institute to load fees.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to fees for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load fees.";
  if (status === "empty") return "No fee plans found for this institute.";
  return null;
}

function FeesPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const { snapshot, setSnapshot } = useFeesStore();
  const apiMode = isApiAuthMode();
  const writesEnabled = !apiMode;
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [apiSnapshot, setApiSnapshot] = useState<FeesSnapshot | null>(null);
  const [feesLoadStatus, setFeesLoadStatus] = useState<FeesLoadStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [feesLoadError, setFeesLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(
    null,
  );

  const feesLoadView = resolveFeesLoadView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSnapshot: apiSnapshot,
    storedStatus: feesLoadStatus,
    storedErrorMessage: feesLoadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const feesHint = feesLoadHint(feesLoadView.status, feesLoadView.errorMessage);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiSnapshot(null);
      setFeesLoadStatus("loading");
      setFeesLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiSnapshot(null);
      setFeesLoadStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setFeesLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiSnapshot(null);
      setFeesLoadStatus("needs_institute");
      setFeesLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setFeesLoadStatus("loading");
    setFeesLoadError(null);
    void loadFeesSnapshot(requestInstituteId).then((next) => {
      if (
        !shouldCommitFeesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiSnapshot(next.snapshot);
      setFeesLoadStatus(next.status);
      setFeesLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const displaySnapshot = useMemo(() => {
    if (!apiMode || !feesLoadView.rowsValid || !feesLoadView.snapshot) {
      return snapshot;
    }
    return feesLoadView.snapshot;
  }, [apiMode, snapshot, feesLoadView.rowsValid, feesLoadView.snapshot]);

  const goToView = (v: FeesHubView) => navigate({ to: "/fees", search: { view: v } });

  return (
    <AppShell
      title={VIEW_TITLES[view]}
      subtitle={
        apiMode
          ? `API mode · read-only · ${feesLoadView.rowsValid ? feesLoadView.snapshot?.publish.status ?? "…" : "…"} plan`
          : VIEW_SUBTITLES[view]
      }
    >
      <FeesHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {apiMode && !feesLoadView.rowsValid ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {feesHint ?? "Loading fees…"}
          </div>
        ) : (
          <>
            {view === "overview" && (
              <FeesOverviewView snapshot={displaySnapshot} onNavigate={goToView} />
            )}
            {view === "class-fees" && (
              <FeesClassFeesView
                snapshot={displaySnapshot}
                onChange={setSnapshot}
                writesEnabled={writesEnabled}
              />
            )}
            {view === "transport" && (
              <FeesTransportView
                snapshot={displaySnapshot}
                onChange={setSnapshot}
                writesEnabled={writesEnabled}
              />
            )}
            {view === "extra" && (
              <FeesExtraView
                snapshot={displaySnapshot}
                onChange={setSnapshot}
                writesEnabled={writesEnabled}
              />
            )}
            {view === "publish" && (
              <FeesPublishView
                snapshot={displaySnapshot}
                onChange={setSnapshot}
                writesEnabled={writesEnabled}
              />
            )}
            {view === "students" && (
              <FeesStudentsView
                snapshot={displaySnapshot}
                onChange={setSnapshot}
                writesEnabled={writesEnabled}
              />
            )}
          </>
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
