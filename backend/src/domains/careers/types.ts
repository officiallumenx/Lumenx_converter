/** Careers foundation types (step 6.2). */

export type CareerJobStatus = "draft" | "open" | "closed";
export type CareerEmploymentType = "full_time" | "part_time" | "contract";
export type CareerWorkMode = "onsite" | "remote" | "hybrid";

export type CareerApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "assessment"
  | "demo_class"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_sent"
  | "offer_accepted"
  | "selected"
  | "rejected"
  | "on_hold"
  | "withdrawn";

export type CareerInquiryCategory = "job" | "application" | "recruitment" | "general";
export type CareerInquiryStatus = "open" | "responded" | "closed";
export type TalentPoolStatus = "active" | "archived";
export type SavedItemKind = "career_job";

export type CareerJobRow = {
  id: string;
  institute_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  employment_type: CareerEmploymentType;
  work_mode: CareerWorkMode;
  location_label: string | null;
  openings_count: number;
  status: CareerJobStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CareerJobDto = {
  id: string;
  instituteId: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  employmentType: CareerEmploymentType;
  workMode: CareerWorkMode;
  locationLabel: string | null;
  openingsCount: number;
  status: CareerJobStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateProfileRow = {
  id: string;
  institute_id: string;
  user_profile_id: string;
  display_name: string;
  headline: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  payload: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CandidateProfileDto = {
  id: string;
  instituteId: string;
  userProfileId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type CareerApplicationRow = {
  id: string;
  institute_id: string;
  job_id: string;
  candidate_profile_id: string | null;
  applicant_user_id: string;
  status: CareerApplicationStatus;
  cover_letter: string | null;
  payload: unknown;
  decision_note: string | null;
  converted_teacher_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CareerApplicationDto = {
  id: string;
  instituteId: string;
  jobId: string;
  candidateProfileId: string | null;
  applicantUserId: string;
  status: CareerApplicationStatus;
  coverLetter: string | null;
  payload: unknown;
  decisionNote: string | null;
  convertedTeacherId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CareerInquiryRow = {
  id: string;
  institute_id: string;
  category: CareerInquiryCategory;
  subject: string;
  body: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: CareerInquiryStatus;
  response_note: string | null;
  requested_by_user_id: string | null;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CareerInquiryDto = {
  id: string;
  instituteId: string;
  category: CareerInquiryCategory;
  subject: string;
  body: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: CareerInquiryStatus;
  responseNote: string | null;
  requestedByUserId: string | null;
  respondedByUserId: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TalentPoolEntryRow = {
  id: string;
  institute_id: string;
  candidate_user_id: string;
  candidate_profile_id: string | null;
  notes: string | null;
  status: TalentPoolStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TalentPoolEntryDto = {
  id: string;
  instituteId: string;
  candidateUserId: string;
  candidateProfileId: string | null;
  notes: string | null;
  status: TalentPoolStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type UserSavedItemRow = {
  id: string;
  institute_id: string;
  user_profile_id: string;
  item_kind: SavedItemKind;
  item_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserSavedItemDto = {
  id: string;
  instituteId: string;
  userProfileId: string;
  itemKind: SavedItemKind;
  itemId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateJobInput = {
  instituteId: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string;
  employmentType?: CareerEmploymentType;
  workMode?: CareerWorkMode;
  locationLabel?: string | null;
  openingsCount?: number;
  openNow?: boolean;
};

export type UpdateJobInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  category?: string;
  employmentType?: CareerEmploymentType;
  workMode?: CareerWorkMode;
  locationLabel?: string | null;
  openingsCount?: number;
  status?: CareerJobStatus;
};

export type UpsertCandidateProfileInput = {
  instituteId: string;
  displayName: string;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  email?: string | null;
  payload?: unknown;
};

export type CreateApplicationInput = {
  instituteId: string;
  jobId: string;
  coverLetter?: string | null;
  payload?: unknown;
  submitNow?: boolean;
};

export type TransitionApplicationInput = {
  status: CareerApplicationStatus;
  decisionNote?: string | null;
};

export type UpdateApplicationInput = {
  coverLetter?: string | null;
  payload?: unknown;
  decisionNote?: string | null;
};

export type CreateInquiryInput = {
  instituteId: string;
  category?: CareerInquiryCategory;
  subject: string;
  body: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type RespondInquiryInput = {
  status: "responded" | "closed";
  responseNote: string;
};

export type CreateTalentPoolInput = {
  instituteId: string;
  candidateUserId: string;
  notes?: string | null;
};

export type CreateSavedItemInput = {
  instituteId: string;
  itemKind: SavedItemKind;
  itemId: string;
};
