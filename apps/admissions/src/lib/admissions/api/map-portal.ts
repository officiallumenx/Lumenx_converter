import { buildTimeline } from "../mock-data";
import { normalizeApplicationStatus } from "../status-utils";
import type {
  AcademicInfo,
  AddressInfo,
  AdmissionApplication,
  AdmissionInquiry,
  AdmissionOpening,
  AdmissionProgram,
  AdmissionType,
  ApplicationDocument,
  ApplicationStatus,
  DocumentType,
  ParentInfo,
  StudentInfo,
} from "../types";
import type {
  AdmissionApplicationDto,
  AdmissionApplicationStatus,
  AdmissionInquiryDto,
  AdmissionOpeningDto,
  AdmissionProgramDto,
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

function payloadField(payload: unknown, keys: string[]): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function payloadObject(payload: unknown, key: string): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const value = (payload as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapApiStatus(status: AdmissionApplicationStatus): ApplicationStatus {
  if (status === "draft") return "submitted";
  return normalizeApplicationStatus(status);
}

const EMPTY_STUDENT: StudentInfo = {
  name: "",
  gender: "",
  dateOfBirth: "",
  nationality: "",
  bloodGroup: "",
};

const EMPTY_PARENT: ParentInfo = {
  fatherName: "",
  motherName: "",
  guardianName: "",
  mobile: "",
  email: "",
  occupation: "",
};

const EMPTY_ADDRESS: AddressInfo = {
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

const EMPTY_ACADEMIC: AcademicInfo = {
  currentSchool: "",
  currentGrade: "",
  previousResults: "",
  performance: "",
};

function parseDocumentsFromPayload(payload: unknown): ApplicationDocument[] {
  if (!payload || typeof payload !== "object") return [];
  const docs = (payload as Record<string, unknown>).documents;
  if (!Array.isArray(docs)) return [];
  const result: ApplicationDocument[] = [];
  for (const raw of docs) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const type = row.type;
    if (typeof type !== "string" || !isDocumentType(type)) continue;
    result.push({
      id: typeof row.id === "string" ? row.id : `doc-${type}`,
      type,
      label: typeof row.label === "string" ? row.label : type.replace(/_/g, " "),
      fileName: typeof row.fileName === "string" ? row.fileName : undefined,
      status:
        typeof row.status === "string"
          ? (row.status as ApplicationDocument["status"])
          : "uploaded",
      uploadedAt: typeof row.uploadedAt === "string" ? row.uploadedAt : undefined,
      note: typeof row.note === "string" ? row.note : undefined,
    });
  }
  return result;
}

function isDocumentType(value: string): value is DocumentType {
  return (
    value === "birth_certificate" ||
    value === "transfer_certificate" ||
    value === "marks_memo" ||
    value === "student_photo" ||
    value === "parent_id" ||
    value === "additional"
  );
}

function studentFromPayload(payload: unknown, displayName: string): StudentInfo {
  const student = payloadObject(payload, "student");
  return {
    name:
      (typeof student.name === "string" && student.name.trim()) ||
      displayName.trim() ||
      EMPTY_STUDENT.name,
    gender: typeof student.gender === "string" ? student.gender : EMPTY_STUDENT.gender,
    dateOfBirth:
      typeof student.dateOfBirth === "string"
        ? student.dateOfBirth
        : EMPTY_STUDENT.dateOfBirth,
    nationality:
      typeof student.nationality === "string" ? student.nationality : EMPTY_STUDENT.nationality,
    bloodGroup:
      typeof student.bloodGroup === "string" ? student.bloodGroup : EMPTY_STUDENT.bloodGroup,
    photoDataUrl:
      typeof student.photoDataUrl === "string" ? student.photoDataUrl : undefined,
  };
}

function parentFromPayload(payload: unknown): ParentInfo {
  const parent = payloadObject(payload, "parent");
  return {
    fatherName:
      typeof parent.fatherName === "string" ? parent.fatherName : EMPTY_PARENT.fatherName,
    motherName:
      typeof parent.motherName === "string" ? parent.motherName : EMPTY_PARENT.motherName,
    guardianName:
      typeof parent.guardianName === "string"
        ? parent.guardianName
        : EMPTY_PARENT.guardianName,
    mobile: typeof parent.mobile === "string" ? parent.mobile : EMPTY_PARENT.mobile,
    email: typeof parent.email === "string" ? parent.email : EMPTY_PARENT.email,
    occupation:
      typeof parent.occupation === "string" ? parent.occupation : EMPTY_PARENT.occupation,
  };
}

function addressFromPayload(payload: unknown): AddressInfo {
  const address = payloadObject(payload, "address");
  return {
    address: typeof address.address === "string" ? address.address : EMPTY_ADDRESS.address,
    city: typeof address.city === "string" ? address.city : EMPTY_ADDRESS.city,
    state: typeof address.state === "string" ? address.state : EMPTY_ADDRESS.state,
    country: typeof address.country === "string" ? address.country : EMPTY_ADDRESS.country,
    postalCode:
      typeof address.postalCode === "string" ? address.postalCode : EMPTY_ADDRESS.postalCode,
  };
}

function academicFromPayload(payload: unknown): AcademicInfo {
  const academic = payloadObject(payload, "academic");
  return {
    currentSchool:
      typeof academic.currentSchool === "string"
        ? academic.currentSchool
        : EMPTY_ACADEMIC.currentSchool,
    currentGrade:
      typeof academic.currentGrade === "string"
        ? academic.currentGrade
        : EMPTY_ACADEMIC.currentGrade,
    previousResults:
      typeof academic.previousResults === "string"
        ? academic.previousResults
        : EMPTY_ACADEMIC.previousResults,
    performance:
      typeof academic.performance === "string"
        ? academic.performance
        : EMPTY_ACADEMIC.performance,
  };
}

export function admissionApplicationDtoToPortal(
  dto: AdmissionApplicationDto,
  context: {
    applicantId?: string;
    programName?: string;
    programTitleById?: Map<string, string>;
    openingTitleById?: Map<string, string>;
  } = {},
): AdmissionApplication {
  const status = mapApiStatus(dto.status);
  const submittedAt = dto.submittedAt ?? dto.createdAt;
  const programName =
    payloadField(dto.payload, ["programName", "programLabel"]) ||
    context.programTitleById?.get(dto.programId) ||
    context.openingTitleById?.get(dto.openingId) ||
    context.programName ||
    "Program";
  const grade = payloadField(dto.payload, ["grade", "className", "class"]) || "—";
  const academicYear =
    payloadField(dto.payload, ["academicYear", "academicYearLabel"]) || "—";
  const admissionTypeRaw = payloadField(dto.payload, ["admissionType"]);
  const admissionType = (
    admissionTypeRaw === "transfer_admission" ? "transfer_admission" : "first_time_schooling"
  ) satisfies AdmissionType;

  return {
    id: dto.id,
    applicantId: context.applicantId ?? dto.applicantUserId,
    instituteId: dto.instituteId,
    admissionType,
    status,
    programId: dto.programId,
    programName,
    grade,
    academicYear,
    submittedAt: dto.submittedAt ?? undefined,
    updatedAt: dto.updatedAt,
    student: studentFromPayload(dto.payload, dto.studentDisplayName),
    parent: parentFromPayload(dto.payload),
    address: addressFromPayload(dto.payload),
    academic: academicFromPayload(dto.payload),
    documents: parseDocumentsFromPayload(dto.payload),
    timeline: buildTimeline(status),
    customAnswers:
      dto.payload &&
      typeof dto.payload === "object" &&
      !Array.isArray(dto.payload) &&
      (dto.payload as Record<string, unknown>).customAnswers &&
      typeof (dto.payload as Record<string, unknown>).customAnswers === "object"
        ? ((dto.payload as Record<string, unknown>).customAnswers as Record<string, string>)
        : undefined,
    adminNotes: dto.decisionNote ? [dto.decisionNote] : undefined,
  };
}

export function admissionApplicationDtosToPortal(
  rows: AdmissionApplicationDto[],
  context: {
    applicantId?: string;
    programTitleById?: Map<string, string>;
    openingTitleById?: Map<string, string>;
  } = {},
): AdmissionApplication[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions applications API response must be an array");
  }
  return rows.map((row) => admissionApplicationDtoToPortal(row, context));
}

export function admissionProgramDtoToPortal(dto: AdmissionProgramDto): AdmissionProgram {
  const grades = Array.isArray(dto.grades)
    ? dto.grades.filter((g): g is string => typeof g === "string")
    : [];
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    name: dto.name?.trim() || "Program",
    slug: dto.slug,
    description: dto.description?.trim() ?? "",
    duration: dto.duration?.trim() ?? "",
    eligibility: dto.eligibility?.trim() ?? "",
    ageCriteria: dto.ageCriteria?.trim() ?? undefined,
    seatsAvailable: dto.seatsAvailable,
    grades,
    academicYear: dto.academicYearLabel?.trim() || "—",
    applicationDeadline: formatDateLabel(dto.applicationDeadline),
  };
}

