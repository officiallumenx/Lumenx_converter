/**
 * Unified subscription domain — public barrel.
 * Single source of truth for lifecycle + renewal pricing.
 */

export {
  SUBSCRIPTION_STORAGE_KEY,
  SUBSCRIPTION_CHANGED_EVENT,
  DEFAULT_TRIAL_DAYS,
  DEFAULT_GRACE_DAYS,
  TRIAL_EXPIRING_DAYS,
  MIN_MONTHLY_CHARGE_INR,
  DEFAULT_PER_STUDENT_RATE_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  EXTENDED_PER_STUDENT_RATE_MAX_INR,
  SUBSCRIPTION_DURATION_OPTIONS,
  SUBSCRIPTION_POLICY,
  RENEWAL_REMINDER_DAYS,
  freeMonthsForDuration,
  labelSubscriptionDuration,
  type SubscriptionDurationMonths,
  type SubscriptionPolicy,
  type RenewalReminderKind,
} from "./policy";

export {
  calculateSubscriptionQuote,
  quoteAllDurations,
  normalizeAssignedRate,
  isExtendedPerStudentRate,
  parseSubscriptionDuration,
  type SubscriptionQuoteInput,
  type SubscriptionQuote,
} from "./pricing";

export {
  buildTrialWindow,
  addUtcDays,
  daysRemainingUntil,
  deriveSubscriptionLifecycle,
  accessModeForLifecycle,
  shouldEnforceSubscriptionReadOnly,
  shouldShowRenewalCta,
  labelSubscriptionLifecycle,
  buildSubscriptionTrialView,
  type TrialWindow,
  type SubscriptionAccessMode,
  type SubscriptionTrialView,
} from "./lifecycle";

export {
  reminderKindForDaysRemaining,
  buildReminderState,
  labelRenewalReminder,
  resolveReminderExpiryAt,
  currentSubscriptionLabelForReminder,
  buildRenewalReminderView,
  type RenewalReminderView,
} from "./reminders";

export {
  buildRenewalSnapshot,
  assembleInstituteBillingHistory,
  DEFAULT_ADJUSTMENT_REASON,
  type RenewalSnapshotInput,
  type InstituteBillingHistory,
} from "./history";

export {
  monthlyPriceForHeadcount,
  remainingMonthsInPeriod,
  calculatePostRenewalAdjustment,
  quoteFromPaidPeriod,
  type PostRenewalAdjustmentInput,
  type PostRenewalAdjustmentQuote,
} from "./adjustments";

export {
  ComingSoonOnlinePaymentAdapter,
  beginOnlineCheckout,
  getOnlinePaymentAdapter,
  setOnlinePaymentAdapter,
  resetOnlinePaymentAdapter,
  isOnlinePaymentAvailable,
  getOnlinePaymentStatusMessage,
  type OnlineCheckoutRequest,
  type OnlineCheckoutResult,
  type OnlineCheckoutFailure,
  type OnlineCheckoutSuccess,
  type OnlinePaymentAdapter,
} from "./payment-adapter";

export type {
  SubscriptionLifecycleStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  InstituteSubscription,
  SubscriptionPeriod,
  RenewalRecord,
  PaymentRecord,
  OfflinePaymentSubmission,
  RenewalReminderState,
  BillingAdjustment,
  BillingAdjustmentStatus,
  SubscriptionStoreState,
} from "./types";

export {
  listInstituteSubscriptions,
  getInstituteSubscription,
  listRenewalRecords,
  listPaymentRecords,
  listOfflinePaymentSubmissions,
  getOfflinePaymentSubmission,
  labelOfflinePaymentStatus,
  listRenewalReminders,
  listBillingAdjustments,
  getPendingBillingAdjustment,
  syncPostRenewalHeadcount,
  submitBillingAdjustmentOffline,
  approveBillingAdjustment,
  rejectBillingAdjustment,
  subscribeSubscriptions,
  startInstituteTrial,
  setInstituteAssignedRate,
  setInstituteActiveStudentCount,
  refreshAllSubscriptionLifecycles,
  startOnlineCheckoutPlaceholder,
  submitOfflinePayment,
  approveOfflinePayment,
  rejectOfflinePayment,
  extendInstituteTrial,
  activateSubscriptionManual,
  ensureRenewalReminders,
  getActiveRenewalReminderView,
  dismissRenewalReminder,
  syncAdminReadOnlyFromSubscription,
  hydrateInstituteSubscriptionFromApi,
  clearInstituteSubscriptionLocal,
  getInstituteBillingHistory,
} from "./store";
