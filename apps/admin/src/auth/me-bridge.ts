import type { AdminRole, AuthUser } from "@/auth/types";
import type { MeInstituteMembership, MeResponse } from "@/lib/api/me-types";
import { getAdminApiClient } from "@/lib/admin-api";

const ROLE_MAP: Record<string, AdminRole> = {
  institute_admin: "super_admin",
  principal: "principal",
  vice_principal: "vice_principal",
  coordinator: "coordinator",
  teacher: "teacher",
  accountant: "accountant",
  it_admin: "it_admin",
  admissions_officer: "admissions_officer",
  staff: "coordinator",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "U";
}

function pickUiRole(memberships: MeInstituteMembership[], activeInstituteId: string | null): {
  role: AdminRole;
  title: string;
} {
  const active =
    memberships.find((m) => m.instituteId === activeInstituteId) ??
    memberships[0];
  const code = active?.roles[0] ?? "staff";
  const role = ROLE_MAP[code] ?? "coordinator";
  return { role, title: code.replace(/_/g, " ") };
}

export function authUserFromMe(
  me: MeResponse,
  activeInstituteId: string | null,
  instituteName: string,
): AuthUser {
  const { role, title } = pickUiRole(me.institutes, activeInstituteId);
  return {
    id: me.user.id,
    email: me.profile.email ?? "",
    name: me.profile.displayName,
    initials: initialsFromName(me.profile.displayName),
    role,
    title,
    instituteId: activeInstituteId ?? "",
    instituteName,
    isVerified: me.profile.status === "active",
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

export async function fetchMe(accessToken?: string): Promise<MeResponse> {
  const api = getAdminApiClient();
  return api.get<MeResponse>("/api/v1/me", {
    accessToken: accessToken ?? undefined,
  });
}

export async function fetchInstituteName(
  instituteId: string,
  accessToken?: string,
): Promise<string> {
  const api = getAdminApiClient();
  try {
    const data = await api.get<{ name: string }>(`/api/v1/institutes/${instituteId}`, {
      accessToken: accessToken ?? undefined,
    });
    return data.name;
  } catch {
    return "Institute";
  }
}
