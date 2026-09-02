import type { MeInstituteMembership, MeResponse } from "@/lib/api/me-types";
import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionsAccountType, AdmissionsUser } from "@/lib/admissions/types";

/** Institute roles that may use the institute admin workspace. */
export const ADMISSIONS_INSTITUTE_ADMIN_ROLE_CODES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
  "it_admin",
  "staff",
  "teacher",
  "accountant",
]);

const ACTIVE_MEMBERSHIP = new Set(["active", "approved"]);

export type AdmissionsUserFromMeOptions = {
  preferredInstituteId?: string | null;
  instituteName?: string;
  forceAccountType?: AdmissionsAccountType;
  phone?: string;
};

function isActiveInstituteAdminMembership(m: MeInstituteMembership): boolean {
  if (!ACTIVE_MEMBERSHIP.has(m.status)) return false;
  return m.roles.some((role) => ADMISSIONS_INSTITUTE_ADMIN_ROLE_CODES.has(role));
}

function pickFirstActiveMembership(
  institutes: MeInstituteMembership[],
): MeInstituteMembership | null {
  return institutes.find((m) => ACTIVE_MEMBERSHIP.has(m.status)) ?? null;
}

export function pickInstituteAdminMembership(
  institutes: MeInstituteMembership[],
  preferredInstituteId?: string | null,
): MeInstituteMembership | null {
  const eligible = institutes.filter(isActiveInstituteAdminMembership);
  if (eligible.length === 0) return null;
  if (preferredInstituteId) {
    return (
      eligible.find((m) => m.instituteId === preferredInstituteId) ?? eligible[0]!
    );
  }
  return eligible[0]!;
}

export function resolveAdmissionsAccountType(
  me: MeResponse,
  options?: Pick<AdmissionsUserFromMeOptions, "preferredInstituteId" | "forceAccountType">,
): AdmissionsAccountType {
  if (options?.forceAccountType) return options.forceAccountType;
  return pickInstituteAdminMembership(me.institutes, options?.preferredInstituteId)
    ? "institute_admin"
    : "parent";
}

export function admissionsUserFromMe(
  me: MeResponse,
  options: AdmissionsUserFromMeOptions = {},
): AdmissionsUser {
  const accountType = resolveAdmissionsAccountType(me, options);
  const adminMembership =
    accountType === "institute_admin"
      ? pickInstituteAdminMembership(me.institutes, options.preferredInstituteId)
      : null;
  const activeMembership =
    adminMembership ?? pickFirstActiveMembership(me.institutes);

  return {
    id: me.user.id,
    name: me.profile.displayName,
    email: me.profile.email ?? undefined,
    phone: options.phone,
    passwordHash: "",
    profileComplete: accountType === "institute_admin" ? 100 : 25,
    createdAt: new Date().toISOString(),
    accountType,
    instituteId: adminMembership?.instituteId ?? activeMembership?.instituteId,
    instituteName:
      options.instituteName ??
      (adminMembership || activeMembership ? "Institute" : undefined),
  };
}

export async function fetchMe(accessToken?: string): Promise<MeResponse> {
  const api = getAdmissionsApiClient();
  return api.get<MeResponse>("/api/v1/me", {
    accessToken: accessToken ?? undefined,
  });
}

export async function fetchInstituteName(
  instituteId: string,
  accessToken?: string,
): Promise<string> {
  const api = getAdmissionsApiClient();
  try {
    const data = await api.get<{ name: string }>(`/api/v1/institutes/${instituteId}`, {
      accessToken: accessToken ?? undefined,
    });
    return data.name;
  } catch {
    return "Institute";
  }
}
