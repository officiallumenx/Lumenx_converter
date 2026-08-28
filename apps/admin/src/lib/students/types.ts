/** Mirrors backend StudentDto — keep in sync with domains/students/types.ts. */

export type StudentStatus =
  | "active"
  | "at-risk"
  | "watch"
  | "inactive"
  | "graduated";

export type StudentAccessStatus = "active" | "hold" | "suspended";

export type StudentGender =
  | "female"
  | "male"
  | "other"
  | "prefer_not_to_say";

export type StudentDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  legacyCode: string | null;
  admissionNumber: string | null;
  sourceAdmissionApplicationId: string | null;
  firstName: string;
  surname: string;
  displayName: string;
  gender: StudentGender;
  dateOfBirth: string | null;
  address: string;
  classLabel: string | null;
  sectionLabel: string | null;
  rollNo: string | null;
  status: StudentStatus;
  accessStatus: StudentAccessStatus;
  bloodGroup: string | null;
  emergencyContact: string | null;
  house: string | null;
  photoAssetPath: string | null;
  idCardIssuedOn: string | null;
  idCardValidTill: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation-only row consumed by the Students directory list.
 * Never used as tenant/auth authority.
 */
export type StudentListItem = {
  id: string;
  name: string;
  firstName: string;
  surname: string;
  displayName: string;
  grade: string;
  classLabel: string | null;
  sectionLabel: string | null;
  rollNo: string | null;
  admissionNumber: string | null;
  status: StudentStatus;
  accessStatus: StudentAccessStatus;
  gender: StudentGender;
  dateOfBirth: string | null;
  /** Demo-compat fields for shared filter/sort helpers — not API metrics. */
  attendance: number;
  gpa: number;
  parent: string;
};

export type StudentDetailItem = StudentListItem & {
  address: string;
  bloodGroup: string | null;
  emergencyContact: string | null;
  house: string | null;
  legacyCode: string | null;
  updatedAt: string;
};

export type ListStudentsParams = {
  instituteId: string;
};
