import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type {
  ApplicationDraft,
  ApplicationDocument,
  CareerDocumentType,
  CareersNotification,
  CareersUser,
  JobApplication,
} from "./types";
import {
  DEMO_CANDIDATE,
  DEMO_RECRUITER,
  DEMO_APPLICATIONS,
  DEMO_NOTIFICATIONS,
  nextApplicationId,
  buildApplicationTimeline,
} from "./mock-data";
import { normalizeCareersUser } from "./auth-utils";
import type { CareersAccountType, OrganizationType } from "./types";
import { filterJobs, JOB_POSTINGS } from "./jobs-data";
import { getOpenRecruiterJobs, getRecruiterJobById, getRecruiterPostedJobs, seedRecruiterDemoJobs } from "./recruiter-jobs-store";
import { pushSyncSnapshot } from "./admin-bridge";
import { computeProfileCompletion } from "./profile-repository";
import { enrollRejectedCandidate } from "./talent-pool-store";
export {
  getSavedJobIds,
  isJobSaved,
  toggleSavedJob,
  getSavedJobs,
  addSavedJob,
  removeSavedJob,
} from "./saved-store";

const storage = createBrowserAuthStorage();
const USERS_KEY = "ues_careers_users";

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

let usersCache: CareersUser[] | null = null;
let appsCache: JobApplication[] | null = null;
let notifCache: CareersNotification[] | null = null;

const DEMO_ACCOUNTS = [DEMO_CANDIDATE, DEMO_RECRUITER] as const;
const DEMO_ACCOUNT_IDS = new Set(DEMO_ACCOUNTS.map((u) => u.id));
const DEMO_PASSWORD = "demo123";
const LEGACY_DEMO_PASSWORD = "demo";

function syncDemoUsers(stored: CareersUser[]): CareersUser[] {
  const custom = stored
    .filter(
      (u) =>
        !DEMO_ACCOUNT_IDS.has(u.id) &&
        !DEMO_ACCOUNTS.some((d) => d.email?.toLowerCase() === u.email?.toLowerCase()),
    )
    .map((u) => normalizeCareersUser(u));
  return [...DEMO_ACCOUNTS.map((d) => ({ ...d })), ...custom];
}

export function refreshStoredSessionUser() {
  const current = getCurrentUser();
  if (!current || !usersCache) return;
  const fresh = usersCache.find((u) => u.id === current.id);
  if (fresh) setCurrentUser(fresh);
}

export function initCareersStores() {
  getUsers();
  refreshStoredSessionUser();
  seedRecruiterDemoJobs();
  pushSyncSnapshot(getApplicationsStore());
}

function getUsers(): CareersUser[] {
  if (!usersCache) {
    const stored = readJson<CareersUser[]>(USERS_KEY, []);
    usersCache = syncDemoUsers(stored);
    writeJson(USERS_KEY, usersCache);
    refreshStoredSessionUser();
  }
  return usersCache;
}

function passwordMatches(user: CareersUser, password: string): boolean {
  if (user.passwordHash === password) return true;
  if (!DEMO_ACCOUNT_IDS.has(user.id)) return false;
  return password === DEMO_PASSWORD || password === LEGACY_DEMO_PASSWORD;
}

function saveUsers(users: CareersUser[]) {
  usersCache = users;
  writeJson(USERS_KEY, users);
}

function getApplicationsStore(): JobApplication[] {
  if (!appsCache) {
    const stored = readJson<JobApplication[] | null>(CAREERS_STORAGE_KEYS.applications, null);
    appsCache = stored ?? [...DEMO_APPLICATIONS];
  }
  return appsCache;
}

function saveApplications(apps: JobApplication[]) {
  appsCache = apps;
  writeJson(CAREERS_STORAGE_KEYS.applications, apps);
  pushSyncSnapshot(apps);
}

function getNotificationsStore(): CareersNotification[] {
  if (!notifCache) {
    notifCache = readJson<CareersNotification[]>(CAREERS_STORAGE_KEYS.notifications, [...DEMO_NOTIFICATIONS]);
  }
  return notifCache;
}

function saveNotifications(n: CareersNotification[]) {
  notifCache = n;
  writeJson(CAREERS_STORAGE_KEYS.notifications, n);
}

export function getJobs() {
  return [...JOB_POSTINGS, ...getOpenRecruiterJobs()];
}

export function getJobById(id: string) {
  return getRecruiterJobById(id) ?? JOB_POSTINGS.find((j) => j.id === id);
}

export function filterAllJobs(opts: Parameters<typeof filterJobs>[0]) {
  return filterJobs(opts, getJobs());
}

export { filterJobs };

