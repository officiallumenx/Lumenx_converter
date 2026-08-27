/** Nexus commercial core: operators, licenses, subscriptions. */

export type PlatformOperatorStatus = "active" | "invited" | "disabled";
export type LicensePlan = "core" | "plus" | "max";
export type LicenseCadence = "monthly" | "yearly";
export type EntitlementScope =
  | "admin_module"
  | "connect_portal"
  | "connect_module"
  | "platform_app";

export type SubscriptionLifecycle =
  | "registered"
  | "approved"
  | "trial_active"
  | "trial_expiring"
  | "trial_expired"
  | "grace_period"
  | "read_only"
  | "active";

export type PlatformOperatorRow = {
  id: string;
  user_id: string;
  role_code: string;
  handle: string;
  display_name: string;
  status: PlatformOperatorStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LicenseRow = {
  id: string;
  institute_id: string;
  plan: LicensePlan;
  cadence: LicenseCadence;
  starts_on: string | null;
  reminder_days: number[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ModuleEntitlementRow = {
  id: string;
  institute_id: string;
  license_id: string;
  scope: EntitlementScope;
  portal_id: string | null;
  target_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  institute_id: string;
  lifecycle_status: SubscriptionLifecycle;
  assigned_rate_inr: number;
  active_student_count: number;
  trial_start_at: string | null;
  trial_end_at: string | null;
  grace_ends_at: string | null;
  current_period_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SubscriptionPeriodRow = {
  id: string;
  institute_id: string;
  subscription_id: string;
  duration_months: number;
  active_student_count: number;
  assigned_rate_inr: number;
  monthly_price_inr: number;
  regular_amount_inr: number;
  discount_amount_inr: number;
  payable_amount_inr: number;
  free_months: number;
  starts_at: string;
  ends_at: string;
  payment_method: "online" | "offline";
  payment_status: string;
  payment_ref: string | null;
  amount_paid_inr: number;
  paid_at: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PlatformOperatorDto = {
  id: string;
  userId: string;
  roleCode: string;
  handle: string;
  displayName: string;
  status: PlatformOperatorStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModuleEntitlementDto = {
  id: string;
  scope: EntitlementScope;
  portalId: string | null;
  targetId: string;
  enabled: boolean;
};

export type LicenseDto = {
  id: string;
  instituteId: string;
  plan: LicensePlan;
  cadence: LicenseCadence;
  startsOn: string | null;
  reminderDays: number[];
  entitlements: ModuleEntitlementDto[];
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPeriodDto = {
  id: string;
  durationMonths: number;
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  startsAt: string;
  endsAt: string;
  paymentMethod: "online" | "offline";
  paymentStatus: string;
  paymentRef: string | null;
  amountPaidInr: number;
  paidAt: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionDto = {
  id: string;
  instituteId: string;
  lifecycleStatus: SubscriptionLifecycle;
  assignedRateInr: number;
  activeStudentCount: number;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  currentPeriodId: string | null;
  currentPeriod: SubscriptionPeriodDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOperatorInput = {
  userId: string;
  roleCode: string;
  handle: string;
  displayName: string;
  status?: PlatformOperatorStatus;
};

export type UpdateOperatorInput = {
  roleCode?: string;
  handle?: string;
  displayName?: string;
  status?: PlatformOperatorStatus;
};

export type EntitlementInput = {
  scope: EntitlementScope;
  portalId?: string | null;
  targetId: string;
  enabled?: boolean;
};

export type UpsertLicenseInput = {
  instituteId: string;
  plan: LicensePlan;
  cadence: LicenseCadence;
  startsOn?: string | null;
  reminderDays?: number[];
  entitlements?: EntitlementInput[];
};

export type UpsertSubscriptionInput = {
  instituteId: string;
  lifecycleStatus: SubscriptionLifecycle;
  assignedRateInr: number;
  activeStudentCount?: number;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  graceEndsAt?: string | null;
};

export type CreatePeriodInput = {
  subscriptionId: string;
  durationMonths: 1 | 6 | 12;
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr?: number;
  payableAmountInr: number;
  freeMonths?: number;
  startsAt: string;
  endsAt: string;
  paymentMethod: "online" | "offline";
  paymentStatus?: string;
  paymentRef?: string | null;
  amountPaidInr?: number;
  paidAt?: string | null;
  makeCurrent?: boolean;
};
