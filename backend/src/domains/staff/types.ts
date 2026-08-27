/** Staff accounts domain types aligned to public.staff_account. */

export type StaffAccountStatus =
  | "active"
  | "on_leave"
  | "pending"
  | "suspended";

export type StaffAccountRow = {
  id: string;
  institute_id: string;
  user_profile_id: string | null;
  legacy_code: string | null;
  employee_id: string | null;
  display_name: string;
  phone: string | null;
  email: string | null;
  department: string;
  job_title: string | null;
  date_of_birth: string | null;
  joined_on: string | null;
  status: StaffAccountStatus;
  source_career_application_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StaffAccountDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  legacyCode: string | null;
  employeeId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  department: string;
  jobTitle: string | null;
  dateOfBirth: string | null;
  joinedOn: string | null;
  status: StaffAccountStatus;
  sourceCareerApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffAccountInput = {
  instituteId: string;
  displayName: string;
  department: string;
  status?: StaffAccountStatus;
  phone?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  employeeId?: string | null;
  legacyCode?: string | null;
  /** Ignored — never trust client. */
  userProfileId?: string | null;
};

export type UpdateStaffAccountInput = {
  displayName?: string;
  department?: string;
  status?: StaffAccountStatus;
  phone?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  employeeId?: string | null;
  legacyCode?: string | null;
};

export type ListStaffAccountsFilter = {
  instituteId: string;
  status?: StaffAccountStatus;
  q?: string;
};
