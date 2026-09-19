import type { InstituteKind } from "@lumenx/types";
import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionInstituteProfile } from "./institutes-data";

export type LoginInstituteDto = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

/** Public active institutes (same source as Admin/Connect login picker). */
export async function listAdmissionsDirectoryInstitutes(): Promise<LoginInstituteDto[]> {
  return getAdmissionsApiClient().get<LoginInstituteDto[]>(
    "/api/v1/auth/staff/institutes",
    { skipAuth: true },
  );
}

function asKind(kind: string): InstituteKind {
  const allowed: InstituteKind[] = [
    "school",
    "junior_college",
    "degree_college",
    "engineering",
    "university",
  ];
  return (allowed.includes(kind as InstituteKind) ? kind : "school") as InstituteKind;
}

/** Map login DTO → browse card shape (no fake marketing stats). */
export function loginInstituteToAdmissionProfile(
  row: LoginInstituteDto,
): AdmissionInstituteProfile {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    kind: asKind(row.kind),
    city: "",
    state: "",
    country: "India",
    tagline: `${row.code} · ${asKind(row.kind).replace(/_/g, " ")}`,
    heroStat: "",
    rating: 0,
    programsCount: 0,
    seatsOpen: 0,
    imageGradient: "from-primary/30 to-chart-5/20",
    highlights: [],
    achievements: [],
    facilities: [],
    contact: { phone: "", email: "", address: "" },
    admissionDates: [],
    about: "",
    established: "",
    accreditation: "",
  };
}

export async function loadAdmissionsDirectoryProfiles(): Promise<
  AdmissionInstituteProfile[]
> {
  const rows = await listAdmissionsDirectoryInstitutes();
  return rows.map(loginInstituteToAdmissionProfile);
}
