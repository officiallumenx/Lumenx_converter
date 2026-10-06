/** Aligns with Admin demo payload shape in @lumenx/utils institute-registration-store. */
// A 2 MiB image expands to roughly 2.8M characters when encoded as a data URL.
export const MAX_REGISTRATION_LOGO_DATA_URL_CHARS = 3_000_000;

export type InstituteRegistrationPayload = {
  instituteName: string;
  /** Unique short code for login picker (e.g. lumenx-001). */
  instituteCode?: string;
  instituteType?: string;
  educationBoard?: string;
  /** School landline / contact number (institute, not admin personal mobile). */
  schoolPhone?: string;
  schoolEmail?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  street?: string;
  landmark?: string;
  address?: string;
  pincode?: string;
  website?: string;
  principalName?: string;
  principalEmail?: string;
  principalMobile?: string;
  principalDesignation?: string;
  /** Preferred Admin login username (stored on applicant profile when available). */
  username?: string;
  /** Admin residential address (separate from institute address). */
  adminCountry?: string;
  adminState?: string;
  adminDistrict?: string;
  adminCity?: string;
  adminAddress?: string;
  adminPincode?: string;
  employeeId?: string;
  /** Optional data-URL logo from signup (V1 — no separate asset upload). */
  logoPreview?: string;
};

export type InstituteRegistrationStatus = "pending" | "approved" | "rejected";
export type InstituteRegistrationInternalStatus =
  | InstituteRegistrationStatus
  | "approving";

export type InstituteRegistrationRow = {
  id: string;
  applicant_user_id: string;
  applicant_name: string;
  email: string;
  phone: string | null;
  payload: InstituteRegistrationPayload;
  status: InstituteRegistrationInternalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  institute_id: string | null;
  created_at: string;
  updated_at: string;
  /** Typed mirrors of payload (nullable until migration applied / backfilled). */
  institute_code?: string | null;
  institute_type?: string | null;
  education_board?: string | null;
  school_email?: string | null;
  school_phone?: string | null;
  applicant_username?: string | null;
  admin_designation?: string | null;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  website?: string | null;
};

export type InstituteRegistrationDto = {
  id: string;
  applicantUserId: string;
  applicantName: string;
  email: string;
  phone: string | null;
  payload: InstituteRegistrationPayload;
  status: InstituteRegistrationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  instituteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRegistrationInput = {
  applicantName: string;
  email: string;
  password: string;
  phone?: string | null;
  pin?: string | null;
  payload: InstituteRegistrationPayload;
};

export type ResubmitRegistrationInput = {
  applicantName?: string;
  phone?: string | null;
  payload: InstituteRegistrationPayload;
};
