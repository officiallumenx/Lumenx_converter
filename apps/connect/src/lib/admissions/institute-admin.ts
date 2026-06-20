import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type {
  AdmissionApplication,
  AdmissionFormField,
  ApplicationStatus,
  InstituteAdmissionForm,
  InstituteSettingsOverride,
  TimelineEvent,
} from "./types";
import type { AdmissionInstituteProfile } from "./institutes-data";
import { getInstituteById } from "./institutes-data";
import { statusLabel } from "./mock-data";

const storage = createBrowserAuthStorage();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

const DEFAULT_FORM_FIELDS: AdmissionFormField[] = [
  {
    id: "cf-sibling",
    label: "Sibling studying at this institute?",
    type: "select",
    required: false,
    options: ["Yes", "No"],
  },
  {
    id: "cf-transport",
    label: "Require school transport",
    type: "select",
    required: true,
    options: ["Yes", "No", "Maybe"],
  },
  {
    id: "cf-medical",
    label: "Medical conditions or allergies",
    type: "textarea",
    required: false,
    placeholder: "List any conditions we should know about",
  },
];

function getSettingsStore(): InstituteSettingsOverride[] {
  return readJson<InstituteSettingsOverride[]>(ADMISSIONS_STORAGE_KEYS.instituteSettings, []);
}

function saveSettingsStore(items: InstituteSettingsOverride[]) {
  writeJson(ADMISSIONS_STORAGE_KEYS.instituteSettings, items);
}

function getFormsStore(): InstituteAdmissionForm[] {
  return readJson<InstituteAdmissionForm[]>(ADMISSIONS_STORAGE_KEYS.admissionForms, []);
}

function saveFormsStore(items: InstituteAdmissionForm[]) {
  writeJson(ADMISSIONS_STORAGE_KEYS.admissionForms, items);
}

export function getInstituteSettingsOverride(instituteId: string): InstituteSettingsOverride | null {
  return getSettingsStore().find((s) => s.instituteId === instituteId) ?? null;
}

export function saveInstituteSettingsOverride(
  instituteId: string,
  patch: Omit<InstituteSettingsOverride, "instituteId" | "updatedAt">,
): InstituteSettingsOverride {
  const all = getSettingsStore();
  const existing = all.find((s) => s.instituteId === instituteId);
  const next: InstituteSettingsOverride = {
    instituteId,
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveSettingsStore([...all.filter((s) => s.instituteId !== instituteId), next]);
  return next;
}

/** Returns institute profile including admin-edited overrides. */
export function getInstituteProfileForAdmin(
  instituteId: string,
  instituteName?: string,
): AdmissionInstituteProfile | undefined {
  const base = getInstituteById(instituteId);
  if (base) return base;
  if (!instituteId) return undefined;
  const override = getInstituteSettingsOverride(instituteId);
  return {
    id: instituteId,
    name: instituteName ?? "Your institute",
    code: "CUSTOM",
    kind: "school",
    city: "",
    state: "",
    country: "India",
    tagline: override?.tagline ?? "",
    heroStat: "",
    rating: 0,
    programsCount: 0,
    seatsOpen: 0,
    imageGradient: "from-primary/20 to-muted",
    highlights: [],
    achievements: [],
    facilities: [],
    contact: {
      phone: override?.contact?.phone ?? "",
      email: override?.contact?.email ?? "",
      address: override?.contact?.address ?? "",
    },
    admissionDates: override?.admissionDates ?? [],
    about: override?.about ?? "",
    established: "",
    accreditation: "",
  };
}

export function formFieldTypeLabel(type: AdmissionFormField["type"]): string {
  return FORM_FIELD_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, " ");
}

export const FORM_FIELD_TYPES: { value: AdmissionFormField["type"]; label: string; hint?: string }[] = [
  { value: "text", label: "Short text", hint: "Single-line text answer" },
  { value: "textarea", label: "Long text", hint: "Multi-line paragraph" },
  { value: "number", label: "Number", hint: "Numeric values only" },
  { value: "phone", label: "Phone number", hint: "10-digit mobile with validation" },
  { value: "email", label: "Email address", hint: "Valid email format" },
  { value: "date", label: "Date", hint: "Calendar date picker" },
  { value: "select", label: "Dropdown", hint: "Choose one option from a list" },
  { value: "file_pdf", label: "File upload (PDF)", hint: "PDF documents only" },
  { value: "file_image", label: "File upload (Image)", hint: "JPG, PNG, WebP photos" },
  { value: "file_document", label: "File upload (Document)", hint: "PDF or Word documents" },
  { value: "file_any", label: "File upload (Any)", hint: "PDF, images, or documents" },
];

function normalizeFormField(field: AdmissionFormField): AdmissionFormField {
  if (field.type === "file" || (field.type as string) === "file") {
    const accept = field.fileAccept ?? "any";
    const mapped =
      accept === "pdf" ? "file_pdf" : accept === "image" ? "file_image" : accept === "document" ? "file_document" : "file_any";
    return { ...field, type: mapped as AdmissionFormField["type"] };
  }
  return field;
}

export function getAdmissionForm(instituteId: string): InstituteAdmissionForm {
  const stored = getFormsStore().find((f) => f.instituteId === instituteId);
  if (stored) {
    return { ...stored, fields: stored.fields.map(normalizeFormField) };
  }
  return {
    instituteId,
    fields: DEFAULT_FORM_FIELDS.map((f) => ({ ...f })),
    updatedAt: new Date().toISOString(),
  };
}

export function saveAdmissionForm(instituteId: string, fields: AdmissionFormField[]): InstituteAdmissionForm {
  const form: InstituteAdmissionForm = {
    instituteId,
    fields,
    updatedAt: new Date().toISOString(),
  };
  const all = getFormsStore();
  saveFormsStore([...all.filter((f) => f.instituteId !== instituteId), form]);
  return form;
}

export function getApplicationsForInstitute(
  instituteId: string,
  apps: AdmissionApplication[],
): AdmissionApplication[] {
  return apps
    .filter((a) => {
      const id = a.instituteId ?? "ins-lumenx-academy";
      return id === instituteId && a.status !== "draft";
    })
    .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));
}

export function getInstituteApplicationStats(instituteId: string, apps: AdmissionApplication[]) {
  const list = getApplicationsForInstitute(instituteId, apps);
  const pending = list.filter((a) =>
    ["submitted", "under_review", "document_verification", "interview_scheduled"].includes(a.status),
  ).length;
  return {
    total: list.length,
    pending,
    approved: list.filter((a) => a.status === "approved").length,
    rejected: list.filter((a) => a.status === "rejected").length,
    waitlisted: list.filter((a) => a.status === "waitlisted").length,
  };
}

export function updateApplicationByInstituteAdmin(
  applicationId: string,
  apps: AdmissionApplication[],
  patch: {
    status?: ApplicationStatus;
    adminNotes?: string[];
    requiredActions?: string[];
  },
): AdmissionApplication | null {
  const app = apps.find((a) => a.id === applicationId);
  if (!app) return null;

  const timeline = [...app.timeline];
  if (patch.status && patch.status !== app.status) {
    const event: TimelineEvent = {
      id: `t-${Date.now()}`,
      status: patch.status,
      label: `Status updated to ${statusLabel(patch.status)}`,
      at: new Date().toISOString(),
      note: "Updated by institute admin",
    };
    timeline.push(event);
  }

  return {
    ...app,
    ...patch,
    timeline,
    updatedAt: new Date().toISOString(),
  };
}

export function newFormFieldId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

