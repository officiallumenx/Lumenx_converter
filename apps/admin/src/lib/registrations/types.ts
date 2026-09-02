/** Mirrors backend InstituteRegistrationDto — keep in sync with registrations/types.ts. */

export type InstituteRegistrationPayload = {
  instituteName: string;
  instituteType?: string;
  educationBoard?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  website?: string;
  principalName?: string;
  principalEmail?: string;
  principalMobile?: string;
  principalDesignation?: string;
  employeeId?: string;
  /** Optional data-URL logo from signup (V1 — no separate asset upload). */
  logoPreview?: string;
};

export type InstituteRegistrationStatus = "pending" | "approved" | "rejected";

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

export type SubmitRegistrationInput = {
  applicantName: string;
  email: string;
  password: string;
  phone?: string | null;
  payload: InstituteRegistrationPayload;
};

export type ResubmitRegistrationInput = {
  applicantName?: string;
  phone?: string | null;
  payload: InstituteRegistrationPayload;
};
