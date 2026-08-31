/** Mirrors backend EnrollmentDto — keep in sync with domains/academics/types.ts. */

export type EnrollmentStatus =
  | "active"
  | "completed"
  | "transferred"
  | "dropped_out"
  | "graduated";

export type EnrollmentDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  studentId: string;
  studentName: string;
  classId: string;
  sectionId: string;
  rollNo: string;
  status: EnrollmentStatus;
  enrolledOn: string;
  withdrawnOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListEnrollmentsParams = {
  instituteId: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  status?: EnrollmentStatus;
};

export type CreateEnrollmentInput = {
  instituteId: string;
  academicYearId: string;
  studentId: string;
  classId: string;
  sectionId: string;
  rollNo: string;
  enrolledOn: string;
  status?: EnrollmentStatus;
};

export type EnrollmentListItem = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  classLabel: string;
  sectionLabel: string;
  rollNo: string;
  status: EnrollmentStatus;
  enrolledOn: string;
  withdrawnOn: string | null;
};

export type UpdateEnrollmentInput = {
  rollNo?: string;
  status?: EnrollmentStatus;
  classId?: string;
  sectionId?: string;
  withdrawnOn?: string | null;
};
