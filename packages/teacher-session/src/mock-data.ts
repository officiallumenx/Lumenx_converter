import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import { parseTeacherPortalAccess } from "./portal-access";
import type {
  TeacherAssignment,
  TeacherAssignmentType,
  TeacherPortalAccessLevel,
} from "./types";

/**
 * Mock assignment lookup — no backend.
 * Demo teacher (T-1042) defaults to dual_role so the existing Subject Teacher
 * portal remains the default login experience until Settings role switch is built.
 */
const ASSIGNMENT_BY_TEACHER_ID: Record<string, TeacherAssignmentType> = {
  "T-1042": "dual_role",
};

const PORTAL_ACCESS_BY_TEACHER_ID: Record<string, TeacherPortalAccessLevel> = {
  "T-1042": "faculty_grading",
};

const DEFAULT_ASSIGNMENT: TeacherAssignmentType = "dual_role";
const DEFAULT_PORTAL_ACCESS: TeacherPortalAccessLevel = "faculty_grading";

/** Same key Admin Teachers page persists to (same-origin demo bridge). */
export const ADMIN_TEACHERS_STORAGE_KEY = ADMIN_STORAGE_KEYS.teachers;

/** Optional Connect-side overrides for local demos: { "T-1042": "read_only" }. */
export const TEACHER_PORTAL_ACCESS_OVERRIDES_KEY = "lumenx.teacher.portal-access.overrides";

type AdminTeacherRow = {
  id?: string;
  email?: string;
  phone?: string;
  portalAccess?: string;
  role?: string;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function portalAccessFromAdmin(teacherId: string): TeacherPortalAccessLevel | null {
  const rows = readJson<AdminTeacherRow[]>(ADMIN_TEACHERS_STORAGE_KEY);
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const byId = rows.find((row) => row.id === teacherId);
  if (byId) return parseTeacherPortalAccess(byId.portalAccess);

  return null;
}

function portalAccessFromOverrides(teacherId: string): TeacherPortalAccessLevel | null {
  const map = readJson<Record<string, string>>(TEACHER_PORTAL_ACCESS_OVERRIDES_KEY);
  if (!map || typeof map !== "object") return null;
  return parseTeacherPortalAccess(map[teacherId]);
}

/**
 * Resolve Admin portal access for a teacher id, with optional email/phone hints
 * when ids differ between Admin and Connect demo profiles.
 */
export function resolveTeacherPortalAccess(
  teacherId: string,
  hints?: { email?: string; phone?: string },
): TeacherPortalAccessLevel {
  const override = portalAccessFromOverrides(teacherId);
  if (override) return override;

  const fromAdminId = portalAccessFromAdmin(teacherId);
  if (fromAdminId) return fromAdminId;

  const rows = readJson<AdminTeacherRow[]>(ADMIN_TEACHERS_STORAGE_KEY);
  if (Array.isArray(rows) && rows.length > 0) {
    const email = hints?.email?.trim().toLowerCase();
    if (email) {
      const byEmail = rows.find((row) => row.email?.trim().toLowerCase() === email);
      const parsed = parseTeacherPortalAccess(byEmail?.portalAccess);
      if (parsed) return parsed;
    }
    const phoneDigits = hints?.phone ? digitsOnly(hints.phone) : "";
    if (phoneDigits.length >= 10) {
      const byPhone = rows.find((row) => {
        if (!row.phone) return false;
        const rowDigits = digitsOnly(row.phone);
        return (
          rowDigits === phoneDigits ||
          rowDigits.endsWith(phoneDigits.slice(-10)) ||
          phoneDigits.endsWith(rowDigits.slice(-10))
        );
      });
      const parsed = parseTeacherPortalAccess(byPhone?.portalAccess);
      if (parsed) return parsed;
    }
  }

  return PORTAL_ACCESS_BY_TEACHER_ID[teacherId] ?? DEFAULT_PORTAL_ACCESS;
}

export function mockTeacherAssignment(
  teacherId: string,
  hints?: { email?: string; phone?: string },
): TeacherAssignment {
  return {
    teacherId,
    assignmentType: ASSIGNMENT_BY_TEACHER_ID[teacherId] ?? DEFAULT_ASSIGNMENT,
    portalAccess: resolveTeacherPortalAccess(teacherId, hints),
  };
}
