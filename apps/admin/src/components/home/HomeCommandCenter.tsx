import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { syncAcademicYearLocked } from "@lumenx/utils";
import { useInstituteContext } from "@/lib/institutes";
import {
  resolveDashboardSummaryView,
  buildNeedsAttentionItems,
  attentionTotalCount,
  type DashboardWidgetsState,
} from "@/lib/dashboard";
import { SetupChecklistBanner } from "@/components/setup/SetupChecklistPanel";
import { useSetupChecklist } from "@/lib/institute-setup-checklist";
import {
  adminQueryRoots,
  invalidateAdminModule,
  useAcademicYearsListQuery,
  useHomeSummaryQuery,
  useHomeWidgetsQuery,
  useNotificationsListQuery,
} from "@/lib/admin-queries";
import { updateInboxItem } from "@/lib/notification-inbox/mutations";
import { isApiAuthMode } from "@/auth/auth-mode";
import { listTransportEmergencies } from "@/lib/transport/ops-api";
import {
  loadPendingReviews,
  subscribePendingReviews,
  syncPendingReviewsComplaintsApi,
} from "@/lib/pending-reviews";
import { getPendingReviewsApiCounts } from "@/lib/pending-reviews-api-store";
import { getAdminComplaintsPendingCount } from "@/lib/complaints/pending-count-store";
import { useAdminToast } from "@/components/AdminActionToast";
import { HomeQuickActionsCard } from "@/components/HomeQuickActionsCard";
import { HomeHero } from "./HomeHero";
import { HomeYearCallout } from "./HomeYearCallout";
import { HomeNeedsAttention } from "./HomeNeedsAttention";
import { HomeOverview } from "./HomeOverview";
import { HomeBirthdays } from "./HomeBirthdays";
import { HomeRecentActivity } from "./HomeRecentActivity";
import { HomeOperationalLists } from "./HomeOperationalLists";

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
    attendanceDrafts: { status: "empty", rows: [], errorMessage: null },
    marksPending: { status: "empty", rows: [], errorMessage: null },
    errorMessage: null,
  };
}

export function HomeCommandCenter() {
  const instituteCtx = useInstituteContext();
  const { state: setupState } = useSetupChecklist();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const queriesEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);

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

  const pendingReviews = useSyncExternalStore(
    subscribePendingReviews,
    loadPendingReviews,
    () => [],
  );

  const [transportEmergencies, setTransportEmergencies] = useState<
    Awaited<ReturnType<typeof listTransportEmergencies>>
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
    void listTransportEmergencies({
      instituteId: requestInstituteId,
      status: "active",
    })
      .catch(() => [])
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
    apiMode: true,
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
      attendanceDraftCount:
        widgetsValid && widgets.attendanceDrafts.status !== "error"
          ? widgets.attendanceDrafts.rows.length
          : 0,
      diaryMissingYesterdayCount:
        widgetsValid && widgets.diary.status !== "error"
          ? widgets.diary.missingYesterdayCount
          : 0,
      marksPendingWidgetCount:
        widgetsValid && widgets.marksPending.status !== "error"
          ? widgets.marksPending.rows.length
          : 0,
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
    try {
      await updateInboxItem(id, { read: true });
      const instituteId = instituteCtx.activeInstituteId;
      if (instituteId) {
        await invalidateAdminModule(
          queryClient,
          instituteId,
          adminQueryRoots.notifications,
        );
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to mark read");
    } finally {
      setMarkingReadId(null);
    }
    void navigate({ to: "/notifications", search: { tab: "inbox" } });
  };

  const birthdayRows =
    widgetsValid && widgets.birthdays.status !== "error"
      ? widgets.birthdays.rows
      : [];

  const activityItems = inboxQuery.data?.items ?? [];
  const instituteName = instituteCtx.activeInstitute?.name?.trim() || null;
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
        activeYearLabel={yearLabel}
      />

      <div className="lx-home-mid-grid">
        <HomeNeedsAttention
          items={attentionItems}
          loading={summaryLoading || widgetsLoading}
        />
        <HomeBirthdays rows={birthdayRows} />
      </div>

      <div className="lx-home-bottom-grid">
        <div className="lx-home-section lx-home-bottom-grid__qa" style={{ "--lx-home-i": 5 } as CSSProperties}>
          <HomeQuickActionsCard />
        </div>
        <HomeRecentActivity
          items={activityItems}
          markingReadId={markingReadId}
          onOpen={(id) => void openUnreadNotification(id)}
        />
      </div>

      {widgetsValid ? (
        <HomeOperationalLists
          diaryRows={widgets.diary.status !== "error" ? widgets.diary.rows : []}
          diaryMissingYesterday={
            widgets.diary.status !== "error"
              ? widgets.diary.missingYesterdayCount
              : 0
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
        />
      ) : null}
    </div>
  );
}

/** @deprecated Prefer HomeCommandCenter — kept for import compatibility during migration. */
export { HomeCommandCenter as HomeApiSummaryPanel };
