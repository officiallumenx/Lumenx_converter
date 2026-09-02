import type { MeInstituteMembership, MeResponse } from "@/lib/api/me-types";
import { getCareersApiClient } from "@/lib/careers-api";
import type {
  CareersAccountType,
  CareersUser,
  OrganizationType,
} from "@/lib/careers/types";

/** Institute roles that may use the recruiter workspace (mirrors backend careers RBAC). */
export const CAREERS_RECRUITER_ROLE_CODES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
  "accountant",
  "admissions_officer",
]);

const ACTIVE_MEMBERSHIP = new Set(["active", "approved"]);

export type CareersUserFromMeOptions = {
  preferredInstituteId?: string | null;
  instituteName?: string;
  /** Signup intent when /me has no institute membership yet. */
  forceAccountType?: CareersAccountType;
  organizationName?: string;
  organizationType?: OrganizationType;
  phone?: string;
};

function isActiveRecruiterMembership(m: MeInstituteMembership): boolean {
  if (!ACTIVE_MEMBERSHIP.has(m.status)) return false;
  return m.roles.some((role) => CAREERS_RECRUITER_ROLE_CODES.has(role));
}

function pickFirstActiveMembership(
  institutes: MeInstituteMembership[],
): MeInstituteMembership | null {
  return institutes.find((m) => ACTIVE_MEMBERSHIP.has(m.status)) ?? null;
}

export function pickRecruiterMembership(
  institutes: MeInstituteMembership[],
  preferredInstituteId?: string | null,
): MeInstituteMembership | null {
  const eligible = institutes.filter(isActiveRecruiterMembership);
  if (eligible.length === 0) return null;
  if (preferredInstituteId) {
    return (
      eligible.find((m) => m.instituteId === preferredInstituteId) ?? eligible[0]!
    );
  }
  return eligible[0]!;
}

export function resolveCareersAccountType(
  me: MeResponse,
  options?: Pick<CareersUserFromMeOptions, "preferredInstituteId" | "forceAccountType">,
): CareersAccountType {
  if (options?.forceAccountType) return options.forceAccountType;
  return pickRecruiterMembership(me.institutes, options?.preferredInstituteId)
    ? "recruiter"
    : "job_seeker";
}

export function careersUserFromMe(
  me: MeResponse,
  options: CareersUserFromMeOptions = {},
): CareersUser {
  const accountType = resolveCareersAccountType(me, options);
  const recruiterMembership =
    accountType === "recruiter"
      ? pickRecruiterMembership(me.institutes, options.preferredInstituteId)
      : null;
  const activeMembership =
    recruiterMembership ?? pickFirstActiveMembership(me.institutes);

  return {
    id: me.user.id,
    name: me.profile.displayName,
    email: me.profile.email ?? undefined,
    phone: options.phone,
    passwordHash: "",
    authSource: "api",
    accountType,
    organizationId: recruiterMembership?.instituteId,
    organizationName:
      options.instituteName ??
      options.organizationName ??
      (recruiterMembership ? "Institute" : undefined),
    organizationType:
      accountType === "recruiter"
        ? (options.organizationType ?? "education")
        : undefined,
    activeInstituteId: activeMembership?.instituteId,
    profileComplete: accountType === "recruiter" ? 100 : 25,
    emailVerified: me.profile.status === "active",
    phoneVerified: Boolean(options.phone),
    createdAt: new Date().toISOString(),
  };
}

export async function fetchMe(accessToken?: string): Promise<MeResponse> {
  const api = getCareersApiClient();
  return api.get<MeResponse>("/api/v1/me", {
    accessToken: accessToken ?? undefined,
  });
}

export async function fetchInstituteName(
  instituteId: string,
  accessToken?: string,
): Promise<string> {
  const api = getCareersApiClient();
  try {
    const data = await api.get<{ name: string }>(`/api/v1/institutes/${instituteId}`, {
      accessToken: accessToken ?? undefined,
    });
    return data.name;
  } catch {
    return "Institute";
  }
}
