import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type {
  AdmissionApplication,
  AdmissionsNotification,
  AdmissionsUser,
  ApplicationDraft,
  ApplicationDocument,
  DocumentType,
} from "./types";
import {
  DEMO_APPLICANT,
  DEMO_INSTITUTE_ADMIN,
  DEMO_APPLICATIONS,
  DEMO_NOTIFICATIONS,
  nextApplicationId,
  buildTimeline,
} from "./mock-data";
import { ADMISSION_PROGRAMS_V2, getProgramByIdV2, resolveProgramId } from "./programs-data";
import { pushSyncSnapshot } from "./admin-bridge";

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

let usersCache: AdmissionsUser[] | null = null;
let appsCache: AdmissionApplication[] | null = null;
let notifCache: AdmissionsNotification[] | null = null;

const DEMO_ACCOUNTS = [DEMO_APPLICANT, DEMO_INSTITUTE_ADMIN] as const;
const DEMO_ACCOUNT_IDS = new Set(DEMO_ACCOUNTS.map((u) => u.id));
const DEMO_PASSWORD = "demo123";
const LEGACY_DEMO_PASSWORD = "demo";

function syncDemoUsers(stored: AdmissionsUser[]): AdmissionsUser[] {
  const custom = stored.filter(
    (u) =>
      !DEMO_ACCOUNT_IDS.has(u.id) &&
      !DEMO_ACCOUNTS.some((d) => d.email?.toLowerCase() === u.email?.toLowerCase()),
  );
  return [...DEMO_ACCOUNTS.map((d) => ({ ...d })), ...custom];
}

export function refreshStoredSessionUser() {
  const current = getCurrentUser();
  if (!current || !usersCache) return;
  const fresh = usersCache.find((u) => u.id === current.id);
  if (fresh) setCurrentUser(fresh);
}

export function initAdmissionsStores() {
  getUsers();
  refreshStoredSessionUser();
  pushSyncSnapshot(getApplicationsStore());
}

function getUsers(): AdmissionsUser[] {
  if (!usersCache) {
    const stored = readJson<AdmissionsUser[]>("ues_admissions_users", []);
    usersCache = syncDemoUsers(stored);
    writeJson("ues_admissions_users", usersCache);
    refreshStoredSessionUser();
  }
  return usersCache;
}

function passwordMatches(user: AdmissionsUser, password: string): boolean {
  if (user.passwordHash === password) return true;
  const isDemo = DEMO_ACCOUNT_IDS.has(user.id);
  if (!isDemo) return false;
  if (password === DEMO_PASSWORD || password === LEGACY_DEMO_PASSWORD) return true;
  return false;
}

function saveUsers(users: AdmissionsUser[]) {
  usersCache = users;
  writeJson("ues_admissions_users", users);
}

function getApplicationsStore(): AdmissionApplication[] {
  if (!appsCache) {
    const stored = readJson<AdmissionApplication[] | null>(ADMISSIONS_STORAGE_KEYS.applications, null);
    appsCache = stored ?? [...DEMO_APPLICATIONS];
  }
  return appsCache;
}

function saveApplications(apps: AdmissionApplication[]) {
  appsCache = apps;
  writeJson(ADMISSIONS_STORAGE_KEYS.applications, apps);
  pushSyncSnapshot(apps);
}

function getNotificationsStore(): AdmissionsNotification[] {
  if (!notifCache) {
    notifCache = readJson<AdmissionsNotification[]>(ADMISSIONS_STORAGE_KEYS.notifications, [...DEMO_NOTIFICATIONS]);
  }
  return notifCache;
}

function saveNotifications(n: AdmissionsNotification[]) {
  notifCache = n;
  writeJson(ADMISSIONS_STORAGE_KEYS.notifications, n);
}

export function getPrograms(instituteId?: string) {
  if (instituteId) return ADMISSION_PROGRAMS_V2.filter((p) => p.instituteId === instituteId);
  return ADMISSION_PROGRAMS_V2;
}

export function getProgramById(id: string) {
  return getProgramByIdV2(resolveProgramId(id));
}

