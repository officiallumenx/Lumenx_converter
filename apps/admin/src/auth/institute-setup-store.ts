/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Institute Profile Setup Store
 *  Draft persistence + completion state (localStorage).
 *  Replace with API calls in production.
 * ───────────────────────────────────────────────────────────── */

import type { DemoInstituteProfile } from "@lumenx/types";
import { loadOtpPending } from "./otp-service";
import { isValidEmail, isValidPhone } from "./validation";

export const SETUP_DRAFT_KEY             = "lx_institute_setup_draft_v1";
export const SETUP_COMPLETE_KEY          = "lx_institute_setup_complete_v1";
export const REGISTRATION_SUBMITTED_KEY  = "lx_registration_submitted_v1";
export const SUBMITTED_REGISTRATION_KEY  = "lx_submitted_registration_v1";

export const INSTITUTE_TYPES = [
  "School (K-12)",
  "Junior College",
  "Degree College",
  "University",
  "Coaching Institute",
  "Vocational Training",
  "Montessori / Pre-school",
] as const;

export const EDUCATION_BOARDS = [
  "CBSE",
  "ICSE / ISC",
  "State Board",
  "IB (International Baccalaureate)",
  "Cambridge (IGCSE)",
  "NIOS",
  "Other",
] as const;

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "UAE",
  "Singapore",
  "Others",
] as const;

export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Delhi", "Jammu & Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const PRINCIPAL_DESIGNATIONS = [
  "Principal",
  "Vice Principal",
  "Director",
  "Dean",
  "Head of Institution",
  "Administrator",
] as const;

export const SETUP_STEP_META = [
  { label: "Institute Profile", short: "Profile" },
  { label: "Location", short: "Location" },
  { label: "Principal Details", short: "Principal" },
  { label: "Review & Submit", short: "Review" },
] as const;

export const TOTAL_SETUP_STEPS = SETUP_STEP_META.length;
export const REVIEW_STEP = TOTAL_SETUP_STEPS;

// ── Form model ────────────────────────────────────────────────

export interface InstituteSetupForm {
  instituteName: string;
  logoPreview: string;
  instituteType: string;
  educationBoard: string;
  country: string;
  state: string;
  district: string;
  city: string;
  address: string;
  pincode: string;
  website: string;
  principalName: string;
  principalEmail: string;
  principalMobile: string;
  principalDesignation: string;
  employeeId: string;
}

export interface InstituteSetupDraft {
  form: InstituteSetupForm;
  currentStep: number;
  lastSavedAt: string | null;
}

export interface SubmittedRegistration {
  form: InstituteSetupForm;
  submittedAt: string;
  referenceId: string;
}

export type SetupFormErrors = Partial<Record<keyof InstituteSetupForm, string>>;

// ── Mock preset (demo / quick-fill) ───────────────────────────

export const MOCK_SETUP_PRESET: InstituteSetupForm = {
  instituteName:        "Test1School",
  logoPreview:          "",
  instituteType:        "School (K-12)",
  educationBoard:       "CBSE",
  country:              "India",
  state:                "Karnataka",
  district:             "Bengaluru Urban",
  city:                 "Bengaluru",
  address:              "12 Knowledge Park, Sector 4, HSR Layout",
  pincode:              "560102",
  website:              "https://www.lumenx-international.edu",
  principalName:        "Dr. Ananya Verma",
  principalEmail:       "principal@lumenx.edu",
  principalMobile:      "+91 98765 43210",
  principalDesignation: "Principal",
  employeeId:           "LX-EMP-001",
};

export function createEmptySetupForm(): InstituteSetupForm {
  const otp = loadOtpPending();
  return {
    instituteName:        "",
    logoPreview:          "",
    instituteType:        "",
    educationBoard:       "",
    country:              "India",
    state:                "",
    district:             "",
    city:                 "",
    address:              "",
    pincode:              "",
    website:              "",
    principalName:        "",
    principalEmail:       otp?.email ?? "",
    principalMobile:      otp?.mobile ?? "",
    principalDesignation: "Principal",
    employeeId:           "",
  };
}

// ── Validation ────────────────────────────────────────────────

export function validateSetupStep1(form: InstituteSetupForm): SetupFormErrors {
  const e: SetupFormErrors = {};
  if (!form.instituteName.trim()) e.instituteName = "Institute name is required";
  else if (form.instituteName.trim().length < 3) e.instituteName = "Must be at least 3 characters";
  if (!form.instituteType) e.instituteType = "Please select institute type";
  if (!form.educationBoard) e.educationBoard = "Please select education board";
  return e;
}

export function validateSetupStep2(form: InstituteSetupForm): SetupFormErrors {
  const e: SetupFormErrors = {};
  if (!form.country) e.country = "Country is required";
  if (!form.state.trim()) e.state = "State is required";
  if (!form.district.trim()) e.district = "District is required";
  if (!form.city.trim()) e.city = "City is required";
  if (!form.address.trim()) e.address = "Address is required";
  else if (form.address.trim().length < 10) e.address = "Enter a complete address (min 10 characters)";
  if (!form.pincode.trim()) e.pincode = "Pincode is required";
  else if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
  if (form.website.trim() && !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/.test(form.website.trim())) {
    e.website = "Enter a valid website URL";
  }
  return e;
}

