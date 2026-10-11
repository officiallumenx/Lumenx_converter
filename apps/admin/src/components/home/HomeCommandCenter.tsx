import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { syncAcademicYearLocked } from "@lumenx/utils";
import { useAuth } from "@/auth/AuthContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  resolveDashboardSummaryView,
  buildNeedsAttentionItems,
  attentionTotalCount,
  type DashboardWidgetsState,
} from "@/lib/dashboard";
import { SetupChecklistBanner } from "@/components/setup/SetupChecklistPanel";
import { useSetupChecklist } from "@/lib/institute-setup-checklist";
import { invalidateAdminModule } from "@/lib/admin-queries/invalidate";
import { adminQueryRoots } from "@/lib/admin-queries/keys";
import {
  useAcademicYearsListQuery,
  useHomeBirthdaysQuery,
  useHomeSummaryQuery,
  useHomeWidgetsQuery,
  useInstituteProfileQuery,
  useNotificationsListQuery,
} from "@/lib/admin-queries/hooks-shell";
import { updateInboxItem } from "@/lib/notification-inbox/mutations";
import { optimisticMarkNotificationRead } from "@/lib/notification-inbox";
import {
  loadPendingReviews,
  subscribePendingReviews,
  syncPendingReviewsComplaintsApi,
} from "@/lib/pending-reviews";
import { getPendingReviewsApiCounts } from "@/lib/pending-reviews-api-store";
import { getAdminComplaintsPendingCount } from "@/lib/complaints/pending-count-store";
import type { TransportEmergencyDto } from "@/lib/transport/types";
import { useAdminToast } from "@/components/AdminActionToast";
import { HomeQuickActionsCard } from "@/components/HomeQuickActionsCard";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { readRegisteredAdminTenant } from "@/lib/admin-tenant";
import { resolveBirthdayPrincipalName } from "@/lib/dashboard/resolve-birthday-principal";
import { HomeHero } from "./HomeHero";
import { HomeYearCallout } from "./HomeYearCallout";
import { HomeNeedsAttention } from "./HomeNeedsAttention";
import { HomeOverview } from "./HomeOverview";
import { HomeInsightCards } from "./HomeInsightCards";
import { HomeBirthdays } from "./HomeBirthdays";
import { HomeRecentActivity } from "./HomeRecentActivity";
import { HomeOperationalLists } from "./HomeOperationalLists";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";

function emptyWidgets(): DashboardWidgetsState {
  return {
    status: "loading",
    birthdays: { status: "empty", rows: [], errorMessage: null },
    diary: {
      status: "empty",
      rows: [],
      todaySubmittedCount: 0,
      missingYesterdayCount: 0,
      errorMessage: null,
    },
    leave: { status: "empty", rows: [], pendingCount: 0, errorMessage: null },
    attendanceDrafts: { status: "empty", rows: [], errorMessage: null },
    marksPending: { status: "empty", rows: [], errorMessage: null },
    errorMessage: null,
  };
}

