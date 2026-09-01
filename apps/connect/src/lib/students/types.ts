/** Mirrors backend student DTO (Connect subset). */

export type StudentGender =
  | "female"
  | "male"
  | "other"
  | "prefer_not_to_say";

export type StudentStatus =
  | "active"
  | "at-risk"
  | "watch"
  | "inactive"
  | "graduated";

export type StudentAccessStatus = "active" | "hold" | "suspended";

export type StudentDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  legacyCode: string | null;
  admissionNumber: string | null;
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

export type StudentGuardianDto = {
  linkId: string;
  parentId: string;
  parentName: string;
  phone: string | null;
  email: string | null;
  relationship: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
};

export type ListStudentsParams = {
  instituteId: string;
  status?: StudentStatus;
  classLabel?: string;
  sectionLabel?: string;
  q?: string;
};
