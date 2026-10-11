export {
  loadDashboardSummary,
  type DashboardLoadStatus,
  type DashboardSummary,
  type DashboardSummaryState,
} from "./load";
export {
  resolveDashboardSummaryView,
  shouldCommitDashboardLoad,
} from "./list-view";
export {
  collectBirthdaysToday,
  extractMonthDay,
  isBirthdayOnDate,
  localYmd,
  turningAgeOnDate,
  type BirthdayRow,
} from "./birthdays";
export {
  loadHomeBirthdaysToday,
  type HomeBirthdaysState,
} from "./load-home-birthdays";
export {
  buildNeedsAttentionItems,
  attentionTotalCount,
  attentionSeverityClass,
  resolveAttentionDisplayMode,
  type AttentionItem,
  type AttentionSeverity,
  type AttentionInput,
  type AttentionDisplayMode,
} from "./attention";
export {
  loadDashboardWidgets,
  type DashboardWidgetsState,
  type AttendanceDraftRow,
  type DiaryWidgetRow,
  type LeaveWidgetRow,
  type MarksPendingRow,
  type WidgetSlice,
} from "./load-widgets";
export {
  ATTENDANCE_TODAY_UNAVAILABLE_REASON,
  buildAttendanceTodayMetrics,
  buildFeeCollectionMetrics,
  compactInrAmount,
  countAdmissionApplicationsRequiringAction,
  countPendingAdmissionApplications,
  FEE_OVERDUE_UNAVAILABLE_REASON,
  insightMetricFromHub,
  insightMetricFromWidgetCount,
  PENDING_ADMISSION_STATUSES,
  type InsightMetricState,
} from "./insight-metrics";
