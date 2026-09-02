/**
 * Deep links from Admin into Connect portals and the standalone Careers app.
 * Override with VITE_CONNECT_ORIGIN / VITE_CAREERS_ORIGIN.
 */
import { loadSession } from "@/auth/auth-store";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getDemoProfile, readDemoProfileId } from "@lumenx/types";
import {
  admissionsInstituteIdForAdminInstitute,
  admissionsInstituteIdForDemoProfile,
  INSTITUTE_PROFILE_MESSAGE,
  INSTITUTE_PROFILE_READY,
  type InstituteProfileSyncMessage,
} from "@lumenx/utils";
import { setAdmissionsPortalWindow } from "@/lib/admissions-portal-window";
import { setCareersPortalWindow } from "@/lib/careers-portal-window";
import { readStoredInstituteProfile } from "@/lib/institute-profile-store";

export function getConnectOrigin(): string {
  const fromEnv = import.meta.env.VITE_CONNECT_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    // Local monorepo: Admin often on 5173, Connect on 5174
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5174`;
    }
  }
  return "http://localhost:5174";
}

export function connectPortalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getConnectOrigin()}${normalized}`;
}

export function getCareersOrigin(): string {
  const fromEnv = import.meta.env.VITE_CAREERS_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5176`;
    }
  }
  return "https://careers.lumenx.app";
}

export function careersPortalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getCareersOrigin()}${normalized}`;
}

/** Institute admissions dashboard — pipeline lives here. */
export const CONNECT_ADMISSIONS_INSTITUTE = "/admissions/institute/";

/** Institute application review board. */
export const CONNECT_ADMISSIONS_APPLICATIONS = "/admissions/institute/applications/";

/** Careers recruiter workspace — jobs & hiring pipeline live here. */
export const CONNECT_CAREERS_RECRUITER = "/recruiter/";

/** Careers applicant review board. */
export const CONNECT_CAREERS_APPLICANTS = "/recruiter/applicants";

/** Careers jobs / vacancies for the institute. */
export const CONNECT_CAREERS_JOBS = "/recruiter/jobs";

export type AdmissionsHandoffDest = "institute" | "applications";

export type CareersHandoffDest = "recruiter" | "applicants" | "jobs";

/** Payload passed Admin → Connect so Admissions can auto-enter without re-login. */
export type AdmissionsAdminHandoff = {
  email: string;
  name: string;
  phone?: string;
  instituteId: string;
  instituteName: string;
  dest: AdmissionsHandoffDest;
  exp: number;
};

export function encodeAdmissionsAdminHandoff(payload: AdmissionsAdminHandoff): string {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

/** Payload passed Admin → Careers for recruiter auto-entry. */
export type CareersAdminHandoff = {
  email: string;
  name: string;
  phone?: string;
  instituteId: string;
  instituteName: string;
  dest: CareersHandoffDest;
  exp: number;
  /** API mode — short-lived Supabase tokens for cross-app session (Careers origin). */
  accessToken?: string;
  refreshToken?: string;
};

export function encodeCareersAdminHandoff(payload: CareersAdminHandoff): string {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

export function openConnectPortal(path: string): void {
  const url = connectPortalUrl(path);
  window.open(url, "_blank", "noopener,noreferrer");
}

function currentInstituteProfileForHandoff() {
  const profileId = readDemoProfileId();
  const demo = getDemoProfile(profileId);
  const profile = readStoredInstituteProfile(profileId, demo.admin.instituteProfile);
  const admissionsInstituteId = admissionsInstituteIdForDemoProfile(profileId);
  return { profile, admissionsInstituteId };
}

/**
 * Open Connect Admissions with Admin identity handoff.
 * Connect shows a Setting up screen, then enters the institute portal — no password prompt.
 * Keeps a window reference (no noopener) so we can sync the Admin institute profile.
 */
export function openAdmissionsFromAdmin(dest: AdmissionsHandoffDest = "institute"): void {
  const session = loadSession();
  if (!session?.email) {
    openConnectPortal("/admissions/login");
    return;
  }
  const handoff = encodeAdmissionsAdminHandoff({
    email: session.email,
    name: session.name,
    phone: session.phone,
    instituteId: session.instituteId,
    instituteName: session.instituteName,
    dest,
    exp: Date.now() + 10 * 60 * 1000,
  });
  const path = `/admissions/setup-from-admin?handoff=${encodeURIComponent(handoff)}`;
  const url = connectPortalUrl(path);
  const child = window.open(url, "lumenx-admissions");
  setAdmissionsPortalWindow(child);

  const { profile, admissionsInstituteId } = currentInstituteProfileForHandoff();
  const mappedId =
    admissionsInstituteIdForAdminInstitute(session.instituteId) || admissionsInstituteId;

  const onReady = (event: MessageEvent) => {
    if (event.data?.type !== INSTITUTE_PROFILE_READY) return;
    const message: InstituteProfileSyncMessage = {
      type: INSTITUTE_PROFILE_MESSAGE,
      admissionsInstituteId: mappedId,
      profile,
      updatedAt: Date.now(),
    };
    try {
      child?.postMessage(message, "*");
      event.source?.postMessage(message, { targetOrigin: "*" });
    } catch {
      /* ignore */
    }
    window.removeEventListener("message", onReady);
  };
  window.addEventListener("message", onReady);

  // Fallback if ready signal is missed (e.g. slow load)
  window.setTimeout(() => {
    try {
      const message: InstituteProfileSyncMessage = {
        type: INSTITUTE_PROFILE_MESSAGE,
        admissionsInstituteId: mappedId,
        profile,
        updatedAt: Date.now(),
      };
      child?.postMessage(message, "*");
    } catch {
      /* ignore */
    }
  }, 2500);
}

/**
 * Open LumenX Careers (standalone app) with Admin identity handoff.
 * Shows a setup screen, then enters the recruiter workspace — no password prompt.
 */
export async function openCareersFromAdmin(dest: CareersHandoffDest = "recruiter"): Promise<void> {
  const session = loadSession();
  if (!session?.email) {
    window.open(careersPortalUrl("/login"), "lumenx-careers");
    return;
  }

  const handoff: CareersAdminHandoff = {
    email: session.email,
    name: session.name,
    phone: session.phone,
    instituteId: session.instituteId,
    instituteName: session.instituteName,
    dest,
    exp: Date.now() + 10 * 60 * 1000,
  };

  if (isApiAuthMode()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        handoff.accessToken = data.session.access_token;
        handoff.refreshToken = data.session.refresh_token ?? undefined;
      }
    } catch {
      // handoff proceeds without tokens — Careers setup will prompt sign-in
    }
  }

  const path = `/setup-from-admin?handoff=${encodeURIComponent(encodeCareersAdminHandoff(handoff))}`;
  const url = careersPortalUrl(path);
  const child = window.open(url, "lumenx-careers");
  setCareersPortalWindow(child);
}
