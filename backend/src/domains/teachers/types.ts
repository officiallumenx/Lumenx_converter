/** Teachers domain types aligned to public.teacher. */

export type TeachingScope =
  | "subject_teacher"
  | "activity_coordinator"
  | "dual_role";

export type PortalAccessLevel =
  | "faculty_grading"
  | "faculty_only"
  | "read_only";

export type TeacherStatus = "active" | "on_leave" | "pending";

export type TeacherRow = {
  id: string;
  institute_id: string;
  user_profile_id: string | null;
  legacy_code: string | null;
  employee_id: string | null;
  display_name: string;
  phone: string | null;
  email: string | null;
  department: string;
  qualification: string | null;
  date_of_birth: string | null;
  joined_on: string | null;
  teaching_scope: TeachingScope;
  portal_access_level: PortalAccessLevel;
  status: TeacherStatus;
  subjects: string[] | null;
  assigned_section_labels: string[] | null;
  source_career_application_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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
  status: TeacherStatus;
  subjects: string[] | null;
  assignedSectionLabels: string[] | null;
  sourceCareerApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTeacherInput = {
  instituteId: string;
  displayName: string;
  department: string;
  teachingScope: TeachingScope;
  portalAccessLevel: PortalAccessLevel;
  status?: TeacherStatus;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  employeeId?: string | null;
  legacyCode?: string | null;
  subjects?: string[] | null;
  assignedSectionLabels?: string[] | null;
  /** Ignored — never trust client. */
  userProfileId?: string | null;
};

export type UpdateTeacherInput = {
  displayName?: string;
  department?: string;
  teachingScope?: TeachingScope;
  portalAccessLevel?: PortalAccessLevel;
  status?: TeacherStatus;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  employeeId?: string | null;
  legacyCode?: string | null;
  subjects?: string[] | null;
  assignedSectionLabels?: string[] | null;
};

export type ListTeachersFilter = {
  instituteId: string;
  status?: TeacherStatus;
  teachingScope?: TeachingScope;
  q?: string;
};

export type PortalLearnerFacultyMemberDto = {
  id: string;
  displayName: string;
  department: string;
  qualification: string | null;
  subjects: string[];
  isClassTeacher: boolean;
  phone: string | null;
  email: string | null;
  status: TeacherStatus;
};

export type PortalLearnerFacultyDto = {
  instituteId: string;
  studentId: string;
  sectionId: string | null;
  classLabel: string | null;
  sectionLabel: string | null;
  teachers: PortalLearnerFacultyMemberDto[];
};

export type PortalTeacherAssignmentSummaryDto = {
  sectionId: string;
  classLabel: string;
  sectionLabel: string;
  subjects: string[];
};

export type PortalTeacherSelfDto = {
  instituteId: string;
  teacherId: string;
  displayName: string;
  employeeId: string | null;
  legacyCode: string | null;
  email: string | null;
  phone: string | null;
  department: string;
  qualification: string | null;
  teachingScope: TeachingScope;
  portalAccessLevel: PortalAccessLevel;
  status: TeacherStatus;
  subjects: string[] | null;
  assignedSectionLabels: string[] | null;
  joinedOn: string | null;
  assignments: PortalTeacherAssignmentSummaryDto[];
};
