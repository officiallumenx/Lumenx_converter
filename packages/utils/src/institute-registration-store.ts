/**
 * Shared institute self-registration applications (Admin ↔ Nexus demo).
 * localStorage + custom event; same key for both apps.
 */

export const INSTITUTE_REGISTRATION_STORAGE_KEY =
  "lumenx.platform.instituteRegistrations.v1";
export const INSTITUTE_REGISTRATION_CHANGED_EVENT =
  "lumenx-institute-registrations-changed";

export type InstituteRegistrationStatus = "pending" | "approved" | "rejected";

export type InstituteRegistrationPayload = {
  instituteName: string;
  logoPreview?: string;
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
};

export type InstituteRegistrationApplication = {
  id: string;
  referenceId: string;
  status: InstituteRegistrationStatus;
  payload: InstituteRegistrationPayload;
  emailVerified: boolean;
  mobileVerified: boolean;
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvedInstituteId?: string;
};

type RegistrationState = {
  applications: InstituteRegistrationApplication[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function emptyState(): RegistrationState {
  return { applications: [] };
}

const COOKIE_NAME = "lumenx_platform_instituteRegistrations_v1";
/** Browsers typically reject cookies over ~4096 bytes; keep well under. */
const COOKIE_SAFE_BYTES = 3500;
/** Prefer pending apps, then newest overall — cookie cannot hold the full history. */
const COOKIE_MAX_APPLICATIONS = 6;

function truncateField(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Strip huge logos + cap rows so Admin ↔ Nexus cookie sync stays under browser limits.
 * Keeps compressed logo thumbs (≤ LOGO_COOKIE_MAX_CHARS) when space allows.
 *
 * Priority: newest approved (so Admin unlocks), then pending, then other — cookie
 * must not drop a just-approved row in favor of older pending demos.
 */
const LOGO_COOKIE_MAX_CHARS = 5500;

function slimForCookie(
  state: RegistrationState,
  maxApps: number = COOKIE_MAX_APPLICATIONS,
  includeLogos = true,
): RegistrationState {
  const approved = state.applications
    .filter((a) => a.status === "approved")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pending = state.applications
    .filter((a) => a.status === "pending")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const rest = state.applications
    .filter((a) => a.status !== "pending" && a.status !== "approved")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const picked = [...approved, ...pending, ...rest].slice(0, maxApps);
  return {
    applications: picked.map((a) => {
      const logo = a.payload.logoPreview?.trim();
      const keepLogo =
        includeLogos &&
        !!logo &&
        logo.startsWith("data:image/") &&
        logo.length <= LOGO_COOKIE_MAX_CHARS;
      return {
        ...a,
        payload: {
          ...a.payload,
          logoPreview: keepLogo ? logo : undefined,
          address: truncateField(a.payload.address ?? "", 80),
          website: truncateField(a.payload.website ?? "", 60),
          instituteName: truncateField(a.payload.instituteName ?? "", 80),
        },
        rejectionReason: a.rejectionReason
          ? truncateField(a.rejectionReason, 120)
          : undefined,
      };
    }),
  };
}

function readCookieState(): RegistrationState | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    const parsed = JSON.parse(raw) as RegistrationState;
    if (!Array.isArray(parsed.applications)) return null;
    return {
      applications: parsed.applications.filter(
        (a) => a && typeof a.id === "string" && a.payload && a.status,
      ),
    };
  } catch {
    return null;
  }
}

function writeCookieState(state: RegistrationState): boolean {
  if (typeof document === "undefined") return false;
  try {
    let maxApps = COOKIE_MAX_APPLICATIONS;
    let includeLogos = true;
    let slim = slimForCookie(state, maxApps, includeLogos);
    let value = encodeURIComponent(JSON.stringify(slim));
    // Shrink until under the safe limit.
    while (value.length > COOKIE_SAFE_BYTES && (maxApps > 1 || includeLogos)) {
      if (includeLogos) {
        includeLogos = false;
      } else {
        maxApps -= 1;
      }
      slim = slimForCookie(state, maxApps, includeLogos);
      value = encodeURIComponent(JSON.stringify(slim));
    }
    if (value.length > COOKIE_SAFE_BYTES) {
      const approved = state.applications
        .filter((a) => a.status === "approved")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const pending = state.applications
        .filter((a) => a.status === "pending")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const fallbackSrc = approved[0]
        ? { applications: [approved[0]] }
        : pending[0]
          ? { applications: [pending[0]] }
          : slimForCookie(state, 1, false);
      slim = slimForCookie(fallbackSrc, 1, false);
      value = encodeURIComponent(JSON.stringify(slim));
    }
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    const written = readCookieState();
    if (!written) return false;
    const mustHave = slim.applications.map((a) => a.id);
    return mustHave.every((id) => written.applications.some((a) => a.id === id));
  } catch {
    return false;
  }
}

/**
 * Merge localStorage + cookie so Admin (e.g. :3000) and Nexus (:3001) share
 * registration status on localhost during the demo.
 */
function mergeStates(primary: RegistrationState, secondary: RegistrationState | null): RegistrationState {
  if (!secondary?.applications.length) return primary;
  const byId = new Map<string, InstituteRegistrationApplication>();
  for (const a of secondary.applications) byId.set(a.id, a);
  for (const a of primary.applications) {
    const prev = byId.get(a.id);
    if (!prev || a.updatedAt >= prev.updatedAt) byId.set(a.id, a);
  }
  // Also merge by email when ids differ across origins
  const byEmail = new Map<string, InstituteRegistrationApplication>();
  for (const a of byId.values()) {
    const email = a.payload.principalEmail.trim().toLowerCase();
    const prev = byEmail.get(email);
    if (!prev || a.updatedAt >= prev.updatedAt) byEmail.set(email, a);
  }
  return {
    applications: [...byEmail.values()].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    ),
  };
}

