/**
 * Shared enquiry validation for homepage forms.
 * Used by the browser client and mirrored by Cloudflare Pages Functions.
 */

export const ENQUIRY_INBOX = "lumenxtech.official@gmail.com";

export const ENQUIRY_TYPES = ["question", "demo", "custom_application"];

export const INSTITUTE_TYPES = [
  "School",
  "College",
  "Coaching/Training Institute",
  "Other",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Indian mobiles (+91 optional) and general phone numbers with 8–15 digits. */
const PHONE_RE = /^(?:\+?91[\s-]?)?[6-9]\d{9}$|^(?:\+?\d[\d\s-]{7,16}\d)$/;

export function clip(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function isValidEmail(value) {
  return EMAIL_RE.test(clip(value, 254));
}

export function isValidPhone(value) {
  const cleaned = clip(value, 40).replace(/[()\s]/g, " ").trim();
  if (!cleaned) return false;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  return PHONE_RE.test(cleaned) || (digits.length >= 10 && digits.length <= 15);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, data: object } | { ok: false, errors: Record<string,string> }}
 */
export function validateEnquiry(raw) {
  const errors = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: { form: "Invalid submission." } };
  }
  const body = /** @type {Record<string, unknown>} */ (raw);
  const type = clip(body.type, 40);
  if (!ENQUIRY_TYPES.includes(type)) {
    errors.type = "Choose a valid enquiry type.";
  }

  const name = clip(body.name, 120);
  if (!name) errors.name = "Name is required.";

  const email = clip(body.email, 254);
  if (!email) errors.email = "Email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const description = String(body.description ?? "").trim().slice(0, 4000);
  if (!description) errors.description = "Description is required.";
  else if (description.length < 8) errors.description = "Please add a little more detail.";

  // Honeypot
  const honey = clip(body.companyWebsite ?? body.company_website, 200);
  if (honey) {
    return {
      ok: true,
      data: { honeypot: true, type: type || "question", submittedAt: new Date().toISOString() },
    };
  }

  let mobile = "";
  let phone = "";
  let instituteName = "";
  let instituteType = "";
  let instituteTypeOther = "";

  if (type === "question") {
    mobile = clip(body.mobile, 40);
    if (!mobile) errors.mobile = "Mobile number is required.";
    else if (!isValidPhone(mobile)) errors.mobile = "Enter a valid mobile number.";
  }

  if (type === "demo") {
    instituteName = clip(body.instituteName ?? body.institute, 160);
    if (!instituteName) errors.instituteName = "Institute name is required.";
    mobile = clip(body.mobile, 40);
    phone = clip(body.phone, 40);
    if (!mobile) errors.mobile = "Mobile number is required.";
    else if (!isValidPhone(mobile)) errors.mobile = "Enter a valid mobile number.";
    if (!phone) errors.phone = "Phone number is required.";
    else if (!isValidPhone(phone)) errors.phone = "Enter a valid phone number.";
  }

  if (type === "custom_application") {
    instituteName = clip(body.instituteName ?? body.institute, 160);
    if (!instituteName) errors.instituteName = "Institute name is required.";
    instituteType = clip(body.instituteType, 80);
    if (!INSTITUTE_TYPES.includes(instituteType)) {
      errors.instituteType = "Select a type of institute.";
    }
    instituteTypeOther = clip(body.instituteTypeOther, 160);
    if (instituteType === "Other" && !instituteTypeOther) {
      errors.instituteTypeOther = "Please describe your institute type.";
    }
    phone = clip(body.phone, 40);
    if (!phone) errors.phone = "Phone number is required.";
    else if (!isValidPhone(phone)) errors.phone = "Enter a valid phone number.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      type,
      name,
      email,
      description,
      mobile,
      phone,
      instituteName,
      instituteType,
      instituteTypeOther,
      submittedAt: new Date().toISOString(),
    },
  };
}

export function enquirySubject(data) {
  const labels = {
    question: "Ask a Question",
    demo: "Book a Demo",
    custom_application: "Custom Application",
  };
  const label = labels[data.type] || "Enquiry";
  const institute = data.instituteName ? ` · ${data.instituteName}` : "";
  return `[LumenX] ${label}${institute}`;
}

export function enquiryMessageText(data) {
  const lines = [
    `Type: ${data.type}`,
    `Submitted: ${data.submittedAt}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.mobile ? `Mobile: ${data.mobile}` : null,
    data.phone ? `Phone: ${data.phone}` : null,
    data.instituteName ? `Institute: ${data.instituteName}` : null,
    data.instituteType
      ? `Institute type: ${data.instituteType}${
          data.instituteTypeOther ? ` (${data.instituteTypeOther})` : ""
        }`
      : null,
    "",
    "Description:",
    data.description,
  ].filter((line) => line !== null);
  return lines.join("\n");
}
