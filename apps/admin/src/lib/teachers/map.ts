import type { TeacherRole, TeacherStatus } from "@lumenx/types";
import type {
  ApiTeacherStatus,
  PortalAccessLevel,
  TeacherDto,
  TeacherListItem,
  TeachingScope,
} from "./types";

const KNOWN_STATUSES = new Set<TeacherStatus>(["active", "on-leave", "pending"]);

export function teachingScopeToRole(scope: TeachingScope): TeacherRole {
  if (scope === "activity_coordinator") return "activity-coordinator";
  if (scope === "dual_role") return "both";
  return "subject-teacher";
}

export function roleToTeachingScope(role: TeacherRole): TeachingScope {
  if (role === "activity-coordinator") return "activity_coordinator";
  if (role === "both") return "dual_role";
  return "subject_teacher";
}

export function portalAccessLevelToLabel(level: PortalAccessLevel): string {
  if (level === "faculty_grading") return "Faculty + Grading";
  if (level === "faculty_only") return "Faculty only";
  return "Read-only";
}

export function portalAccessLabelToLevel(label: string): PortalAccessLevel {
  if (label === "Faculty only") return "faculty_only";
  if (label === "Read-only") return "read_only";
  return "faculty_grading";
}

export function teacherStatusToApi(status: TeacherStatus): ApiTeacherStatus {
  if (status === "on-leave") return "on_leave";
  if (status === "pending") return "pending";
  return "active";
}

export function apiStatusToTeacherStatus(status: string): TeacherStatus {
  if (status === "on_leave") return "on-leave";
  return KNOWN_STATUSES.has(status as TeacherStatus)
    ? (status as TeacherStatus)
    : "active";
}

export function formatJoinedLabel(iso: string | null): string {
  if (!iso?.trim()) return "—";
  const parsed = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso.trim();
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function teacherIdentityLabel(dto: TeacherDto): string {
  const employeeId = dto.employeeId?.trim();
  if (employeeId) return employeeId;
  const legacyCode = dto.legacyCode?.trim();
  if (legacyCode) return legacyCode;
  return dto.id.slice(0, 8);
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function teacherDtoToListItem(dto: TeacherDto): TeacherListItem {
  const assignedSections = Array.isArray(dto.assignedSectionLabels)
    ? dto.assignedSectionLabels.filter((label) => label?.trim())
    : [];
  const subjects = Array.isArray(dto.subjects)
    ? dto.subjects.filter((subject) => subject?.trim())
    : [];
  const displayName = dto.displayName?.trim() || "Teacher";

  return {
    id: dto.id,
    name: displayName,
    role: teachingScopeToRole(dto.teachingScope),
    dept: dto.department?.trim() || "—",
    email: dto.email?.trim() || "",
    phone: dto.phone?.trim() || "",
    password: "",
    employeeId: dto.employeeId?.trim() || dto.legacyCode?.trim() || "—",
    joined: formatJoinedLabel(dto.joinedOn),
    dateOfBirth: dto.dateOfBirth?.trim() || undefined,
    classes: assignedSections.length,
    assignedSections,
    status: apiStatusToTeacherStatus(dto.status as ApiTeacherStatus),
    subjects,
    portalAccess: portalAccessLevelToLabel(dto.portalAccessLevel),
    qualification: dto.qualification?.trim() || "",
    lastLogin: "—",
    credentialsSentAt: null,
    identityLabel: teacherIdentityLabel(dto),
  };
}

export function teacherDtosToListItems(dtos: TeacherDto[]): TeacherListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Teachers API response must be an array");
  }
  return dtos.map(teacherDtoToListItem);
}