function readState(): RegistrationState {
  let local = emptyState();
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(INSTITUTE_REGISTRATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RegistrationState;
        if (Array.isArray(parsed.applications)) {
          local = {
            applications: parsed.applications.filter(
              (a) => a && typeof a.id === "string" && a.payload && a.status,
            ),
          };
        }
      }
    } catch {
      local = emptyState();
    }
  }
  const merged = mergeStates(local, readCookieState());
  // If cookie brought newer data, persist back to this origin's localStorage
  if (
    typeof localStorage !== "undefined" &&
    JSON.stringify(merged) !== JSON.stringify(local)
  ) {
    try {
      localStorage.setItem(INSTITUTE_REGISTRATION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

function writeState(state: RegistrationState): void {
  // Keep compressed logo thumbs in LS; drop oversized raw uploads.
  const sanitized: RegistrationState = {
    applications: state.applications.map((a) => {
      const logo = a.payload.logoPreview?.trim();
      const keepLogo =
        !!logo &&
        logo.startsWith("data:image/") &&
        logo.length <= LOGO_COOKIE_MAX_CHARS * 4;
      return {
        ...a,
        payload: {
          ...a.payload,
          logoPreview: keepLogo ? logo : undefined,
        },
      };
    }),
  };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        INSTITUTE_REGISTRATION_STORAGE_KEY,
        JSON.stringify(sanitized),
      );
    } catch {
      // Quota — still attempt cookie sync for Nexus visibility
    }
  }
  writeCookieState(sanitized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INSTITUTE_REGISTRATION_CHANGED_EVENT));
  }
}

