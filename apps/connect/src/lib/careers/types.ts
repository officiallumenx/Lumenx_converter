export type JobCategory =
  | "academic_faculty"
  | "sports_faculty"
  | "lab_faculty"
  | "administrator"
  | "accountant"
  | "admissions_officer"
  | "transport_staff"
  | "support_staff"
  | "it_software"
  | "sales_marketing"
  | "finance"
  | "human_resources"
  | "operations"
  | "healthcare";

export type RecruiterJobStatus = "draft" | "open" | "closed";

export type EmploymentType = "full_time" | "part_time" | "contract";
export type WorkMode = "onsite" | "remote" | "hybrid";
export type InstituteType = "school" | "junior_college" | "degree_college" | "academy" | "coaching";
export type FacultyType = "academic" | "sports" | "lab" | "administrative";
export type EmploymentStatus = "employed" | "unemployed" | "freelance" | "student";
export type ProfileStrength = "starter" | "developing" | "strong" | "excellent";

export type ApplicationStatus =
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
  | "on_hold";

export type DocumentVerificationStatus =
  | "uploaded"
  | "under_review"
  | "verified"
  | "rejected"
  | "requires_resubmission";

export type CareerDocumentType =
  | "resume"
  | "certificates"
  | "experience_letters"
  | "identity_proof"
  | "profile_photo"
  | "demo_teaching_video"
  | "additional";

export type InterviewMode = "in_person" | "phone" | "video";

export type DemoClassEvaluationStatus =
  | "pending"
  | "scheduled"
  | "submitted"
  | "under_review"
  | "passed"
  | "needs_improvement";

export type CareersAccountType = "job_seeker" | "recruiter";

export type OrganizationType =
  | "education"
  | "healthcare"
  | "technology"
  | "retail"
  | "manufacturing"
  | "hospitality"
  | "finance"
  | "logistics"
  | "nonprofit"
  | "other";

export interface CareersUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  accountType: CareersAccountType;
  organizationId?: string;
  organizationName?: string;
  organizationType?: OrganizationType;
  profileComplete: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
}

export type EducationLevel =
  | "10th"
  | "12th"
  | "diploma"
  | "bachelors"
  | "masters"
  | "doctorate"
  | "certification"
  | "other";

export type LanguageProficiency = "basic" | "conversational" | "professional" | "native";

export interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  from: string;
  to?: string;
  current?: boolean;
  description?: string;
  employmentType?: EmploymentType;
  location?: string;
}

export interface InternshipEntry {
  id: string;
  title: string;
  company: string;
  from: string;
  to?: string;
  current?: boolean;
  description?: string;
  workMode?: WorkMode;
}

export interface QualificationEntry {
  id: string;
  educationLevel: EducationLevel;
  degree: string;
  field: string;
  institution: string;
  year: string;
  grade?: string;
  pursuing?: boolean;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  year: string;
  credentialId?: string;
  url?: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: LanguageProficiency;
}

export interface AchievementEntry {
  id: string;
  title: string;
  description?: string;
  year?: string;
}

export interface ProfileLinkEntry {
  id: string;
  label: string;
  url: string;
}

export interface AcademicTeachingProfile {
  subjects: string[];
  grades: string[];
  boards: string[];
  teachingExperienceYears: string;
  results?: string;
  achievements?: string;
}

export interface SportsTeachingProfile {
  sportsExpertise: string[];
  competitions?: string;
  coachingExperienceYears: string;
  achievements?: string;
}

export interface LabTeachingProfile {
  labType: string;
  specializations: string[];
  practicalExperienceYears: string;
  certifications?: string;
}

export interface AdminStaffProfile {
  department: string;
  experienceYears: string;
  skills: string[];
}

export interface TeachingProfile {
  facultyType: FacultyType;
  academic?: AcademicTeachingProfile;
  sports?: SportsTeachingProfile;
  lab?: LabTeachingProfile;
  administrative?: AdminStaffProfile;
}

export interface CandidateProfile {
  candidateId: string;
  photoDataUrl?: string;
  photoFileName?: string;
  resumeDataUrl?: string;
  resumeFileName?: string;
  headline: string;
  summary: string;
  experience: ExperienceEntry[];
  internships: InternshipEntry[];
  qualifications: QualificationEntry[];
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  profileLinks: ProfileLinkEntry[];
  skills: string[];
  softSkills: string[];
  subjects: string[];
  languageSkills: LanguageEntry[];
  address: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  expectedSalary: string;
  availability: string;
  currentEmployer: string;
  employmentStatus: EmploymentStatus;
  teaching: TeachingProfile;
  updatedAt: string;
}

export interface JobApplicationExtras {
  coverLetter?: boolean;
  portfolioUrl?: boolean;
  demoVideo?: boolean;
  expectedSalary?: boolean;
  customQuestions?: { id: string; label: string; required?: boolean }[];
}

