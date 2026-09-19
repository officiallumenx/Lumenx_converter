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

export function getAdmissionsOrigin(): string {
  const fromEnv = import.meta.env.VITE_ADMISSIONS_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5177`;
    }
  }
  return "https://admissions.lumenx.app";
}

export function admissionsPortalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAdmissionsOrigin()}${normalized}`;
}

/** Institute admissions dashboard — pipeline lives in standalone Admissions app. */
export const CONNECT_ADMISSIONS_INSTITUTE = "/institute/";

/** Institute application review board. */
export const CONNECT_ADMISSIONS_APPLICATIONS = "/institute/applications/";

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
  code?: string;
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
  code?: string;
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
    window.open(admissionsPortalUrl("/login"), "lumenx-admissions");
    return;
  }
  const handoff: AdmissionsAdminHandoff = {
    email: session.email,
    name: session.name,
    phone: session.phone,
    instituteId: session.instituteId,
    instituteName: session.instituteName,
    dest,
    exp: Date.now() + 10 * 60 * 1000,
  };

  if (isApiAuthMode()) {
    void (async () => {
      try {
        handoff.code = await issuePortalHandoff("admissions", handoff);
      } catch {
        /* setup page will require sign-in */
      }
      openAdmissionsHandoffWindow(handoff);
    })();
    return;
  }

  openAdmissionsHandoffWindow(handoff);
}

function openAdmissionsHandoffWindow(handoff: AdmissionsAdminHandoff): void {
  const session = loadSession();
  if (!session?.email) return;

  const encoded = encodeAdmissionsAdminHandoff(handoff);
  const path = `/setup-from-admin?handoff=${encodeURIComponent(encoded)}`;
  const url = admissionsPortalUrl(path);
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
      handoff.code = await issuePortalHandoff("careers", handoff);
    } catch {
      // Careers setup will prompt sign-in.
    }
  }

  const path = `/setup-from-admin?handoff=${encodeURIComponent(encodeCareersAdminHandoff(handoff))}`;
  const url = careersPortalUrl(path);
  const child = window.open(url, "lumenx-careers");
  setCareersPortalWindow(child);
}

async function issuePortalHandoff(
  app: "admissions" | "careers",
  handoff: AdmissionsAdminHandoff | CareersAdminHandoff,
): Promise<string> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.refresh_token) {
    throw new Error("No active API session");
  }
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
  const response = await fetch(`${base}/api/v1/auth/handoff/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      app,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      institute_id: handoff.instituteId,
      institute_name: handoff.instituteName,
      destination: handoff.dest,
      name: handoff.name,
      phone: handoff.phone,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: { code?: string };
    error?: { message?: string };
  };
  if (!response.ok || !json.data?.code) {
    throw new Error(json.error?.message ?? "Unable to create portal handoff");
  }
  return json.data.code;
}