export function findUserByIdentifier(identifier: string): CareersUser | undefined {
  const q = identifier.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  return getUsers().find((u) => {
    if (u.email?.toLowerCase() === q) return true;
    const phoneDigits = u.phone?.replace(/\D/g, "") ?? "";
    if (phoneDigits && digits.length >= 10) {
      return phoneDigits === digits || phoneDigits.endsWith(digits) || digits.endsWith(phoneDigits);
    }
    return false;
  });
}

export function getCurrentUser(): CareersUser | null {
  const user = readJson<CareersUser | null>(CAREERS_STORAGE_KEYS.user, null);
  return user ? normalizeCareersUser(user) : null;
}

export function setCurrentUser(user: CareersUser | null) {
  if (user) writeJson(CAREERS_STORAGE_KEYS.user, user);
  else storage.removeItem(CAREERS_STORAGE_KEYS.user);
}

export function updateUserProfileComplete(userId: string, profileComplete: number) {
  const users = getUsers();
  saveUsers(users.map((u) => (u.id === userId ? { ...u, profileComplete } : u)));
  if (getCurrentUser()?.id === userId) {
    const u = users.find((x) => x.id === userId);
    if (u) setCurrentUser({ ...u, profileComplete });
  }
}

export function registerUser(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountType: CareersAccountType;
  organizationId?: string;
  organizationName?: string;
  organizationType?: OrganizationType;
}): CareersUser {
  const users = getUsers();
  const prefix = input.accountType === "recruiter" ? "CAR-REC" : "CAR";
  const user: CareersUser = {
    id: `${prefix}-${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.password,
    accountType: input.accountType,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    organizationType: input.organizationType,
    profileComplete: input.accountType === "recruiter" ? 100 : 25,
    emailVerified: input.emailVerified,
    phoneVerified: input.phoneVerified,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  setCurrentUser(user);
  return user;
}

export function signInUser(identifier: string, password: string): CareersUser | null {
  const user = findUserByIdentifier(identifier);
  const pwd = password.trim();
  if (!user || !passwordMatches(user, pwd)) return null;
  const signedIn =
    DEMO_ACCOUNT_IDS.has(user.id) && user.passwordHash !== DEMO_PASSWORD
      ? { ...user, passwordHash: DEMO_PASSWORD }
      : user;
  if (signedIn !== user) {
    saveUsers(getUsers().map((u) => (u.id === signedIn.id ? signedIn : u)));
  }
  setCurrentUser(signedIn);
  return signedIn;
}

export function updatePassword(identifier: string, password: string): boolean {
  const users = getUsers();
  const user = findUserByIdentifier(identifier);
  if (!user) return false;
  saveUsers(users.map((u) => (u.id === user.id ? { ...u, passwordHash: password } : u)));
  if (getCurrentUser()?.id === user.id) setCurrentUser({ ...user, passwordHash: password });
  return true;
}

export function signOutUser() {
  setCurrentUser(null);
}

export function getApplicationsForUser(candidateId: string): JobApplication[] {
  return getApplicationsStore()
    .filter((a) => a.candidateId === candidateId)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export function getApplicationsForOrganization(organizationId: string): JobApplication[] {
  const orgJobIds = new Set([
    ...JOB_POSTINGS.filter((j) => j.instituteId === organizationId).map((j) => j.id),
    ...getRecruiterPostedJobs()
      .filter((j) => j.instituteId === organizationId)
      .map((j) => j.id),
  ]);
  return getApplicationsStore()
    .filter((a) => a.instituteId === organizationId || orgJobIds.has(a.jobId))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export function updateApplicationStatusByRecruiter(
  applicationId: string,
  status: JobApplication["status"],
  note?: string,
) {
  updateApplicationStatus(applicationId, status, note ?? "Updated by recruiter");
}

export function getApplicationById(id: string): JobApplication | undefined {
  return getApplicationsStore().find((a) => a.id === id);
}

export function getDraft(candidateId: string): ApplicationDraft | null {
  return readJson<ApplicationDraft | null>(`${CAREERS_STORAGE_KEYS.draft}_${candidateId}`, null);
}

export function saveDraft(candidateId: string, draft: ApplicationDraft) {
  writeJson(`${CAREERS_STORAGE_KEYS.draft}_${candidateId}`, draft);
}

export function clearDraft(candidateId: string) {
  storage.removeItem(`${CAREERS_STORAGE_KEYS.draft}_${candidateId}`);
}

const DOC_LABELS: Record<CareerDocumentType, string> = {
  resume: "Resume / CV",
  certificates: "Certificates",
  experience_letters: "Experience Letters",
  identity_proof: "Identity Proof",
  profile_photo: "Profile Photo",
  demo_teaching_video: "Demo Teaching Video",
  additional: "Additional Document",
};

const defaultDocs = (): ApplicationDocument[] =>
  (["resume", "certificates", "experience_letters", "identity_proof", "profile_photo"] as CareerDocumentType[]).map(
    (type) => ({
      id: `doc-${type}`,
      type,
      label: DOC_LABELS[type],
      status: "uploaded" as const,
    }),
  );

export function submitApplication(
  candidateId: string,
  data: {
    jobId: string;
    jobTitle: string;
    instituteName: string;
    instituteId?: string;
    personal: JobApplication["personal"];
    address: JobApplication["address"];
    professional: JobApplication["professional"];
    skills: JobApplication["skills"];
    documents: ApplicationDocument[];
  },
): JobApplication {
  const apps = getApplicationsStore();
  const submittedAt = new Date().toISOString();
  const app: JobApplication = {
    ...data,
    id: nextApplicationId(),
    candidateId,
    status: "submitted",
    submittedAt,
    updatedAt: submittedAt,
    timeline: buildApplicationTimeline("submitted", submittedAt),
    hrNotes: ["Application received. HR will review shortly."],
  };
  saveApplications([app, ...apps]);
  clearDraft(candidateId);
  addNotification({
    candidateId,
    applicationId: app.id,
    title: "Application submitted",
    body: `Your application ${app.id} for ${app.jobTitle} at ${app.instituteName} has been submitted.`,
    type: "application",
  });
  return app;
}

export function updateApplicationStatus(applicationId: string, status: JobApplication["status"], note?: string) {
  const apps = getApplicationsStore();
  const idx = apps.findIndex((a) => a.id === applicationId);
  if (idx < 0) return;
  const app = apps[idx]!;
  const updated: JobApplication = {
    ...app,
    status,
    updatedAt: new Date().toISOString(),
    timeline: [
      ...app.timeline,
      {
        id: `tl-${Date.now()}`,
        status,
        label: status.replace(/_/g, " "),
        at: new Date().toISOString(),
        note,
      },
    ],
  };
  if (status === "rejected" && app.instituteId) {
    enrollRejectedCandidate(app.candidateId, app.instituteId, app.instituteName);
  }
  const next = [...apps];
  next[idx] = updated;
  saveApplications(next);
}

export function uploadDocument(
  applicationId: string,
  type: CareerDocumentType,
  fileName: string,
): ApplicationDocument {
  const apps = getApplicationsStore();
  const app = apps.find((a) => a.id === applicationId);
  if (!app) throw new Error("Application not found");
  const doc: ApplicationDocument = {
    id: `doc-${type}-${Date.now()}`,
    type,
    label: DOC_LABELS[type],
    fileName,
    status: "uploaded",
    uploadedAt: new Date().toISOString().slice(0, 10),
  };
  const nextDocs = [...app.documents.filter((d) => d.type !== type), doc];
  const updated = { ...app, documents: nextDocs, updatedAt: new Date().toISOString() };
  saveApplications(apps.map((a) => (a.id === applicationId ? updated : a)));
  return doc;
}

export function getAllDocumentsForUser(candidateId: string): { applicationId: string; jobTitle: string; documents: ApplicationDocument[] }[] {
  return getApplicationsForUser(candidateId).map((a) => ({
    applicationId: a.id,
    jobTitle: a.jobTitle,
    documents: a.documents.length ? a.documents : defaultDocs(),
  }));
}

export function getInterviewsForUser(candidateId: string) {
  return getApplicationsForUser(candidateId)
    .filter((a) => a.interview)
    .map((a) => ({
      applicationId: a.id,
      jobTitle: a.jobTitle,
      instituteName: a.instituteName,
      status: a.status,
      interview: a.interview!,
    }));
}

export function getNotifications(candidateId: string): CareersNotification[] {
  return getNotificationsStore()
    .filter((n) => n.candidateId === candidateId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markNotificationRead(id: string) {
  saveNotifications(getNotificationsStore().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllNotificationsRead(candidateId: string) {
  saveNotifications(
    getNotificationsStore().map((n) => (n.candidateId === candidateId ? { ...n, read: true } : n)),
  );
}

export function addNotification(input: Omit<CareersNotification, "id" | "read" | "createdAt">) {
  const n: CareersNotification = {
    ...input,
    id: `cn-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  saveNotifications([n, ...getNotificationsStore()]);
}

export function unreadNotificationCount(candidateId: string): number {
  return getNotifications(candidateId).filter((n) => !n.read).length;
}

export { computeProfileCompletion };