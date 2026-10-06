import { AppError } from "../../errors/app-error.js";
import type { InstituteRegistrationPayload } from "./types.js";
import { MAX_REGISTRATION_LOGO_DATA_URL_CHARS } from "./types.js";

/** Login-facing institute code: letters, digits, hyphen/underscore; 3–32 chars. */
export const INSTITUTE_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;
export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;
export const PINCODE_RE = /^\d{6}$/;
export const ALLOWED_ADMIN_DESIGNATIONS = new Set(["principal", "director"]);

export function normalizeInstituteCode(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function normalizeUsername(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function trimOrUndefined(value: string | undefined | null): string | undefined {
  const t = (value ?? "").trim();
  return t ? t : undefined;
}

function lowerOrUndefined(value: string | undefined | null): string | undefined {
  const t = (value ?? "").trim().toLowerCase();
  return t ? t : undefined;
}

function composeInstituteAddress(payload: InstituteRegistrationPayload): string | undefined {
  if (payload.address?.trim()) return payload.address.trim();
  const parts = [
    payload.street?.trim(),
    payload.area?.trim(),
    payload.landmark?.trim(),
    payload.city?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function normalizeRegistrationPayload(
  input: InstituteRegistrationPayload,
  fallbackEmail: string,
  fallbackName: string,
): InstituteRegistrationPayload {
  const instituteCode = normalizeInstituteCode(input.instituteCode);
  const designationRaw = trimOrUndefined(input.principalDesignation);
  const designation = designationRaw
    ? designationRaw.charAt(0).toUpperCase() + designationRaw.slice(1).toLowerCase()
    : undefined;

  const normalized: InstituteRegistrationPayload = {
    instituteName: input.instituteName.trim(),
    instituteCode: instituteCode || undefined,
    instituteType: trimOrUndefined(input.instituteType),
    educationBoard: trimOrUndefined(input.educationBoard),
    schoolPhone: trimOrUndefined(input.schoolPhone),
    schoolEmail: lowerOrUndefined(input.schoolEmail),
    country: trimOrUndefined(input.country),
    state: trimOrUndefined(input.state),
    district: trimOrUndefined(input.district),
    city: trimOrUndefined(input.city),
    area: trimOrUndefined(input.area),
    street: trimOrUndefined(input.street),
    landmark: trimOrUndefined(input.landmark),
    address: composeInstituteAddress(input),
    pincode: trimOrUndefined(input.pincode),
    website: trimOrUndefined(input.website),
    principalName: trimOrUndefined(input.principalName) || fallbackName.trim(),
    principalEmail: lowerOrUndefined(input.principalEmail) || fallbackEmail.trim().toLowerCase(),
    principalMobile: trimOrUndefined(input.principalMobile),
    principalDesignation: designation,
    username: normalizeUsername(input.username) || undefined,
    adminCountry: trimOrUndefined(input.adminCountry),
    adminState: trimOrUndefined(input.adminState),
    adminDistrict: trimOrUndefined(input.adminDistrict),
    adminCity: trimOrUndefined(input.adminCity),
    adminAddress: trimOrUndefined(input.adminAddress),
    adminPincode: trimOrUndefined(input.adminPincode),
    employeeId: trimOrUndefined(input.employeeId),
  };

  if (input.logoPreview !== undefined) {
    normalized.logoPreview = input.logoPreview.trim() || undefined;
  }

  return normalized;
}

/** Typed columns mirrored onto institute_registration for review/indexing. */
export function registrationRowFieldsFromPayload(
  payload: InstituteRegistrationPayload,
): Record<string, string | null> {
  return {
    institute_code: payload.instituteCode?.trim() || null,
    institute_type: payload.instituteType?.trim() || null,
    education_board: payload.educationBoard?.trim() || null,
    school_email: payload.schoolEmail?.trim().toLowerCase() || null,
    school_phone: payload.schoolPhone?.trim() || null,
    applicant_username: payload.username?.trim().toLowerCase() || null,
    admin_designation: payload.principalDesignation?.trim() || null,
    country: payload.country?.trim() || null,
    state: payload.state?.trim() || null,
    district: payload.district?.trim() || null,
    city: payload.city?.trim() || null,
    area: payload.area?.trim() || null,
    street: payload.street?.trim() || null,
    landmark: payload.landmark?.trim() || null,
    pincode: payload.pincode?.trim() || null,
    website: payload.website?.trim() || null,
  };
}

function requireField(
  value: string | undefined,
  path: string,
  message: string,
): void {
  if (!value?.trim()) {
    throw AppError.validation(message, { [path]: ["Required"] });
  }
}

/**
 * Validates the Admin 4-step registration application.
 * Strict on create; logo size always enforced when present.
 */
export function validateRegistrationApplication(input: {
  applicantName?: string;
  payload: InstituteRegistrationPayload;
  requireApplicantName?: boolean;
  requirePassword?: boolean;
  password?: string;
  requireFullApplication?: boolean;
}): void {
  const payload = input.payload;
  requireField(payload.instituteName, "payload.instituteName", "Institute name is required");

  const instituteCode = normalizeInstituteCode(payload.instituteCode);
  requireField(instituteCode, "payload.instituteCode", "Institute code is required");
  if (!INSTITUTE_CODE_RE.test(instituteCode)) {
    throw AppError.validation(
      "Institute code must be 3–32 characters (letters, numbers, - or _)",
      { "payload.instituteCode": ["Invalid format"] },
    );
  }

  if (input.requireApplicantName) {
    requireField(input.applicantName, "applicant_name", "Applicant name is required");
  }
  if (input.requirePassword) {
    if (!input.password || input.password.length < 8) {
      throw AppError.validation("password must be at least 8 characters", {
        password: ["Too short"],
      });
    }
  }

  const logo = payload.logoPreview;
  if (logo && logo.length > MAX_REGISTRATION_LOGO_DATA_URL_CHARS) {
    throw AppError.validation("payload.logoPreview is too large", {
      "payload.logoPreview": ["Too large"],
    });
  }

  if (!input.requireFullApplication) return;

  requireField(payload.instituteType, "payload.instituteType", "Institute type is required");
  requireField(payload.educationBoard, "payload.educationBoard", "Education board is required");
  requireField(payload.schoolPhone, "payload.schoolPhone", "School number is required");
  requireField(payload.schoolEmail, "payload.schoolEmail", "School email is required");
  if (payload.schoolEmail && !payload.schoolEmail.includes("@")) {
    throw AppError.validation("School email is invalid", {
      "payload.schoolEmail": ["Invalid email"],
    });
  }

  requireField(payload.country, "payload.country", "Country is required");
  requireField(payload.state, "payload.state", "State is required");
  requireField(payload.district, "payload.district", "District is required");
  requireField(payload.city, "payload.city", "City is required");
  requireField(payload.area, "payload.area", "Area is required");
  requireField(payload.street, "payload.street", "Street is required");
  requireField(payload.pincode, "payload.pincode", "Pin code is required");
  if (payload.pincode && !PINCODE_RE.test(payload.pincode)) {
    throw AppError.validation("Pin code must be 6 digits", {
      "payload.pincode": ["Invalid format"],
    });
  }

  requireField(payload.principalName, "payload.principalName", "Admin name is required");
  requireField(payload.principalEmail, "payload.principalEmail", "Admin email is required");
  requireField(payload.principalMobile, "payload.principalMobile", "Admin mobile is required");
  requireField(
    payload.principalDesignation,
    "payload.principalDesignation",
    "Admin role is required",
  );
  if (
    payload.principalDesignation &&
    !ALLOWED_ADMIN_DESIGNATIONS.has(payload.principalDesignation.trim().toLowerCase())
  ) {
    throw AppError.validation("Admin role must be Principal or Director", {
      "payload.principalDesignation": ["Invalid"],
    });
  }

  const username = normalizeUsername(payload.username);
  requireField(username, "payload.username", "Username is required");
  if (!USERNAME_RE.test(username)) {
    throw AppError.validation(
      "Username must be 3–64 characters (letters, numbers, . _ -)",
      { "payload.username": ["Invalid format"] },
    );
  }

  requireField(payload.adminCountry, "payload.adminCountry", "Admin country is required");
  requireField(payload.adminState, "payload.adminState", "Admin state is required");
  requireField(payload.adminDistrict, "payload.adminDistrict", "Admin district is required");
  requireField(payload.adminCity, "payload.adminCity", "Admin city is required");
  requireField(payload.adminAddress, "payload.adminAddress", "Admin address is required");
  requireField(payload.adminPincode, "payload.adminPincode", "Admin pin code is required");
  if (payload.adminPincode && !PINCODE_RE.test(payload.adminPincode)) {
    throw AppError.validation("Admin pin code must be 6 digits", {
      "payload.adminPincode": ["Invalid format"],
    });
  }
}