export function findUserByIdentifier(identifier: string): AdmissionsUser | undefined {
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

export function getCurrentUser(): AdmissionsUser | null {
  return readJson<AdmissionsUser | null>(ADMISSIONS_STORAGE_KEYS.user, null);
}

export function setCurrentUser(user: AdmissionsUser | null) {
  if (user) writeJson(ADMISSIONS_STORAGE_KEYS.user, user);
  else storage.removeItem(ADMISSIONS_STORAGE_KEYS.user);
}

export function registerUser(input: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  accountType?: AdmissionsUser["accountType"];
  instituteId?: string;
  instituteName?: string;
}): AdmissionsUser {
  const users = getUsers();
  const user: AdmissionsUser = {
    id: `ADM-${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.password,
    profileComplete: input.accountType === "institute_admin" ? 100 : input.email && input.phone ? 80 : 60,
    createdAt: new Date().toISOString(),
    accountType: input.accountType ?? "parent",
    instituteId: input.instituteId,
    instituteName: input.instituteName,
  };
  saveUsers([...users, user]);
  setCurrentUser(user);
  return user;
}

export function signInUser(identifier: string, password: string): AdmissionsUser | null {
  const user = findUserByIdentifier(identifier);
  const pwd = password.trim();
  if (!user || !passwordMatches(user, pwd)) return null;
  const signedIn =
    DEMO_ACCOUNT_IDS.has(user.id) && user.passwordHash !== DEMO_PASSWORD
      ? { ...user, passwordHash: DEMO_PASSWORD }
      : user;
  if (signedIn !== user) {
    const users = getUsers().map((u) => (u.id === signedIn.id ? signedIn : u));
    saveUsers(users);
  }
  setCurrentUser(signedIn);
  return signedIn;
}

export function updatePassword(identifier: string, password: string): boolean {
  const users = getUsers();
  const user = findUserByIdentifier(identifier);
  if (!user) return false;
  const next = users.map((u) => (u.id === user.id ? { ...u, passwordHash: password } : u));
  saveUsers(next);
  if (getCurrentUser()?.id === user.id) setCurrentUser({ ...user, passwordHash: password });
  return true;
}

export function signOutUser() {
  setCurrentUser(null);
}

export function getApplicationsForUser(applicantId: string): AdmissionApplication[] {
  return getApplicationsStore().filter((a) => a.applicantId === applicantId);
}

export function getAllApplications(): AdmissionApplication[] {
  return getApplicationsStore();
}

export function updateApplication(updated: AdmissionApplication) {
  const apps = getApplicationsStore();
  saveApplications(apps.map((a) => (a.id === updated.id ? updated : a)));
}

export function getApplicationById(id: string): AdmissionApplication | undefined {
  return getApplicationsStore().find((a) => a.id === id);
}

export function getDraft(applicantId: string): ApplicationDraft | null {
  return readJson<ApplicationDraft | null>(`${ADMISSIONS_STORAGE_KEYS.draft}_${applicantId}`, null);
}

export function saveDraft(applicantId: string, draft: ApplicationDraft) {
  writeJson(`${ADMISSIONS_STORAGE_KEYS.draft}_${applicantId}`, draft);
}

export function clearDraft(applicantId: string) {
  storage.removeItem(`${ADMISSIONS_STORAGE_KEYS.draft}_${applicantId}`);
}

const DOC_LABELS: Record<DocumentType, string> = {
  birth_certificate: "Birth Certificate",
  transfer_certificate: "Transfer Certificate",
  marks_memo: "Previous Marks Memo",
  student_photo: "Student Photo",
  parent_id: "Parent ID",
  additional: "Additional Document",
};

export function submitApplication(
  applicantId: string,
  data: Omit<AdmissionApplication, "id" | "applicantId" | "status" | "updatedAt" | "timeline" | "submittedAt">,
): AdmissionApplication {
  const apps = getApplicationsStore();
  const app: AdmissionApplication = {
    ...data,
    id: nextApplicationId(apps),
    applicantId,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: buildTimeline("submitted"),
  };
  saveApplications([app, ...apps]);
  clearDraft(applicantId);
  addNotification({
    applicantId,
    applicationId: app.id,
    title: "Application submitted",
    body: `${app.id} for ${app.student.name} received.`,
    type: "application",
  });
  return app;
}

export function saveDraftApplication(applicantId: string, partial: Partial<AdmissionApplication>): AdmissionApplication {
  const apps = getApplicationsStore();
  const existing = apps.find((a) => a.applicantId === applicantId && a.status === "draft");
  if (existing) {
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    saveApplications(apps.map((a) => (a.id === existing.id ? updated : a)));
    return updated;
  }
  const app: AdmissionApplication = {
    id: nextApplicationId(apps),
    applicantId,
    status: "draft",
    programId: partial.programId ?? "",
    programName: partial.programName ?? "",
    grade: partial.grade ?? "",
    academicYear: partial.academicYear ?? "2026–27",
    student: partial.student ?? { name: "", gender: "", dateOfBirth: "", nationality: "Indian", bloodGroup: "" },
    parent: partial.parent ?? { fatherName: "", motherName: "", guardianName: "", mobile: "", email: "", occupation: "" },
    address: partial.address ?? { address: "", city: "", state: "", country: "India", postalCode: "" },
    academic: partial.academic ?? { currentSchool: "", currentGrade: "", previousResults: "", performance: "" },
    documents: partial.documents ?? [],
    timeline: [{ id: "draft", status: "draft", label: "Draft saved", at: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  };
  saveApplications([app, ...apps]);
  return app;
}

export function uploadDocument(
  applicationId: string,
  type: DocumentType,
  fileName: string,
): ApplicationDocument {
  const apps = getApplicationsStore();
  const app = apps.find((a) => a.id === applicationId);
  if (!app) throw new Error("Application not found");
  const now = new Date().toISOString();
  const doc: ApplicationDocument = {
    id: `doc-${type}-${Date.now()}`,
    type,
    label: DOC_LABELS[type],
    fileName,
    status: "uploaded",
    uploadedAt: now.slice(0, 10),
    version: (app.documents.find((d) => d.type === type)?.version ?? 0) + 1,
    verificationTimeline: [
      ...(app.documents.find((d) => d.type === type)?.verificationTimeline ?? []),
      { id: `vt-${Date.now()}`, status: "uploaded", at: now },
    ],
  };
  const nextDocs = [...app.documents.filter((d) => d.type !== type), doc];
  const updated = { ...app, documents: nextDocs, updatedAt: new Date().toISOString() };
  saveApplications(apps.map((a) => (a.id === applicationId ? updated : a)));
  return doc;
}

export function getNotifications(applicantId: string): AdmissionsNotification[] {
  return getNotificationsStore()
    .filter((n) => n.applicantId === applicantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markNotificationRead(id: string) {
  const all = getNotificationsStore();
  saveNotifications(all.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllNotificationsRead(applicantId: string) {
  const all = getNotificationsStore();
  saveNotifications(
    all.map((n) => (n.applicantId === applicantId ? { ...n, read: true } : n)),
  );
}

export function addNotification(input: Omit<AdmissionsNotification, "id" | "read" | "createdAt">) {
  const all = getNotificationsStore();
  const n: AdmissionsNotification = {
    ...input,
    id: `n-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  saveNotifications([n, ...all]);
}

export function unreadNotificationCount(applicantId: string): number {
  return getNotifications(applicantId).filter((n) => !n.read).length;
}
