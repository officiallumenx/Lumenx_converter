import type {
  CareerApplicationDto,
  CareerApplicationListItem,
  CareerApplicationStage,
  CareerApplicationStatus,
  CareerEmploymentType,
  CareerJobDto,
  CareerJobListItem,
  CareerWorkMode,
} from "./types";

const EMPLOYMENT_LABELS: Record<CareerEmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
};

const WORK_MODE_LABELS: Record<CareerWorkMode, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function nameFromPayload(payload: unknown, applicantUserId: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["name", "fullName", "candidateName", "displayName"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return shortRef(applicantUserId, "Candidate");
}

function roleFromPayload(payload: unknown, jobId: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["role", "jobTitle", "title", "position"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return shortRef(jobId, "Job");
}

export function mapCareerStatusToStage(
  status: CareerApplicationStatus,
): CareerApplicationStage {
  switch (status) {
    case "offer_accepted":
    case "selected":
      return "approved";
    case "on_hold":
      return "waitlist";
    case "rejected":
    case "withdrawn":
      return "rejected";
    case "shortlisted":
    case "assessment":
      return "verification";
    case "demo_class":
    case "interview_scheduled":
    case "interview_completed":
    case "offer_sent":
      return "interview";
    case "draft":
    case "submitted":
    case "under_review":
    default:
      return "review";
  }
}

function formatApplied(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function careerApplicationDtoToListItem(
  dto: CareerApplicationDto,
): CareerApplicationListItem {
  return {
    id: dto.id,
    name: nameFromPayload(dto.payload, dto.applicantUserId),
    role: roleFromPayload(dto.payload, dto.jobId),
    stage: mapCareerStatusToStage(dto.status),
    applied: formatApplied(dto.submittedAt ?? dto.createdAt),
    docs: "—/—",
    institute: dto.instituteId,
    jobId: dto.jobId,
  };
}

export function careerApplicationDtosToListItems(
  rows: CareerApplicationDto[],
): CareerApplicationListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Careers API response must be an array");
  }
  return rows.map(careerApplicationDtoToListItem);
}

export function careerJobDtoToListItem(dto: CareerJobDto): CareerJobListItem {
  return {
    id: dto.id,
    title: dto.title?.trim() || "Job",
    category: dto.category?.trim() || "—",
    status: dto.status,
    employmentTypeLabel: EMPLOYMENT_LABELS[dto.employmentType] ?? dto.employmentType,
    workModeLabel: WORK_MODE_LABELS[dto.workMode] ?? dto.workMode,
    locationLabel: dto.locationLabel?.trim() || "—",
    openingsCount: dto.openingsCount,
  };
}

export function careerJobDtosToListItems(rows: CareerJobDto[]): CareerJobListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Careers jobs API response must be an array");
  }
  return rows.map(careerJobDtoToListItem);
}
