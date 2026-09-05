import { buildInstituteMonogramLogoUrl } from "@lumenx/utils";
import type { LicenseDto } from "@/lib/licenses/api";
import type { SubscriptionDto } from "@/lib/subscriptions/api";
import type { PlatformInstitute, InstituteStatus, PlanTier } from "@/lib/institute-directory-store";
import {
  defaultModulesOn,
  defaultModulesForPlan,
} from "@/lib/institute-licensing-store";
import type { InstituteDto, InstituteKind } from "./api";

const KIND_LABEL: Record<InstituteKind, string> = {
  school: "School (K-12)",
  junior_college: "Junior College",
  degree_college: "Degree College",
  engineering: "Engineering",
  university: "University",
};

function logoMarkFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "LX";
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  return h;
}

function mapStatus(dto: InstituteDto, sub?: SubscriptionDto): InstituteStatus {
  if (dto.status === "archived") return "archived";
  if (dto.status === "suspended") return "suspended";
  if (dto.status === "inactive") return "suspended";
  const life = sub?.lifecycleStatus;
  if (
    life === "trial_active" ||
    life === "trial_expiring" ||
    life === "registered" ||
    life === "approved"
  ) {
    return "trial";
  }
  return "active";
}

function mapPlan(license?: LicenseDto): PlanTier {
  const plan = license?.plan;
  if (plan === "core" || plan === "plus" || plan === "max") return plan;
  return "core";
}

function modulesFromLicense(license: LicenseDto | undefined, plan: PlanTier): Record<string, boolean> {
  if (!license?.entitlements?.length) {
    return defaultModulesForPlan(plan);
  }
  const base = defaultModulesOn();
  for (const e of license.entitlements) {
    if (e.scope === "admin_module" || e.scope === "connect_module") {
      base[e.targetId] = e.enabled;
    }
  }
  return base;
}

function renewalFromSub(sub?: SubscriptionDto): PlatformInstitute["renewalStatus"] {
  const life = sub?.lifecycleStatus;
  if (!life) return "current";
  if (life === "trial_active" || life === "trial_expiring" || life === "registered") return "trial";
  if (life === "trial_expired" || life === "grace_period") return "due_soon";
  if (life === "read_only") return "overdue";
  return "current";
}

function paymentFromSub(sub?: SubscriptionDto): PlatformInstitute["paymentStatus"] {
  const status = sub?.currentPeriod?.paymentStatus?.toLowerCase();
  if (status === "paid" || status === "partial" || status === "pending" || status === "overdue") {
    return status;
  }
  if (sub?.lifecycleStatus === "active") return "paid";
  return "pending";
}

/** Map live identity + optional license/subscription rows into directory cards. */
export function mapInstituteDtoToPlatform(
  dto: InstituteDto,
  license?: LicenseDto,
  subscription?: SubscriptionDto,
): PlatformInstitute {
  const plan = mapPlan(license);
  const logoMark = logoMarkFromName(dto.name);
  const logoHue = hueFromId(dto.id);
  const amount =
    subscription?.currentPeriod?.payableAmountInr ??
    (subscription
      ? subscription.assignedRateInr * Math.max(1, subscription.activeStudentCount)
      : 0);
  const paid = subscription?.currentPeriod?.amountPaidInr ?? 0;
  const billingStart =
    subscription?.currentPeriod?.startsAt?.slice(0, 16) ??
    license?.startsOn?.slice(0, 16) ??
    dto.createdAt.slice(0, 16);

  return {
    id: dto.id,
    name: dto.name,
    logoMark,
    logoHue,
    logoUrl: buildInstituteMonogramLogoUrl(logoMark, logoHue),
    city: "—",
    state: "—",
    country: "India",
    addressLine: "",
    pincode: "",
    board: "—",
    instituteType: KIND_LABEL[dto.kind] ?? dto.kind,
    establishedYear: new Date(dto.createdAt).getFullYear() || new Date().getFullYear(),
    contactEmail: "",
    contactPhone: "",
    status: mapStatus(dto, subscription),
    plan,
    billingCadence: license?.cadence === "monthly" ? "monthly" : "yearly",
    amountInr: amount,
    paidAmountInr: paid,
    pendingAmountInr: Math.max(0, amount - paid),
    billingStartAt: billingStart,
    paymentStatus: paymentFromSub(subscription),
    renewalStatus: renewalFromSub(subscription),
    studentCount: subscription?.activeStudentCount ?? 0,
    facultyCount: 0,
    parentCount: 0,
    adminCount: 0,
    activeUsagePct: 0,
    usageStatus: "inactive",
    riskStatus: "low",
    usageTrend: [0, 0, 0, 0, 0, 0],
    modules: modulesFromLicense(license, plan),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
