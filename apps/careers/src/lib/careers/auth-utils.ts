import type { CareersAccountType, CareersUser } from "./types";

export function isJobSeeker(user: CareersUser | null | undefined): boolean {
  return user?.accountType === "job_seeker";
}

export function isRecruiter(user: CareersUser | null | undefined): boolean {
  return user?.accountType === "recruiter";
}

export function careersDefaultRoute(
  user: CareersUser,
): "/dashboard" | "/recruiter" {
  return user.accountType === "recruiter" ? "/recruiter" : "/dashboard";
}

export function normalizeCareersUser(
  raw: Partial<CareersUser> & Pick<CareersUser, "id" | "name" | "passwordHash" | "createdAt">,
): CareersUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    passwordHash: raw.passwordHash,
    authSource: raw.authSource ?? "demo",
    accountType: raw.accountType ?? "job_seeker",
    organizationId: raw.organizationId,
    organizationName: raw.organizationName,
    organizationType: raw.organizationType,
    activeInstituteId: raw.activeInstituteId,
    profileComplete: raw.profileComplete ?? 25,
    emailVerified: raw.emailVerified,
    phoneVerified: raw.phoneVerified,
    createdAt: raw.createdAt,
  };
}

export const ORGANIZATION_TYPE_OPTIONS: {
  value: import("./types").OrganizationType;
  label: string;
}[] = [
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "technology", label: "Technology" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "hospitality", label: "Hospitality" },
  { value: "finance", label: "Finance" },
  { value: "logistics", label: "Logistics" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "other", label: "Other" },
];

export function accountTypeLabel(type: CareersAccountType): string {
  return type === "recruiter" ? "Recruiter" : "Job seeker";
}