export function admissionProgramDtosToPortal(rows: AdmissionProgramDto[]): AdmissionProgram[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions programs API response must be an array");
  }
  return rows.map(admissionProgramDtoToPortal);
}

export function admissionOpeningDtoToPortal(dto: AdmissionOpeningDto): AdmissionOpening {
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    name: dto.name?.trim() || "Opening",
    slug: dto.slug,
    description: dto.description?.trim() ?? "",
    duration: "",
    eligibility: "",
    seatsAvailable: dto.seatsAvailable,
    grades: [],
    academicYear: dto.academicYearLabel?.trim() || "—",
    applicationDeadline: formatDateLabel(dto.applicationDeadline),
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function admissionOpeningDtosToPortal(rows: AdmissionOpeningDto[]): AdmissionOpening[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions openings API response must be an array");
  }
  return rows.map(admissionOpeningDtoToPortal);
}

export function admissionInquiryDtoToPortal(
  dto: AdmissionInquiryDto,
  applicantId: string,
): AdmissionInquiry {
  const status = dto.status === "responded" ? "answered" : dto.status;
  const responses =
    dto.responseNote && dto.respondedAt
      ? [
          {
            id: `resp-${dto.id}`,
            from: "Admissions Office",
            body: dto.responseNote,
            at: dto.respondedAt,
          },
        ]
      : [];

  return {
    id: dto.id,
    applicantId: dto.requestedByUserId ?? applicantId,
    instituteId: dto.instituteId,
    category: dto.category,
    subject: dto.subject,
    message: dto.body,
    status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    responses,
  };
}

export function admissionInquiryDtosToPortal(
  rows: AdmissionInquiryDto[],
  applicantId: string,
): AdmissionInquiry[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Admissions inquiries API response must be an array");
  }
  return rows.map((row) => admissionInquiryDtoToPortal(row, applicantId));
}

/** Resolve an opening UUID from a program or opening selection id. */
export function resolveOpeningIdForProgram(
  openings: AdmissionOpeningDto[],
  programOrOpeningId: string,
): string | null {
  const direct = openings.find((o) => o.id === programOrOpeningId);
  if (direct) return direct.id;
  const openMatch = openings.find(
    (o) => o.programId === programOrOpeningId && o.status === "open",
  );
  if (openMatch) return openMatch.id;
  return openings.find((o) => o.programId === programOrOpeningId)?.id ?? null;
}
