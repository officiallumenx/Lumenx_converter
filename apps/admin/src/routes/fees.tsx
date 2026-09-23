import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useFeesSnapshotQuery, useStudentsListQuery, useAcademicYearsListQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
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
import { useRolePermission } from "@/lib/roles-access";
import { useAuth } from "@/auth/AuthContext";
import {
  resolveFeesLoadView,
  createFeePlan,
  type ClassIdsByLabel,
  type FeesLoadStatus,
} from "@/lib/fees";
import {
  type AcademicYearListItem,
} from "@/lib/academic-years";
import { useAdminToast } from "@/components/AdminActionToast";
import { Button, Field, Select } from "@lumenx/ui-admin";
import {
  resolveStudentsListView,
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
  const notify = useAdminToast();
  const { snapshot, setSnapshot } = useFeesStore();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const { user } = useAuth();
  const feesPermission = useRolePermission(user?.accessRoleId, "/fees");
  const writesEnabled =
    resolveWritesEnabled(apiMode, {
      status: instituteCtx.status,
      activeInstituteId: instituteCtx.activeInstituteId,
    }) && feesPermission === "full";
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [apiSnapshot, setApiSnapshot] = useState<FeesSnapshot | null>(null);
  const [apiPlanId, setApiPlanId] = useState<string | null>(null);
  const [apiClassIdByLabel, setApiClassIdByLabel] = useState<Record<string, string>>({});
  const [apiClassIdsByLabel, setApiClassIdsByLabel] = useState<ClassIdsByLabel>({});
  const [feesLoadStatus, setFeesLoadStatus] = useState<FeesLoadStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [feesLoadError, setFeesLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(
    null,
  );
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYearListItem[]>([]);
  const [academicYearsStatus, setAcademicYearsStatus] = useState<
    "idle" | "loading" | "ready" | "empty" | "error"
  >("idle");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [apiStudents, setApiStudents] = useState<StudentListItem[]>([]);
  const [studentsListStatus, setStudentsListStatus] = useState<StudentsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [studentsListError, setStudentsListError] = useState<string | null>(null);
  const [studentsResolvedForInstituteId, setStudentsResolvedForInstituteId] = useState<
    string | null
  >(null);

  const queryClient = useQueryClient();
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const yearsQuery = useAcademicYearsListQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );
  const feesQuery = useFeesSnapshotQuery(
    instituteCtx.activeInstituteId,
    selectedAcademicYearId || null,
    listEnabled && Boolean(selectedAcademicYearId),
  );
  const studentsQuery = useStudentsListQuery(
    instituteCtx.activeInstituteId,
    {},
    listEnabled,
  );
  const bumpFeesReload = () => {
    invalidateAdminCache("admin:fees");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.fees),
      });
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.students),
      });
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.catalog),
      });
    }
  };

  const feesLoadView = resolveFeesLoadView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSnapshot: apiSnapshot,
    storedStatus:
      feesQuery.isLoading && !feesQuery.data ? "loading" : feesLoadStatus,
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
    storedStatus:
      studentsQuery.isLoading && !studentsQuery.data
        ? "loading"
        : studentsListStatus,
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
      setAcademicYears([]);
      setAcademicYearsStatus("loading");
      setSelectedAcademicYearId("");
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden" ||
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setAcademicYears([]);
      setAcademicYearsStatus("idle");
      setSelectedAcademicYearId("");
      return;
    }

    if (yearsQuery.isLoading && !yearsQuery.data) {
      setAcademicYearsStatus("loading");
      return;
    }
    if (!yearsQuery.data) return;

    const next = yearsQuery.data;
    setAcademicYears(next.items);
    setAcademicYearsStatus(
      next.status === "ready"
        ? "ready"
        : next.status === "empty"
          ? "empty"
          : next.status === "loading"
            ? "loading"
            : "error",
    );
    setSelectedAcademicYearId((prev) => {
      if (prev && next.items.some((y) => y.id === prev)) return prev;
      const preferred =
        next.items.find((y) => y.status === "active") ?? next.items[0];
      return preferred?.id ?? "";
    });
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    yearsQuery.data,
    yearsQuery.isLoading,
  ]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiSnapshot(null);
      setApiPlanId(null);
      setApiClassIdByLabel({});
      setApiClassIdsByLabel({});
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
      setApiClassIdsByLabel({});
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
      setApiClassIdsByLabel({});
      setFeesLoadStatus("needs_institute");
      setFeesLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (!selectedAcademicYearId) {
      setApiSnapshot(null);
      setApiPlanId(null);
      setApiClassIdByLabel({});
      setApiClassIdsByLabel({});
      setFeesLoadStatus("loading");
      setFeesLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (feesQuery.isLoading && !feesQuery.data) {
      setFeesLoadStatus("loading");
      setFeesLoadError(null);
      return;
    }
    if (!feesQuery.data) return;

    const next = feesQuery.data;
    setApiSnapshot(next.snapshot);
    setApiPlanId(next.planId);
    setApiClassIdByLabel(next.classIdByLabel);
    setApiClassIdsByLabel(next.classIdsByLabel);
    setFeesLoadStatus(next.status);
    setFeesLoadError(next.errorMessage);
    setResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    selectedAcademicYearId,
    feesQuery.data,
    feesQuery.isLoading,
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

    if (studentsQuery.isLoading && !studentsQuery.data) {
      setStudentsListStatus("loading");
      setStudentsListError(null);
      return;
    }
    if (!studentsQuery.data) return;

    const next = studentsQuery.data;
    setApiStudents(next.items);
    setStudentsListStatus(next.status);
    setStudentsListError(next.errorMessage);
    setStudentsResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    studentsQuery.data,
    studentsQuery.isLoading,
  ]);

  const displaySnapshot = useMemo(() => {
    if (!apiMode || !feesLoadView.rowsValid || !feesLoadView.snapshot) {
      return snapshot;
    }
    return feesLoadView.snapshot;
  }, [apiMode, snapshot, feesLoadView.rowsValid, feesLoadView.snapshot]);

  const reloadFees = () => bumpFeesReload();

  const createPlanForInstitute = () => {
    if (!writesEnabled || !apiMode || creatingPlan) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before creating a fee plan");
      return;
    }
    if (!selectedAcademicYearId) {
      notify("Select an academic year before creating a fee plan");
      return;
    }
    setCreatingPlan(true);
    void createFeePlan({
      instituteId,
      academicYearId: selectedAcademicYearId,
    })
      .then(() => {
        notify("Fee plan created");
        reloadFees();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create fee plan");
      })
      .finally(() => setCreatingPlan(false));
  };

  const academicYearGateBlocked =
    apiMode &&
    Boolean(instituteCtx.activeInstituteId) &&
    instituteCtx.status !== "loading" &&
    instituteCtx.status !== "error" &&
    instituteCtx.status !== "forbidden" &&
    !selectedAcademicYearId;

  const goToView = (v: FeesHubView) => navigate({ to: "/fees", search: { view: v } });
  const demoOnChange = apiMode ? () => undefined : setSnapshot;

  return (
    <AppShell
      title={VIEW_TITLES[view]}
      subtitle={
        apiMode
          ? `${writesEnabled ? "Editable" : "Read-only"} · ${
              feesLoadView.rowsValid
                ? feesLoadView.snapshot?.publish.status ?? "…"
                : feesLoadView.status
            } plan`
          : VIEW_SUBTITLES[view]
      }
    >
      <FeesHubNav active={view} />
      {apiMode && instituteCtx.activeInstituteId ? (
        <div className="mb-4 max-w-sm">
          <Field label="Select academic year" required>
            <Select
              fieldSize="md"
              className="w-full text-xs"
              value={selectedAcademicYearId}
              disabled={academicYearsStatus === "loading"}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
            >
              <option value="">
                {academicYearsStatus === "loading"
                  ? "Loading academic years…"
                  : academicYearsStatus === "empty"
                    ? "No academic years — create one first"
                    : "Select academic year…"}
              </option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label} ({y.status})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}
      <AdminPageTransition pageKey={view}>
        {academicYearGateBlocked ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {academicYearsStatus === "empty"
              ? "Create an academic year before managing fees. Academic year must be selected first."
              : academicYearsStatus === "loading"
                ? "Loading academic years…"
                : "Academic year must be selected first."}
          </div>
        ) : apiMode && feesLoadView.status === "empty" ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No fee plans found for this academic year.
            </p>
            {writesEnabled ? (
              <Button
                variant="primary"
                disabled={creatingPlan || !selectedAcademicYearId}
                onClick={createPlanForInstitute}
              >
                Create fee plan
              </Button>
            ) : null}
          </div>
        ) : apiMode && !feesLoadView.rowsValid ? (
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
                onChange={demoOnChange}
                writesEnabled={writesEnabled}
                apiMode={apiMode}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
                classIdsByLabel={apiClassIdsByLabel}
                onApiReload={reloadFees}
              />
            )}
            {view === "transport" && (
              <FeesTransportView
                snapshot={displaySnapshot}
                onChange={demoOnChange}
                writesEnabled={writesEnabled}
                studentOptions={studentOptions}
                studentsPickerReady={studentsPickerReady}
                studentsPickerHint={studentsPickerHintText}
                apiMode={apiMode}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
                classIdsByLabel={apiClassIdsByLabel}
                onApiReload={reloadFees}
              />
            )}
            {view === "extra" && (
              <FeesExtraView
                snapshot={displaySnapshot}
                onChange={demoOnChange}
                writesEnabled={writesEnabled}
                apiMode={apiMode}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
                classIdsByLabel={apiClassIdsByLabel}
                onApiReload={reloadFees}
              />
            )}
            {view === "publish" && (
              <FeesPublishView
                snapshot={displaySnapshot}
                onChange={demoOnChange}
                writesEnabled={writesEnabled}
                apiMode={apiMode}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
                classIdsByLabel={apiClassIdsByLabel}
                onApiReload={reloadFees}
              />
            )}
            {view === "students" && (
              <FeesStudentsView
                snapshot={displaySnapshot}
                onChange={demoOnChange}
                writesEnabled={writesEnabled}
                studentOptions={studentOptions}
                studentsPickerReady={studentsPickerReady}
                studentsPickerHint={studentsPickerHintText}
                feePlanId={apiPlanId}
                classIdByLabel={apiClassIdByLabel}
                onApiReload={reloadFees}
              />
            )}
          </>
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