export function HomeCommandCenter() {
  const instituteCtx = useInstituteContext();
  const { instituteProfile } = useDemoProfile();
  const { user } = useAuth();
  const { state: setupState } = useSetupChecklist();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useAdminToast();
  const { writesAllowed } = useAdminWriteAccess();
  const apiMode = isApiAuthMode();
  const queriesEnabled =
    apiMode &&
    Boolean(instituteCtx.activeInstituteId) &&
    instituteCtx.status !== "forbidden" &&
    instituteCtx.status !== "empty" &&
    instituteCtx.status !== "needs_selection";

  const yearsQuery = useAcademicYearsListQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );
  const summaryQuery = useHomeSummaryQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );
  const widgetsQuery = useHomeWidgetsQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );
  const inboxQuery = useNotificationsListQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );
  const birthdaysQuery = useHomeBirthdaysQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );
  const profileQuery = useInstituteProfileQuery(
    instituteCtx.activeInstituteId,
    queriesEnabled,
  );

  const pendingReviews = useSyncExternalStore(
    subscribePendingReviews,
    loadPendingReviews,
    () => [],
  );

  const [transportEmergencies, setTransportEmergencies] = useState<
    TransportEmergencyDto[]
  >([]);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const summary = summaryQuery.data?.summary ?? null;
  const loadStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : summaryQuery.isLoading && !summaryQuery.data
              ? "loading"
              : (summaryQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (summaryQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    summaryQuery.data && queriesEnabled ? instituteCtx.activeInstituteId : null;

  const widgets = widgetsQuery.data ?? emptyWidgets();
  const leaveWidget = widgets.leave ?? {
    status: "empty" as const,
    rows: [],
    pendingCount: 0,
    errorMessage: null,
  };
  const widgetsValid =
    Boolean(widgetsQuery.data) &&
    queriesEnabled &&
    (widgets.status === "ready" ||
      widgets.status === "error" ||
      widgets.status === "forbidden");
  const widgetsLoading = widgetsQuery.isLoading && !widgetsQuery.data;
  const summaryLoading = summaryQuery.isLoading && !summaryQuery.data;

  useEffect(() => {
    if (!queriesEnabled || !instituteCtx.activeInstituteId) {
      setTransportEmergencies([]);
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void import("@/lib/transport/ops-api")
      .then(({ listTransportEmergencies }) =>
        listTransportEmergencies({
          instituteId: requestInstituteId,
          status: "active",
        }),
      )
      .catch(() => [] as TransportEmergencyDto[])
      .then((emergencies) => {
        if (cancelled) return;
        if (instituteCtx.activeInstituteId !== requestInstituteId) return;
        setTransportEmergencies(emergencies);
      });
    return () => {
      cancelled = true;
    };
  }, [queriesEnabled, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!queriesEnabled || !instituteCtx.activeInstituteId) return;
    if (!summaryQuery.data?.summary) return;
    syncPendingReviewsComplaintsApi(
      instituteCtx.activeInstituteId,
      summaryQuery.data.summary.pendingLeave,
    );
  }, [
    queriesEnabled,
    instituteCtx.activeInstituteId,
    summaryQuery.data?.summary,
  ]);

  const view = resolveDashboardSummaryView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const attentionItems = useMemo(() => {
    const apiCounts = getPendingReviewsApiCounts();
    const reviewById = new Map(pendingReviews.map((r) => [r.id, r.count]));

    return buildNeedsAttentionItems({
      submittedMarks:
        reviewById.get("marks-review") ?? apiCounts.submittedMarks,
      pendingLeave:
        reviewById.get("teacher-leave") ??
        apiCounts.pendingTeacherLeave ??
        view.summary?.pendingLeave ??
        0,
      openComplaints:
        reviewById.get("complaints-admin") ??
        getAdminComplaintsPendingCount() ??
        view.summary?.openComplaints ??
        0,
      pendingAdmissionConverts:
        reviewById.get("admissions-convert") ??
        apiCounts.pendingAdmissionConverts,
      pendingCareerHires:
        reviewById.get("careers-hire") ?? apiCounts.pendingCareerHires,
      pendingTransportStops:
        reviewById.get("transport-stops") ?? apiCounts.pendingTransportStops,
      pendingTransportAssignments:
        reviewById.get("transport-assignments") ??
        apiCounts.pendingTransportAssignments,
      // Omit widget-derived counts until widgets settle — never treat "unknown" as 0.
      attendanceDraftCount:
        widgetsValid && widgets.attendanceDrafts.status !== "error"
          ? widgets.attendanceDrafts.rows.length
          : undefined,
      diaryMissingYesterdayCount:
        widgetsValid && widgets.diary.status !== "error"
          ? widgets.diary.missingYesterdayCount
          : undefined,
      marksPendingWidgetCount:
        widgetsValid && widgets.marksPending.status !== "error"
          ? widgets.marksPending.rows.length
          : undefined,
      transportEmergencyCount: transportEmergencies.length,
    });
  }, [
    pendingReviews,
    view.summary,
    widgetsValid,
    widgets.attendanceDrafts,
    widgets.diary,
    widgets.marksPending,
    transportEmergencies.length,
  ]);

  const attentionTotal = attentionTotalCount(attentionItems);
  const hasCritical = attentionItems.some((i) => i.severity === "critical");

  const yearsLoading = yearsQuery.isLoading && !yearsQuery.data;
  const yearsError = yearsQuery.isError;
  const yearItems = yearsQuery.data?.items ?? [];
  const activeYear = yearItems.find((y) => y.status === "active") ?? null;
  const showSetAcademicYear =
    queriesEnabled &&
    !yearsLoading &&
    !yearsError &&
    (yearsQuery.data?.status === "empty" ||
      (yearsQuery.data?.status === "ready" && !activeYear) ||
      (yearItems.length === 0 && Boolean(yearsQuery.data)));

  // Clear stale "academic year locked" banners when an active year is already loaded
  // (mobile could keep a false lock from earlier institute-chrome flicker).
  useEffect(() => {
    if (!queriesEnabled || yearsLoading || yearsError) return;
    if (!activeYear) return;
    syncAcademicYearLocked({ locked: false, yearLabel: activeYear.label });
  }, [queriesEnabled, yearsLoading, yearsError, activeYear]);

  const openUnreadNotification = async (id: string) => {
    if (markingReadId) return;
    setMarkingReadId(id);
    const instituteId = instituteCtx.activeInstituteId;
    if (instituteId) {
      optimisticMarkNotificationRead(queryClient, instituteId, id);
    }
    try {
      await updateInboxItem(id, { read: true });
      if (instituteId) {
        await invalidateAdminModule(
          queryClient,
          instituteId,
          adminQueryRoots.notifications,
        );
      }
    } catch (err) {
      if (instituteId) {
        await invalidateAdminModule(
          queryClient,
          instituteId,
          adminQueryRoots.notifications,
        );
      }
      notify(err instanceof Error ? err.message : "Failed to mark read");
    } finally {
      setMarkingReadId(null);
    }
    void navigate({ to: "/notifications", search: { tab: "inbox" } });
  };

  const birthdayRows = birthdaysQuery.data?.rows ?? [];
  const birthdaysLoading =
    birthdaysQuery.isLoading && !birthdaysQuery.data;
  const birthdayStatus = birthdaysQuery.isError
    ? "error"
    : birthdaysQuery.data?.status;
  const birthdayErrorMessage = birthdaysQuery.isError
    ? birthdaysQuery.error instanceof Error
      ? birthdaysQuery.error.message
      : "Failed to load birthdays"
    : (birthdaysQuery.data?.errorMessage ?? null);
  const birthdayWarningMessage = birthdaysQuery.data?.warningMessage ?? null;

  const activityItems = inboxQuery.data?.items ?? [];
  const instituteName =
    profileQuery.data?.institute?.name?.trim() ||
    instituteCtx.activeInstitute?.name?.trim() ||
    null;
  const principalName = resolveBirthdayPrincipalName({
    institute: profileQuery.data?.institute,
    settings: profileQuery.data?.settings,
    registeredPrincipalName: readRegisteredAdminTenant()?.principalName,
    sessionUserName: user?.name,
    demoPrincipalName: instituteProfile.principal,
    apiMode,
  });
  const yearLabel = activeYear?.label ?? null;

  return (
    <div className="lx-home-command space-y-4">
      <HomeHero
        attentionCount={attentionTotal}
        hasCritical={hasCritical}
        instituteName={instituteName}
        academicYearLabel={yearLabel}
      />

      <SetupChecklistBanner state={setupState} />

      {showSetAcademicYear ? <HomeYearCallout mode="missing" /> : null}
      {yearsError ? <HomeYearCallout mode="error" /> : null}

      <HomeOverview
        summary={
          view.summary
            ? {
                students: view.summary.students,
                teachers: view.summary.teachers,
                parents: view.summary.parents,
                pendingLeave: view.summary.pendingLeave,
              }
            : null
        }
        loading={summaryLoading}
        status={view.status}
        errorMessage={view.errorMessage}
        activeYearLabel={yearLabel}
      />

      <HomeInsightCards
        instituteId={instituteCtx.activeInstituteId}
        queriesEnabled={queriesEnabled}
        academicYearId={activeYear?.id ?? null}
        pendingLeave={view.summary ? view.summary.pendingLeave : null}
        summaryLoading={summaryLoading}
        widgets={widgets}
        widgetsValid={widgetsValid}
        widgetsLoading={widgetsLoading}
      />

      <div className="lx-home-board">
        <div className="lx-home-board__main">
          <HomeBirthdays
            rows={birthdayRows}
            loading={birthdaysLoading}
            status={birthdayStatus}
            errorMessage={birthdayErrorMessage}
            warningMessage={birthdayWarningMessage}
            instituteName={instituteName}
            principalName={principalName}
          />

          <HomeNeedsAttention
            items={attentionItems}
            loading={summaryLoading}
            pendingMore={widgetsLoading}
          />

          <div
            className="lx-home-section lx-home-board__qa"
            style={{ "--lx-home-i": 5 } as CSSProperties}
          >
            <HomeQuickActionsCard />
          </div>

          <HomeOperationalLists
            diaryRows={widgets.diary.status !== "error" ? widgets.diary.rows : []}
            diaryMissingYesterday={
              widgets.diary.status !== "error"
                ? widgets.diary.missingYesterdayCount
                : 0
            }
            leaveRows={leaveWidget.status !== "error" ? leaveWidget.rows : []}
            leavePendingCount={
              leaveWidget.status !== "error"
                ? leaveWidget.pendingCount
                : (view.summary?.pendingLeave ?? 0)
            }
            attendanceDrafts={
              widgets.attendanceDrafts.status !== "error"
                ? widgets.attendanceDrafts.rows
                : []
            }
            marksPending={
              widgets.marksPending.status !== "error"
                ? widgets.marksPending.rows
                : []
            }
            transportEmergencies={transportEmergencies}
            transportInstituteId={
              queriesEnabled ? instituteCtx.activeInstituteId : null
            }
            transportWritesEnabled={writesAllowed}
            onTransportNotify={notify}
          />
        </div>

        <aside className="lx-home-board__aside">
          <HomeRecentActivity
            items={activityItems}
            markingReadId={markingReadId}
            onOpen={(id) => void openUnreadNotification(id)}
          />
        </aside>
      </div>
    </div>
  );
}

/** @deprecated Prefer HomeCommandCenter — kept for import compatibility during migration. */
export { HomeCommandCenter as HomeApiSummaryPanel };