export function validateSetupStep3(form: InstituteSetupForm): SetupFormErrors {
  const e: SetupFormErrors = {};
  if (!form.principalName.trim()) e.principalName = "Principal name is required";
  if (!form.principalEmail.trim()) e.principalEmail = "Email is required";
  else if (!isValidEmail(form.principalEmail)) e.principalEmail = "Enter a valid email address";
  if (!form.principalMobile.trim()) e.principalMobile = "Mobile number is required";
  else if (!isValidPhone(form.principalMobile)) e.principalMobile = "Enter a valid Indian mobile number";
  if (!form.principalDesignation) e.principalDesignation = "Please select designation";
  return e;
}

export function validateSetupStep(step: number, form: InstituteSetupForm): SetupFormErrors {
  if (step === 1) return validateSetupStep1(form);
  if (step === 2) return validateSetupStep2(form);
  if (step === 3) return validateSetupStep3(form);
  if (step === REVIEW_STEP) {
    return {
      ...validateSetupStep1(form),
      ...validateSetupStep2(form),
      ...validateSetupStep3(form),
    };
  }
  return {};
}

export function hasSetupErrors(errors: SetupFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// ── Draft persistence ─────────────────────────────────────────

export function loadSetupDraft(): InstituteSetupDraft | null {
  try {
    const raw = localStorage.getItem(SETUP_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InstituteSetupDraft;
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: InstituteSetupDraft): InstituteSetupDraft {
  const saved: InstituteSetupDraft = {
    ...draft,
    lastSavedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(saved));
  } catch {
    // storage unavailable
  }
  return saved;
}

export function clearSetupDraft(): void {
  try {
    localStorage.removeItem(SETUP_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function isSetupComplete(): boolean {
  try {
    return localStorage.getItem(SETUP_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSetupComplete(): void {
  try {
    localStorage.setItem(SETUP_COMPLETE_KEY, "1");
    clearSetupDraft();
  } catch {
    // ignore
  }
}

export function isRegistrationSubmitted(): boolean {
  try {
    return localStorage.getItem(REGISTRATION_SUBMITTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function loadSubmittedRegistration(): SubmittedRegistration | null {
  try {
    const raw = localStorage.getItem(SUBMITTED_REGISTRATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SubmittedRegistration;
  } catch {
    return null;
  }
}

export function markRegistrationSubmitted(form: InstituteSetupForm): SubmittedRegistration {
  const submission: SubmittedRegistration = {
    form,
    submittedAt: new Date().toISOString(),
    referenceId: `LX-REG-${Date.now().toString(36).toUpperCase()}`,
  };
  try {
    localStorage.setItem(REGISTRATION_SUBMITTED_KEY, "1");
    localStorage.setItem(SUBMITTED_REGISTRATION_KEY, JSON.stringify(submission));
    clearSetupDraft();
  } catch {
    // storage unavailable
  }
  return submission;
}

export function formatSetupAddress(form: InstituteSetupForm): string {
  return [
    form.address.trim(),
    form.city.trim(),
    form.district.trim(),
    form.state.trim(),
    form.pincode.trim(),
    form.country.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

// ── Map form → DemoInstituteProfile ───────────────────────────

export function buildInstituteProfileFromSetup(
  form: InstituteSetupForm,
  existing: DemoInstituteProfile,
): DemoInstituteProfile {
  const fullAddress = formatSetupAddress(form);

  const registrationFields = [
    { id: "institute-type", label: "Institute Type", value: form.instituteType },
    { id: "education-board", label: "Education Board", value: form.educationBoard },
    { id: "website", label: "Website", value: form.website.trim() },
    { id: "country", label: "Country", value: form.country },
    { id: "state", label: "State", value: form.state },
    { id: "district", label: "District", value: form.district },
    { id: "city", label: "City", value: form.city },
    { id: "pincode", label: "Pincode", value: form.pincode },
    { id: "designation", label: "Designation", value: form.principalDesignation },
    { id: "employee-id", label: "Employee ID", value: form.employeeId.trim() },
  ].filter((f) => f.value);

  const otherSections = (existing.customFields ?? []).filter((s) => s.id !== "setup-registration");

  return {
    ...existing,
    name:      form.instituteName.trim(),
    logo:      form.logoPreview || existing.logo,
    principal: form.principalName.trim(),
    email:     form.principalEmail.trim().toLowerCase(),
    phone:     form.principalMobile.trim(),
    address:   fullAddress,
    customFields: [
      ...otherSections,
      {
        id: "setup-registration",
        title: "Registration Details",
        entries: [
          {
            id: "setup-registration-main",
            heading: "Onboarding profile",
            subheading: "Captured during institute profile setup",
            fields: registrationFields,
          },
        ],
      },
    ],
  };
}
