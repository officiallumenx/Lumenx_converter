import type {
  AdmissionApplicationDto,
  AdmissionApplicationListItem,
  AdmissionApplicationStage,
  AdmissionApplicationStatus,
  AdmissionOpeningDto,
  AdmissionOpeningListItem,
  AdmissionProgramDto,
  AdmissionProgramListItem,
} from "./types";

function formatDateLabel(iso: string | null): string {
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

function labelOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function gradeFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const record = payload as Record<string, unknown>;
  for (const key of ["grade", "className", "class", "programLabel"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "—";
}

function mapStatus(status: AdmissionApplicationStatus): AdmissionApplicationStage {
  if (status === "draft") return "submitted";
  return status;
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

export function admissionApplicationDtoToListItem(
  dto: AdmissionApplicationDto,
): AdmissionApplicationListItem {
  return {
    id: dto.id,
    name: dto.studentDisplayName?.trim() || "Applicant",
    grade: gradeFromPayload(dto.payload),
    stage: mapStatus(dto.status),
    applied: formatApplied(dto.submittedAt ?? dto.createdAt),
    docs: "—/—",
    instituteId: dto.instituteId,
  };
}

export function admissionApplicationDtosToListItems(
  rows: AdmissionApplicationDto[],
): AdmissionApplicationListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions API response must be an array");
  }
  return rows.map(admissionApplicationDtoToListItem);
}

export function admissionProgramDtoToListItem(
  dto: AdmissionProgramDto,
): AdmissionProgramListItem {
  return {
    id: dto.id,
    name: dto.name?.trim() || "Program",
    slug: dto.slug,
    status: dto.status,
    seatsAvailable: dto.seatsAvailable,
    academicYearLabel: labelOrDash(dto.academicYearLabel),
    applicationDeadline: formatDateLabel(dto.applicationDeadline),
  };
}

export function admissionProgramDtosToListItems(
  rows: AdmissionProgramDto[],
): AdmissionProgramListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions programs API response must be an array");
  }
  return rows.map(admissionProgramDtoToListItem);
}

export function admissionOpeningDtoToListItem(
  dto: AdmissionOpeningDto,
): AdmissionOpeningListItem {
  return {
    id: dto.id,
    programId: dto.programId,
    name: dto.name?.trim() || "Opening",
    slug: dto.slug,
    status: dto.status,
    seatsAvailable: dto.seatsAvailable,
    academicYearLabel: labelOrDash(dto.academicYearLabel),
    applicationDeadline: formatDateLabel(dto.applicationDeadline),
  };
}

export function admissionOpeningDtosToListItems(
  rows: AdmissionOpeningDto[],
): AdmissionOpeningListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions openings API response must be an array");
  }
  return rows.map(admissionOpeningDtoToListItem);
}
