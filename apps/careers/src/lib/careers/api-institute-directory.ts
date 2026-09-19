import { getCareersApiClient } from "@/lib/careers-api";
import type { InstituteCareerProfile } from "./types";

export type LoginInstituteDto = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

export async function listCareersDirectoryInstitutes(): Promise<LoginInstituteDto[]> {
  return getCareersApiClient().get<LoginInstituteDto[]>(
    "/api/v1/auth/staff/institutes",
    { skipAuth: true },
  );
}

function mapType(kind: string): InstituteCareerProfile["type"] {
  if (kind === "junior_college") return "junior_college";
  if (kind === "degree_college" || kind === "engineering" || kind === "university") {
    return "degree_college";
  }
  if (kind === "academy") return "academy";
  if (kind === "coaching") return "coaching";
  return "school";
}

export function loginInstituteToCareerProfile(row: LoginInstituteDto): InstituteCareerProfile {
  const initials =
    row.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || row.code.slice(0, 2).toUpperCase();

  return {
    instituteId: row.id,
    name: row.name,
    type: mapType(row.kind),
    city: "",
    state: "",
    logoInitials: initials,
    logoGradient: "from-primary/80 to-chart-5/60",
    tagline: `${row.code} · ${mapType(row.kind).replace(/_/g, " ")}`,
    about: "",
    principalName: "",
    principalMessage: "",
    culture: [],
    mission: "",
    vision: "",
    benefits: [],
    facilities: [],
    achievements: [],
    gallery: [],
    contact: { phone: "", email: "", address: "", hours: "" },
    featured: false,
    popular: false,
    openRolesCount: 0,
  };
}

export async function loadCareersDirectoryProfiles(): Promise<InstituteCareerProfile[]> {
  const rows = await listCareersDirectoryInstitutes();
  return rows.map(loginInstituteToCareerProfile);
}
