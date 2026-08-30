/** Mirrors backend TeacherDto — keep in sync with domains/teachers/types.ts. */

import type { TeacherRole, TeacherStatus } from "@lumenx/types";

export type TeachingScope =
  | "subject_teacher"
  | "activity_coordinator"
  | "dual_role";

export type PortalAccessLevel =
  | "faculty_grading"
  | "faculty_only"
  | "read_only";

export type ApiTeacherStatus = "active" | "on_leave" | "pending";

export type TeacherDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  legacyCode: string | null;
  employeeId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  department: string;
  qualification: string | null;
  dateOfBirth: string | null;
  joinedOn: string | null;
  teachingScope: TeachingScope;
  portalAccessLevel: PortalAccessLevel;
  status: ApiTeacherStatus;
  subjects: string[] | null;
  assignedSectionLabels: string[] | null;
  sourceCareerApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation-only row consumed by the Teachers directory list.
 * Never used as tenant/auth authority.
 */
export type TeacherListItem = {
  id: string;
  instituteId: string;
  name: string;
  role: TeacherRole;
  dept: string;
  email: string;
  phone: string;
  /** Demo-compat — not populated from API. */
  password: string;
  employeeId: string;
  joined: string;
  dateOfBirth?: string;
  classes: number;
  assignedSections: string[];
  status: TeacherStatus;
  subjects: string[];
  portalAccess: string;
  qualification: string;
  /** Demo-compat — hidden in API UI. */
  lastLogin: string;
  /** Demo-compat — hidden in API UI. */
  credentialsSentAt: string | null;
  /** Short identity label for cards (employee/legacy code, not tenant authority). */
  identityLabel: string;
};

export type ListTeachersParams = {
  instituteId: string;
};

export type { TeacherRole, TeacherStatus };