export interface JobPosting {
  id: string;
  instituteId: string;
  instituteName: string;
  city: string;
  state: string;
  title: string;
  department: string;
  category: JobCategory;
  facultyType: FacultyType;
  employmentType: EmploymentType;
  workMode: WorkMode;
  experienceRequired: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisplay?: string;
  postedAt: string;
  deadline: string;
  overview: string;
  /** Full job description — separate from short overview shown on cards */
  description?: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  benefits: string[];
  location: string;
  imageGradient: string;
  featured?: boolean;
  trending?: boolean;
  applicationExtras?: JobApplicationExtras;
  /** Set when posted via recruiter workspace */
  postedByRecruiterId?: string;
  recruiterJobStatus?: RecruiterJobStatus;
}

export interface InstituteCareerProfile {
  instituteId: string;
  name: string;
  type: InstituteType;
  city: string;
  state: string;
  logoInitials: string;
  logoGradient: string;
  tagline: string;
  about: string;
  principalName: string;
  principalMessage: string;
  culture: string[];
  mission: string;
  vision: string;
  benefits: string[];
  facilities: string[];
  achievements: string[];
  gallery: { id: string; title: string; gradient: string }[];
  contact: { phone: string; email: string; address: string; hours: string };
  featured?: boolean;
  openRolesCount?: number;
}

export interface ApplicationDocument {
  id: string;
  type: CareerDocumentType;
  label: string;
  fileName?: string;
  status: DocumentVerificationStatus;
  uploadedAt?: string;
  note?: string;
}

export interface InterviewDetails {
  date: string;
  time: string;
  mode: InterviewMode;
  location: string;
  instructions: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface DemoClassDetails {
  scheduledAt?: string;
  videoFileName?: string;
  evaluationStatus: DemoClassEvaluationStatus;
  feedback?: string;
  evaluatorNote?: string;
}

export interface TimelineEvent {
  id: string;
  status: ApplicationStatus;
  label: string;
  at: string;
  note?: string;
}

export interface PersonalInfo {
  name: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  photoDataUrl?: string;
}

export interface AddressInfo {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface ProfessionalInfo {
  highestQualification: string;
  experienceYears: string;
  currentEmployer: string;
  currentRole: string;
  expectedSalary: string;
  noticePeriod: string;
  employmentStatus?: EmploymentStatus;
}

export interface SkillsInfo {
  teachingSubjects: string;
  sportsSpecialization: string;
  labSpecialization: string;
  technicalSkills: string;
  languagesKnown: string;
  grades?: string;
  boards?: string;
}

export interface JobApplication {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  instituteName: string;
  instituteId?: string;
  status: ApplicationStatus;
  submittedAt?: string;
  updatedAt: string;
  personal: PersonalInfo;
  address: AddressInfo;
  professional: ProfessionalInfo;
  skills: SkillsInfo;
  documents: ApplicationDocument[];
  timeline: TimelineEvent[];
  interview?: InterviewDetails;
  demoClass?: DemoClassDetails;
  hrNotes?: string[];
}

export interface ApplicationDraft {
  step: number;
  jobId?: string;
  personal: Partial<PersonalInfo>;
  address: Partial<AddressInfo>;
  professional: Partial<ProfessionalInfo>;
  skills: Partial<SkillsInfo>;
  documents: Partial<Record<CareerDocumentType, { fileName: string }>>;
  extras?: Record<string, string>;
  coverLetter?: string;
}

export type CareersNotificationType =
  | "application"
  | "interview"
  | "selection"
  | "document"
  | "general"
  | "shortlisted"
  | "demo_class"
  | "offer"
  | "profile_viewed"
  | "job_alert";

export interface CareersNotification {
  id: string;
  candidateId: string;
  applicationId?: string;
  title: string;
  body: string;
  type: CareersNotificationType;
  read: boolean;
  createdAt: string;
}

export interface FaqItem {
  id: string;
  category:
    | "jobs"
    | "applications"
    | "interviews"
    | "documents"
    | "process"
    | "benefits"
    | "employment";
  question: string;
  answer: string;
}

export interface TalentPoolEntry {
  candidateId: string;
  instituteId: string;
  instituteName: string;
  facultyType: FacultyType;
  addedAt: string;
  reason: "rejected" | "manual" | "future_opportunity";
  note?: string;
}

export type ContactInquiryCategory =
  | "applications"
  | "interviews"
  | "documents"
  | "hiring_process"
  | "employment"
  | "benefits"
  | "institute"
  | "portal"
  | "general";

export type ContactInquiryStatus = "open" | "answered" | "closed";

export interface ContactInquiryResponse {
  id: string;
  from: string;
  body: string;
  at: string;
}

export interface ContactInquiry {
  id: string;
  candidateId?: string;
  name: string;
  email: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
  applicationId?: string;
  instituteId?: string;
  instituteName?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
  status: ContactInquiryStatus;
  responses: ContactInquiryResponse[];
}

export type CareersThemeMode = "light" | "dark" | "system";
