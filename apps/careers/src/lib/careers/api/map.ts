import { buildApplicationTimeline } from "../mock-data";
import { interviewFromApplicationPayload } from "../interviews";
import type {
  ApplicationDocument,
  ApplicationStatus,
  JobApplication,
  JobCategory,
  JobPosting,
} from "../types";
import type { CareerApplicationDto, CareerJobDto } from "./types";

const DEFAULT_GRADIENT = "from-primary/20 to-primary/5";

const CATEGORY_ALIASES: Record<string, JobCategory> = {
  academic: "academic_faculty",
  academic_faculty: "academic_faculty",
  teaching: "academic_faculty",
  sports: "sports_faculty",
  sports_faculty: "sports_faculty",
  lab: "lab_faculty",
  lab_faculty: "lab_faculty",
  administrator: "administrator",
  admin: "administrator",
  accountant: "accountant",
  admissions: "admissions_officer",
  admissions_officer: "admissions_officer",
  transport: "transport_staff",
  support: "support_staff",
  support_staff: "support_staff",
  it: "it_software",
  it_software: "it_software",
  software: "it_software",
  sales: "sales_marketing",
  sales_marketing: "sales_marketing",
  marketing: "sales_marketing",
  finance: "finance",
  hr: "human_resources",
  human_resources: "human_resources",
  operations: "operations",
  healthcare: "healthcare",
};

function normalizeCategory(raw: string): JobCategory {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_ALIASES[key] ?? "academic_faculty";
}

function splitLocation(label: string | null): { city: string; state: string; location: string } {
  const location = label?.trim() || "—";
  if (!label?.includes(",")) {
    return { city: location, state: "—", location };
  }
  const [city, ...rest] = label.split(",").map((part) => part.trim());
  return { city: city || "—", state: rest.join(", ") || "—", location };
}

function payloadField(payload: unknown, keys: string[]): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function careerJobDtoToPosting(
  dto: CareerJobDto,
  instituteName = "Institute",
): JobPosting {
  const { city, state, location } = splitLocation(dto.locationLabel);
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    instituteName,
    city,
    state,
    title: dto.title?.trim() || "Job",
    department: dto.category?.trim() || "General",
    category: normalizeCategory(dto.category || ""),
    facultyType: "academic",
    employmentType: dto.employmentType,
    workMode: dto.workMode,
    experienceRequired: "—",
    postedAt: dto.createdAt,
    deadline: dto.updatedAt,
    overview: dto.description?.trim()?.slice(0, 240) || dto.title,
    description: dto.description ?? undefined,
    responsibilities: [],
    qualifications: [],
    skills: [],
    benefits: [],
    location,
    imageGradient: DEFAULT_GRADIENT,
    recruiterJobStatus: dto.status,
    postedByRecruiterId: dto.createdByUserId,
  };
}

export function careerJobDtosToPostings(
  rows: CareerJobDto[],
  instituteName = "Institute",
): JobPosting[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Careers jobs API response must be an array");
  }
  return rows.map((row) => careerJobDtoToPosting(row, instituteName));
}

function mapApiStatus(status: CareerApplicationDto["status"]): ApplicationStatus {
  if (status === "withdrawn") return "rejected";
  return status;
}

const EMPTY_PERSONAL: JobApplication["personal"] = {
  name: "",
  gender: "",
  dateOfBirth: "",
  mobile: "",
  email: "",
};

const EMPTY_ADDRESS: JobApplication["address"] = {
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

const EMPTY_PROFESSIONAL: JobApplication["professional"] = {
  highestQualification: "",
  experienceYears: "",
  currentEmployer: "",
  currentRole: "",
  expectedSalary: "",
  noticePeriod: "",
};

const EMPTY_SKILLS: JobApplication["skills"] = {
  teachingSubjects: "",
  sportsSpecialization: "",
  labSpecialization: "",
  technicalSkills: "",
  languagesKnown: "",
};

export function careerApplicationDtoToJobApplication(
  dto: CareerApplicationDto,
  context: {
    candidateId: string;
    jobTitle?: string;
    instituteName?: string;
  },
): JobApplication {
  const status = mapApiStatus(dto.status);
  const submittedAt = dto.submittedAt ?? dto.createdAt;
  const name =
    payloadField(dto.payload, ["name", "fullName", "candidateName", "displayName"]) ||
    context.candidateId;
  const jobTitle =
    payloadField(dto.payload, ["jobTitle", "title", "role", "position"]) ||
    context.jobTitle ||
    "Application";
  const instituteName =
    payloadField(dto.payload, ["instituteName", "organizationName"]) ||
    context.instituteName ||
    "Institute";
  const interview = interviewFromApplicationPayload(
    dto.payload,
    status,
    dto.updatedAt,
    dto.decisionNote,
  );

  return {
    id: dto.id,
    candidateId: context.candidateId,
    jobId: dto.jobId,
    jobTitle,
    instituteName,
    instituteId: dto.instituteId,
    status,
    submittedAt: dto.submittedAt ?? undefined,
    updatedAt: dto.updatedAt,
    personal: {
      ...EMPTY_PERSONAL,
      name,
      email: payloadField(dto.payload, ["email"]) || EMPTY_PERSONAL.email,
      mobile: payloadField(dto.payload, ["mobile", "phone"]) || EMPTY_PERSONAL.mobile,
    },
    address: {
      ...EMPTY_ADDRESS,
      city: payloadField(dto.payload, ["city"]) || EMPTY_ADDRESS.city,
      state: payloadField(dto.payload, ["state"]) || EMPTY_ADDRESS.state,
    },
    professional: EMPTY_PROFESSIONAL,
    skills: EMPTY_SKILLS,
    documents: [] as ApplicationDocument[],
    timeline: buildApplicationTimeline(status, submittedAt),
    hrNotes: dto.decisionNote ? [dto.decisionNote] : undefined,
    interview,
  };
}

export function careerApplicationDtosToJobApplications(
  rows: CareerApplicationDto[],
  context: {
    candidateId?: string;
    jobTitleById?: Map<string, string>;
    instituteName?: string;
  },
): JobApplication[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Careers applications API response must be an array");
  }
  return rows.map((row) =>
    careerApplicationDtoToJobApplication(row, {
      candidateId: context.candidateId ?? row.applicantUserId,
      jobTitle: context.jobTitleById?.get(row.jobId),
      instituteName: context.instituteName,
    }),
  );
}
