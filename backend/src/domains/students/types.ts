/** Students domain types aligned to public.student. */

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

export type StudentRow = {
  id: string;
  institute_id: string;
  user_profile_id: string | null;
  legacy_code: string | null;
  admission_number: string | null;
  source_admission_application_id: string | null;
  first_name: string;
  surname: string;
  display_name: string;
  gender: StudentGender;
  date_of_birth: string | null;
  address: string;
  class_label: string | null;
  section_label: string | null;
  roll_no: string | null;
  status: StudentStatus;
  access_status: StudentAccessStatus;
  blood_group: string | null;
  emergency_contact: string | null;
  house: string | null;
  photo_asset_path: string | null;
  id_card_issued_on: string | null;
  id_card_valid_till: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type CreateStudentInput = {
  instituteId: string;
  firstName: string;
  surname: string;
  displayName?: string;
  gender: StudentGender;
  address: string;
  dateOfBirth?: string | null;
  classLabel?: string | null;
  sectionLabel?: string | null;
  rollNo?: string | null;
  status?: StudentStatus;
  accessStatus?: StudentAccessStatus;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  house?: string | null;
  photoAssetPath?: string | null;
  admissionNumber?: string | null;
  legacyCode?: string | null;
  idCardIssuedOn?: string | null;
  idCardValidTill?: string | null;
  /** Ignored for authorization / linking — never trust client. */
  userProfileId?: string | null;
};

export type UpdateStudentInput = {
  firstName?: string;
  surname?: string;
  displayName?: string;
  gender?: StudentGender;
  address?: string;
  dateOfBirth?: string | null;
  classLabel?: string | null;
  sectionLabel?: string | null;
  rollNo?: string | null;
  status?: StudentStatus;
  accessStatus?: StudentAccessStatus;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  house?: string | null;
  photoAssetPath?: string | null;
  admissionNumber?: string | null;
  legacyCode?: string | null;
  idCardIssuedOn?: string | null;
  idCardValidTill?: string | null;
};

export type ListStudentsFilter = {
  instituteId: string;
  status?: StudentStatus;
  accessStatus?: StudentAccessStatus;
  classLabel?: string;
  sectionLabel?: string;
  q?: string;
};
