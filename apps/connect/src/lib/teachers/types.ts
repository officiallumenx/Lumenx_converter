/** Mirrors backend portal teacher DTOs — keep in sync with domains/teachers/types.ts. */

export type PortalLearnerFacultyMemberDto = {
  id: string;
  displayName: string;
  department: string;
  qualification: string | null;
  subjects: string[];
  isClassTeacher: boolean;
  phone: string | null;
  email: string | null;
  status: "active" | "on_leave" | "pending";
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
  teachingScope: "subject_teacher" | "activity_coordinator" | "dual_role";
  portalAccessLevel: "faculty_grading" | "faculty_only" | "read_only";
  status: "active" | "on_leave" | "pending";
  subjects: string[] | null;
  assignedSectionLabels: string[] | null;
  joinedOn: string | null;
  assignments: PortalTeacherAssignmentSummaryDto[];
};

export type LearnerTeacherCard = {
  id: string;
  name: string;
  subject: string;
  isClassTeacher: boolean;
  phone: string;
  initials: string;
  email?: string;
  qualification?: string;
  department?: string;
};
