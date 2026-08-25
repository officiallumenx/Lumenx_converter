import type { Role } from "@lumenx/types";

/** Connect portal localStorage keys (legacy `ues_*` preserved for demo compatibility). */
export const CONNECT_STORAGE_KEYS = {
  user: "ues_user",
  role: "ues_role",
  institute: "ues_institute",
  theme: "ues_theme",
  child: "ues_child",
  studentIncluded: "ues_student_included",
} as const;

/** Public Admissions portal — separate from institute Connect session. */
export const ADMISSIONS_STORAGE_KEYS = {
  user: "ues_admissions_user",
  applications: "ues_admissions_applications",
  draft: "ues_admissions_draft",
  theme: "ues_admissions_theme",
  notifications: "ues_admissions_notifications",
  instituteSettings: "ues_admissions_institute_settings",
  admissionForms: "ues_admissions_admission_forms",
  admissionOpenings: "ues_admissions_openings",
  inquiries: "ues_admissions_inquiries",
  savedInstitutes: "ues_admissions_saved_institutes",
  savedPrograms: "ues_admissions_saved_programs",
  /** Institutes registered via Admissions signup (demo catalog extension) */
  customInstitutes: "ues_admissions_custom_institutes",
  /** Demo sync snapshot for Admin ↔ Connect admissions (same origin) */
  sync: "ues_admissions_sync",
} as const;

/** Public Careers portal — separate from institute Connect and Admissions sessions. */
export const CAREERS_STORAGE_KEYS = {
  user: "ues_careers_user",
  applications: "ues_careers_applications",
  draft: "ues_careers_draft",
  savedJobs: "ues_careers_saved_jobs",
  theme: "ues_careers_theme",
  notifications: "ues_careers_notifications",
  profiles: "ues_careers_profiles",
  followedInstitutes: "ues_careers_followed_institutes",
  savedInstitutes: "ues_careers_saved_institutes",
  talentPool: "ues_careers_talent_pool",
  contactInquiries: "ues_careers_contact_inquiries",
  /** Demo sync snapshot for Admin ↔ Connect careers (same origin) */
  sync: "ues_careers_sync",
} as const;

/** Admin/Nexus theme key (legacy). */
export const ADMIN_THEME_KEY = "luminexa-theme";

/** Staff roles for Admin / Nexus (target RBAC). */
export type StaffRole =
  | "nexus_root_admin"
  | "institute_admin"
  | "principal"
  | "sub_admin"
  | "teacher"
  | "accountant"
  | "driver";

export type AppId = "connect" | "admin" | "nexus" | "transport";

export interface SessionUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

/** Client-side session contract (demo → server-validated sessions in production). */
export interface Session {
  user: SessionUser;
  app: AppId;
  instituteId: string;
  branchId?: string;
  roles: Role[] | StaffRole[];
  expiresAt?: string;
}

export interface AuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

export function createBrowserAuthStorage(): AuthStorage {
  return {
    getItem: (key) => (typeof localStorage !== "undefined" ? localStorage.getItem(key) : null),
    setItem: (key, value) => {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    },
    removeItem: (key) => {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    },
    get length() {
      return typeof localStorage !== "undefined" ? localStorage.length : 0;
    },
    key: (index) => (typeof localStorage !== "undefined" ? localStorage.key(index) : null),
  };
}

export function readConnectRole(storage: AuthStorage): Role | null {
  const raw = storage.getItem(CONNECT_STORAGE_KEYS.role);
  if (raw === "parent" || raw === "teacher" || raw === "student") return raw;
  return null;
}

export function clearConnectSession(storage: AuthStorage): void {
  storage.removeItem(CONNECT_STORAGE_KEYS.user);
  storage.removeItem(CONNECT_STORAGE_KEYS.role);
  storage.removeItem(CONNECT_STORAGE_KEYS.institute);
}

/** Driver Transport app — separate from Connect session. */
export const TRANSPORT_STORAGE_KEYS = {
  session: "ues_transport_session",
} as const;

export function clearTransportSession(storage: AuthStorage): void {
  storage.removeItem(TRANSPORT_STORAGE_KEYS.session);
}

export const DEMO_CONNECT_PASSWORD = "unify123";
export const DEMO_CONNECT_OTP = "123456";
/** Demo OTP for driver Transport login (same as Connect demo). */
export const DEMO_TRANSPORT_OTP = DEMO_CONNECT_OTP;
