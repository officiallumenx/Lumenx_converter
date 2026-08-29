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
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  loadFeesSnapshot,
  resolveFeesLoadView,
  shouldCommitFeesLoad,
  type FeesLoadStatus,
} from "@/lib/fees";
import {
  loadStudentsList,
  resolveStudentsListView,
  shouldCommitStudentsLoad,
  type StudentListItem,
  type StudentsListStatus,
} from "@/lib/students";
import {
  FEES_STUDENT_OPTIONS,
  studentListItemsToFeesStudentOptions,
  type FeesStudentOption,
} from "@/lib/fees-students";
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

function studentsPickerHint(
  status: StudentsListStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading students for fee picker…";
  if (status === "needs_institute") return "Select an institute to load students.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to students for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load students.";
  if (status === "empty") return "No students found for this institute.";
  return null;
}

function FeesPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const { snapshot, setSnapshot } = useFeesStore();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [apiSnapshot, setApiSnapshot] = useState<FeesSnapshot | null>(null);
  const [apiPlanId, setApiPlanId] = useState<string | null>(null);
  const [apiClassIdByLabel, setApiClassIdByLabel] = useState<Record<string, string>>({});
  const [feesLoadStatus, setFeesLoadStatus] = useState<FeesLoadStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [feesLoadError, setFeesLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(
    null,
  );
  const [apiStudents, setApiStudents] = useState<StudentListItem[]>([]);
  const [studentsListStatus, setStudentsListStatus] = useState<StudentsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [studentsListError, setStudentsListError] = useState<string | null>(null);
  const [studentsResolvedForInstituteId, setStudentsResolvedForInstituteId] = useState<
    string | null
  >(null);

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

  const studentsListView = resolveStudentsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: studentsResolvedForInstituteId,
    storedItems: apiStudents,
    storedStatus: studentsListStatus,
    storedErrorMessage: studentsListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const studentOptions: FeesStudentOption[] = useMemo(() => {
    if (!apiMode) return FEES_STUDENT_OPTIONS;
    if (!studentsListView.rowsValid) return [];
    return studentListItemsToFeesStudentOptions(studentsListView.items);
  }, [apiMode, studentsListView.items, studentsListView.rowsValid]);

  const studentsPickerReady =
    !apiMode ||
    studentsListView.status === "ready" ||
    studentsListView.status === "empty";
  const studentsPickerHintText = studentsPickerHint(
    studentsListView.status,
    studentsListView.errorMessage,
  );

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiSnapshot(null);
      setApiPlanId(null);
      setApiClassIdByLabel({});
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
      setApiPlanId(null);
      setApiClassIdByLabel({});
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
      setApiPlanId(null);
      setApiClassIdByLabel({});
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
      setApiPlanId(next.planId);
      setApiClassIdByLabel(next.classIdByLabel);
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

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiStudents([]);
      setStudentsListStatus("loading");
      setStudentsListError(null);
      setStudentsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiStudents([]);
      setStudentsListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setStudentsListError(instituteCtx.errorMessage);
      setStudentsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiStudents([]);
      setStudentsListStatus("needs_institute");
      setStudentsListError(null);
      setStudentsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setStudentsListStatus("loading");
    setStudentsListError(null);
    void loadStudentsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitStudentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiStudents(next.items);
      setStudentsListStatus(next.status);
      setStudentsListError(next.errorMessage);
      setStudentsResolvedForInstituteId(requestInstituteId);
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
              <FeesOverviewView
                snapshot={displaySnapshot}
                onNavigate={goToView}
                studentOptions={studentOptions}
                studentsPickerReady={studentsPickerReady}
              />
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
                studentOptions={studentOptions}
                studentsPickerReady={studentsPickerReady}
                studentsPickerHint={studentsPickerHintText}
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
                writesEnabled
                studentOptions={studentOptions}
                studentsPickerReady={studentsPickerReady}
                studentsPickerHint={studentsPickerHintText}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
              />
            )}
          </>
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