function newId(): string {
  return `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function newReferenceId(): string {
  return `LX-REG-${Date.now().toString(36).toUpperCase()}`;
}

export function listInstituteRegistrations(): InstituteRegistrationApplication[] {
  return readState()
    .applications.slice()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function listPendingInstituteRegistrations(): InstituteRegistrationApplication[] {
  return listInstituteRegistrations().filter((a) => a.status === "pending");
}

export function getInstituteRegistration(
  id: string,
): InstituteRegistrationApplication | null {
  return listInstituteRegistrations().find((a) => a.id === id) ?? null;
}

export function findInstituteRegistrationByEmail(
  email: string,
): InstituteRegistrationApplication | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return (
    listInstituteRegistrations().find(
      (a) => a.payload.principalEmail.trim().toLowerCase() === normalized,
    ) ?? null
  );
}

export function submitInstituteRegistration(input: {
  payload: InstituteRegistrationPayload;
  emailVerified: boolean;
  mobileVerified: boolean;
}): InstituteRegistrationApplication {
  const state = readState();
  const email = input.payload.principalEmail.trim().toLowerCase();
  const existingIdx = state.applications.findIndex(
    (a) => a.payload.principalEmail.trim().toLowerCase() === email,
  );

  const base: InstituteRegistrationApplication = {
    id: existingIdx >= 0 ? state.applications[existingIdx]!.id : newId(),
    referenceId:
      existingIdx >= 0
        ? state.applications[existingIdx]!.referenceId
        : newReferenceId(),
    status: "pending",
    payload: {
      ...input.payload,
      principalEmail: email,
      instituteName: input.payload.instituteName.trim(),
    },
    emailVerified: input.emailVerified,
    mobileVerified: input.mobileVerified,
    submittedAt: nowIso(),
    updatedAt: nowIso(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    rejectionReason: undefined,
    approvedInstituteId: undefined,
  };

  if (existingIdx >= 0) {
    state.applications[existingIdx] = base;
  } else {
    state.applications.unshift(base);
  }
  writeState(state);
  return base;
}

export function approveInstituteRegistration(
  id: string,
  opts: { approvedInstituteId: string; reviewedBy?: string },
): InstituteRegistrationApplication | null {
  const state = readState();
  const idx = state.applications.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const cur = state.applications[idx]!;
  if (cur.status === "approved" && cur.approvedInstituteId) return cur;

  const next: InstituteRegistrationApplication = {
    ...cur,
    status: "approved",
    approvedInstituteId: opts.approvedInstituteId,
    reviewedAt: nowIso(),
    reviewedBy: opts.reviewedBy ?? "Nexus Operator",
    rejectionReason: undefined,
    updatedAt: nowIso(),
  };
  state.applications[idx] = next;
  writeState(state);
  return next;
}

export function rejectInstituteRegistration(
  id: string,
  opts: { reason: string; reviewedBy?: string },
): InstituteRegistrationApplication | null {
  const state = readState();
  const idx = state.applications.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const cur = state.applications[idx]!;
  const next: InstituteRegistrationApplication = {
    ...cur,
    status: "rejected",
    rejectionReason: opts.reason.trim() || "Registration declined",
    reviewedAt: nowIso(),
    reviewedBy: opts.reviewedBy ?? "Nexus Operator",
    approvedInstituteId: undefined,
    updatedAt: nowIso(),
  };
  state.applications[idx] = next;
  writeState(state);
  return next;
}

export function subscribeInstituteRegistrations(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === INSTITUTE_REGISTRATION_STORAGE_KEY) listener();
  };
  const onFocus = () => listener();
  // Cross-port cookie updates do not fire `storage` — poll while visible.
  const poll = window.setInterval(() => {
    if (document.visibilityState === "visible") listener();
  }, 2000);
  window.addEventListener("storage", onStorage);
  window.addEventListener(INSTITUTE_REGISTRATION_CHANGED_EVENT, listener);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
  return () => {
    window.clearInterval(poll);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(INSTITUTE_REGISTRATION_CHANGED_EVENT, listener);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}

/** Seed one pending application so Nexus queue is demoable on a fresh browser. */
export function ensureDemoPendingRegistration(): void {
  const state = readState();
  if (state.applications.some((a) => a.status === "pending")) return;
  if (state.applications.some((a) => a.payload.principalEmail === "registrar@greenfield.edu.in")) {
    return;
  }
  const seeded: InstituteRegistrationApplication = {
    id: "reg-demo-greenfield",
    referenceId: "LX-REG-DEMO01",
    status: "pending",
    payload: {
      instituteName: "Test1School",
      instituteType: "School (K-12)",
      educationBoard: "CBSE",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru Urban",
      city: "Bengaluru",
      address: "45 Residency Road",
      pincode: "560025",
      website: "https://greenfield.example.edu",
      principalName: "Anita Rao",
      principalEmail: "registrar@greenfield.edu.in",
      principalMobile: "9876543210",
      principalDesignation: "Principal",
      employeeId: "GF-P-01",
    },
    emailVerified: true,
    mobileVerified: true,
    submittedAt: nowIso(),
    updatedAt: nowIso(),
  };
  writeState({ applications: [seeded, ...state.applications] });
}
