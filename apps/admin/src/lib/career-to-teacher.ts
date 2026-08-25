import type { AdminCareerDetail } from "@/lib/careers-application-details";
import type { AdminCareerSyncRow } from "@/lib/careers-sync";
import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import type { TeacherRecord, TeacherRole } from "@lumenx/types";
import { normalizePhoneLast10 } from "@lumenx/utils";
import { readAdminDataScopeKey } from "@/lib/admin-tenant";

export type { TeacherRole };
export type StoredTeacher = TeacherRecord;

export type CareerConvertDraft = {
  name: string;
  role: TeacherRole;
  dept: string;
  email: string;
  phone: string;
  password: string;
  employeeId: string;
  qualification: string;
  dateOfBirth: string;
  createConnectAccount: boolean;
};

const TEACHERS_STORAGE_KEY_BASE = ADMIN_STORAGE_KEYS.teachers;
export const TEACHERS_CHANGED_EVENT = "lumenx-teachers-changed";

function teachersStorageKey(): string {
  return `${TEACHERS_STORAGE_KEY_BASE}.${readAdminDataScopeKey()}`;
}

function normalizePhone(value: string): string {
  return normalizePhoneLast10(value);
}

function inferDept(jobTitle: string): string {
  const t = jobTitle.toLowerCase();
  if (t.includes("math")) return "Mathematics";
  if (t.includes("physics")) return "Physics";
  if (t.includes("chem")) return "Chemistry";
  if (t.includes("bio")) return "Biology";
  if (t.includes("english") || t.includes("literature")) return "English";
  if (t.includes("sport") || t.includes("coach") || t.includes("pe")) return "Sports";
  if (t.includes("lab")) return "Science";
  if (t.includes("office") || t.includes("admin")) return "Administration";
  return "General";
}

function inferRole(jobTitle: string): TeacherRole {
  const t = jobTitle.toLowerCase();
  if (t.includes("coach") || t.includes("sport") || t.includes("activity")) {
    return "activity-coordinator";
  }
  if (t.includes("office") || t.includes("admin") || t.includes("executive")) {
    return "activity-coordinator";
  }
  return "subject-teacher";
}

export function convertDraftFromCareer(
  row: AdminCareerSyncRow,
  detail: AdminCareerDetail | null,
): CareerConvertDraft {
  const name = detail?.personal.name ?? row.name;
  const phone = normalizePhone(detail?.personal.mobile ?? "");
  const email = detail?.personal.email?.trim().toLowerCase() ?? "";
  const jobTitle = detail?.jobTitle ?? row.role;

  return {
    name,
    role: inferRole(jobTitle),
    dept: inferDept(jobTitle),
    email,
    phone,
    password: "Teacher@123",
    employeeId: "",
    qualification: detail?.professional.highestQualification ?? "",
    dateOfBirth: detail?.personal.dateOfBirth ?? "",
    createConnectAccount: false,
  };
}

export function fillTeacherConnectFromCareer(
  draft: CareerConvertDraft,
  detail: AdminCareerDetail | null,
): CareerConvertDraft {
  const formPhone = normalizePhone(detail?.personal.mobile ?? draft.phone);
  const formEmail = detail?.personal.email?.trim().toLowerCase() ?? "";
  return {
    ...draft,
    createConnectAccount: true,
    phone: draft.phone || formPhone,
    email: draft.email.trim() || formEmail,
    password: draft.password || "Teacher@123",
  };
}

export function validateCareerConvertDraft(draft: CareerConvertDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Full name is required.");
  if (!draft.dept.trim()) errors.push("Department is required.");
  if (draft.createConnectAccount) {
    if (!/^\d{10}$/.test(draft.phone)) {
      errors.push("Mobile (10 digits) is required — teachers log in with phone.");
    }
    if (draft.password.length < 8) {
      errors.push("Connect password must contain at least 8 characters.");
    }
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.push("Enter a valid email address.");
    }
  } else if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.push("Enter a valid email address.");
  }
  return errors;
}

export function normalizeTeacherPhone(value: string): string {
  return normalizePhone(value);
}

export function loadTeacherDirectory(): StoredTeacher[] {
  try {
    const raw = localStorage.getItem(teachersStorageKey());
    if (!raw) return [];
    return JSON.parse(raw) as StoredTeacher[];
  } catch {
    return [];
  }
}

export function saveTeacherDirectory(rows: StoredTeacher[]): void {
  try {
    localStorage.setItem(teachersStorageKey(), JSON.stringify(rows));
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEACHERS_CHANGED_EVENT));
  }
}

export function subscribeTeacherDirectory(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === teachersStorageKey() || event.key === null) listener();
  };
  window.addEventListener(TEACHERS_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener(TEACHERS_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
  };
}

export function nextTeacherIds(existing: StoredTeacher[]): { id: string; employeeId: string } {
  const maxNum = existing.reduce((max, t) => {
    const n = Number(t.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const next = maxNum + 1 || 100;
  return {
    id: `T-${String(next).padStart(3, "0")}`,
    employeeId: `EMP-${1040 + next}`,
  };
}

export function teacherFromCareerDraft(draft: CareerConvertDraft): StoredTeacher {
  const existing = loadTeacherDirectory();
  const ids = nextTeacherIds(existing);
  const month = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
  return {
    id: ids.id,
    name: draft.name.trim(),
    role: draft.role,
    dept: draft.dept.trim(),
    email:
      draft.email.trim().toLowerCase() ||
      `${draft.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "teacher"}@institute.edu`,
    phone: draft.phone || "",
    password: draft.createConnectAccount ? draft.password : draft.password || "Teacher@123",
    employeeId: draft.employeeId.trim() || ids.employeeId,
    joined: month,
    classes: 0,
    assignedSections: [],
    status: draft.createConnectAccount ? "pending" : "active",
    subjects: [],
    portalAccess: draft.createConnectAccount ? "Faculty + Grading" : "Faculty only",
    qualification: draft.qualification.trim() || "—",
    lastLogin: "Never",
    credentialsSentAt: draft.createConnectAccount ? month : null,
    dateOfBirth: draft.dateOfBirth.trim() || undefined,
  };
}

export function appendTeacherFromCareer(draft: CareerConvertDraft): StoredTeacher {
  const existing = loadTeacherDirectory();
  const record = teacherFromCareerDraft(draft);
  // Avoid duplicate id collision if storage empty but INITIAL ids exist in Teachers page —
  // Teachers page merges INITIAL on load, so unique T-xxx from max is fine.
  const withoutDup = existing.filter((t) => t.id !== record.id);
  saveTeacherDirectory([...withoutDup, record]);
  return record;
}
