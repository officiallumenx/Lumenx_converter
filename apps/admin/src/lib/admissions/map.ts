import type { AdminAdmissionDetail, AdminAdmissionDocument } from "@/lib/admissions-application-details";
import type {
  AdmissionApplicationDto,
  AdmissionApplicationListItem,
  AdmissionApplicationStage,
  AdmissionApplicationStatus,
  AdmissionDocumentDto,
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

export function formatAdmissionDocCount(docs: { status: string }[]): string {
  if (docs.length === 0) return "0/0";
  const verified = docs.filter((d) => d.status === "verified").length;
  return `${verified}/${docs.length}`;
}

export function admissionApplicationDtoToListItem(
  dto: AdmissionApplicationDto,
  docsSummary?: string,
): AdmissionApplicationListItem {
  return {
    id: dto.id,
    name: dto.studentDisplayName?.trim() || "Applicant",
    grade: gradeFromPayload(dto.payload),
    stage: mapStatus(dto.status),
    applied: formatApplied(dto.submittedAt ?? dto.createdAt),
    docs: docsSummary ?? "—/—",
    instituteId: dto.instituteId,
  };
}

export function admissionApplicationDtosToListItems(
  rows: AdmissionApplicationDto[],
  docCounts?: Record<string, string>,
): AdmissionApplicationListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions API response must be an array");
  }
  return rows.map((dto) =>
    admissionApplicationDtoToListItem(dto, docCounts?.[dto.id]),
  );
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

function payloadRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  return payload as Record<string, unknown>;
}

function payloadSection(payload: unknown, key: string): Record<string, unknown> {
  const section = payloadRecord(payload)[key];
  if (!section || typeof section !== "object") return {};
  return section as Record<string, unknown>;
}

function payloadString(payload: unknown, ...keys: string[]): string {
  const record = payloadRecord(payload);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function payloadStringFromSection(
  payload: unknown,
  sectionKey: string,
  ...keys: string[]
): string {
  const section = payloadSection(payload, sectionKey);
  for (const key of keys) {
    const value = section[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function admissionDocumentDtoToAdminDoc(
  dto: AdmissionDocumentDto,
  applicationId: string,
  studentName: string,
): AdminAdmissionDocument {
  return {
    id: dto.id,
    type: dto.docType,
    label: dto.label?.trim() || dto.docType.replace(/_/g, " "),
    fileName: dto.fileName?.trim() || "—",
    kind: dto.docType === "student_photo" ? "image" : "pdf",
    status: dto.status,
    uploadedAt: dto.updatedAt.slice(0, 10),
    note: dto.note ?? undefined,
    applicantName: studentName,
    applicationId,
  };
}

/** Map API application + documents into Admin convert/detail shape. */
export function admissionApplicationDtoToAdminDetail(
  dto: AdmissionApplicationDto,
  documents: AdmissionDocumentDto[] = [],
  programName?: string,
): AdminAdmissionDetail {
  const payload = dto.payload;
  const studentName =
    payloadStringFromSection(payload, "student", "name") ||
    dto.studentDisplayName?.trim() ||
    "Applicant";

  return {
    id: dto.id,
    programName:
      programName ??
      (payloadString(payload, "programName", "programLabel") || "—"),
    academicYear: payloadString(payload, "academicYear") || "2026–27",
    grade: gradeFromPayload(payload),
    student: {
      name: studentName,
      gender: payloadStringFromSection(payload, "student", "gender"),
      dateOfBirth: payloadStringFromSection(payload, "student", "dateOfBirth"),
      nationality: payloadStringFromSection(payload, "student", "nationality"),
      bloodGroup: payloadStringFromSection(payload, "student", "bloodGroup"),
    },
    parent: {
      fatherName: payloadStringFromSection(payload, "parent", "fatherName"),
      motherName: payloadStringFromSection(payload, "parent", "motherName"),
      guardianName: payloadStringFromSection(payload, "parent", "guardianName"),
      mobile: payloadStringFromSection(payload, "parent", "mobile"),
      email: payloadStringFromSection(payload, "parent", "email"),
      occupation: payloadStringFromSection(payload, "parent", "occupation"),
    },
    address: {
      address: payloadStringFromSection(payload, "address", "address"),
      city: payloadStringFromSection(payload, "address", "city"),
      state: payloadStringFromSection(payload, "address", "state"),
      country: payloadStringFromSection(payload, "address", "country"),
      postalCode: payloadStringFromSection(payload, "address", "postalCode"),
    },
    academic: {
      currentSchool: payloadStringFromSection(payload, "academic", "currentSchool"),
      currentGrade: payloadStringFromSection(payload, "academic", "currentGrade"),
      previousResults: payloadStringFromSection(payload, "academic", "previousResults"),
      performance: payloadStringFromSection(payload, "academic", "performance"),
    },
    documents: documents.map((doc) =>
      admissionDocumentDtoToAdminDoc(doc, dto.id, studentName),
    ),
    timeline: dto.submittedAt
      ? [{ label: "Application submitted", at: dto.submittedAt }]
      : [{ label: "Application created", at: dto.createdAt }],
    adminNotes: dto.decisionNote ? [dto.decisionNote] : undefined,
  };
}
