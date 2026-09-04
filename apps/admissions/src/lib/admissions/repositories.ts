import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type {
  AdmissionType,
  AdmissionApplication,
  AdmissionsNotification,
  AdmissionsUser,
  CorrectionFieldPath,
  ParentConfirmationResponse,
  WaitlistRemovalReason,
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
import { ADMISSION_PROGRAMS_V2, getProgramByIdV2, getProgramsForInstitute, resolveProgramId } from "./programs-data";
import { getOpenPublishedOpenings, getOpeningById, openingToProgram } from "./openings-store";
import { pushSyncSnapshot } from "./admin-bridge";
import { mapAdminInstituteToAdmissions } from "./lumenx-admin-bridge";
import { normalizeApplicationStatus } from "./status-utils";
import {
  NOTIFICATION_TEMPLATE_IDS,
  renderNotificationTemplate,
} from "@lumenx/module-notifications";

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
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PARENT_CONFIRMATION_WINDOW_DAYS = 7;
const WAITLIST_WINDOW_DAYS = 90;
const WAITLIST_REMINDER_DAY = 80;

type PendingAdmissionsNotification = Omit<
  AdmissionsNotification,
  "id" | "read" | "createdAt"
>;

function admissionsTemplateNotification(input: {
  templateId: string;
  variables: Record<string, string | number>;
  applicantId: string;
  applicationId?: string;
  type: AdmissionsNotification["type"];
}): PendingAdmissionsNotification {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  return {
    applicantId: input.applicantId,
    applicationId: input.applicationId,
    templateId: rendered.id,
    title: rendered.title,
    body: rendered.body,
    type: input.type,
  };
}

function isParentConfirmationOpen(app: AdmissionApplication): boolean {
  return (
    app.status === "parent_confirmation" &&
    Boolean(app.parentConfirmationDueAt) &&
    !app.parentConfirmationRespondedAt
  );
}

function applyParentConfirmationExpiry(
  app: AdmissionApplication,
  nowMs: number,
): AdmissionApplication {
  if (!isParentConfirmationOpen(app)) return app;
  const dueMs = new Date(app.parentConfirmationDueAt!).getTime();
  if (Number.isNaN(dueMs) || dueMs > nowMs) return app;
  const now = new Date(nowMs).toISOString();
  return {
    ...app,
    status: "withdrawn",
    parentConfirmationRespondedAt: now,
    parentConfirmationResponse: "expired",
    requiredActions: [],
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        "withdrawn",
        "Parent confirmation expired",
        "No parent response received within 7 days.",
      ),
    ],
    updatedAt: now,
  };
}

function getOpeningForApplication(app: AdmissionApplication) {
  if (!app.programId) return undefined;
  return getOpeningById(app.programId);
}

function getApprovedCountForOpening(
  apps: AdmissionApplication[],
  openingId: string,
): number {
  return apps.filter((item) => item.programId === openingId && item.status === "approved").length;
}

function areSeatsAvailableForApplication(
  app: AdmissionApplication,
  apps: AdmissionApplication[],
): boolean {
  const opening = getOpeningForApplication(app);
  if (!opening) return true;
  const approved = getApprovedCountForOpening(apps, opening.id);
  return approved < opening.seatsAvailable;
}

function waitlistAgeDays(waitlist: NonNullable<AdmissionApplication["waitlist"]>, nowMs: number): number {
  const joinedMs = new Date(waitlist.joinedAt).getTime();
  if (Number.isNaN(joinedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - joinedMs) / ONE_DAY_MS));
}

function waitlistDaysRemaining(
  waitlist: NonNullable<AdmissionApplication["waitlist"]>,
  nowMs: number,
): number {
  const expiresMs = new Date(waitlist.expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / ONE_DAY_MS));
}

function removeFromWaitlistState(
  app: AdmissionApplication,
  nowIso: string,
  reason: WaitlistRemovalReason,
  label: string,
  note?: string,
): AdmissionApplication {
  return {
    ...app,
    status: "withdrawn",
    waitlist: app.waitlist
      ? {
          ...app.waitlist,
          active: false,
          removedAt: nowIso,
          removedReason: reason,
        }
      : app.waitlist,
    requiredActions: [],
    timeline: [...app.timeline, buildTimelineEvent("withdrawn", label, note)],
    updatedAt: nowIso,
  };
}

function applyWaitlistLifecycle(
  app: AdmissionApplication,
  apps: AdmissionApplication[],
  nowMs: number,
): { app: AdmissionApplication; notifications: PendingAdmissionsNotification[] } {
  const notifications: PendingAdmissionsNotification[] = [];
  if (app.status !== "waitlisted" || !app.waitlist || !app.waitlist.active) {
    return { app, notifications };
  }

  const nowIso = new Date(nowMs).toISOString();
  const age = waitlistAgeDays(app.waitlist, nowMs);
  const remaining = waitlistDaysRemaining(app.waitlist, nowMs);
  let next = app;

  if (remaining <= 0) {
    next = removeFromWaitlistState(
      app,
      nowIso,
      "expired_90_days",
      "Waitlist expired and removed",
      "Automatically removed after 90 days.",
    );
    notifications.push(
      admissionsTemplateNotification({
        templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.waitlistAutoRemoved,
        variables: { applicationId: app.id, limitDays: WAITLIST_WINDOW_DAYS },
        applicantId: app.applicantId,
        applicationId: app.id,
        type: "rejection",
      }),
    );
    return { app: next, notifications };
  }

  if (age >= WAITLIST_REMINDER_DAY && !app.waitlist.reminderDay80SentAt) {
    next = {
      ...next,
      waitlist: { ...next.waitlist!, reminderDay80SentAt: nowIso },
      timeline: [
        ...next.timeline,
        buildTimelineEvent(
          "waitlisted",
          "Waitlist day 80 reminder sent",
          "10 days remaining before automatic removal.",
        ),
      ],
      updatedAt: nowIso,
    };
    notifications.push(
      admissionsTemplateNotification({
        templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.waitlistDay80Reminder,
        variables: { applicationId: app.id, day: age },
        applicantId: app.applicantId,
        applicationId: app.id,
        type: "reminder",
      }),
    );
  }

  const seatsAvailable = areSeatsAvailableForApplication(next, apps);
  if (seatsAvailable && !next.waitlist?.seatAvailableNotifiedAt) {
    next = {
      ...next,
      waitlist: { ...next.waitlist!, seatAvailableNotifiedAt: nowIso },
      timeline: [
        ...next.timeline,
        buildTimelineEvent("waitlisted", "Seats available while on waitlist"),
      ],
      updatedAt: nowIso,
    };
    notifications.push(
      admissionsTemplateNotification({
        templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.seatsAvailable,
        variables: { applicationId: next.id },
        applicantId: next.applicantId,
        applicationId: next.id,
        type: "confirmation",
      }),
    );
  }

  return { app: next, notifications };
}

function applyAdmissionsLifecycle(
  apps: AdmissionApplication[],
): { apps: AdmissionApplication[]; notifications: PendingAdmissionsNotification[] } {
  const nowMs = Date.now();
  let nextApps = apps.map((app) => applyParentConfirmationExpiry(app, nowMs));
  const notifications: PendingAdmissionsNotification[] = [];
  nextApps = nextApps.map((app) => {
    const result = applyWaitlistLifecycle(app, nextApps, nowMs);
    notifications.push(...result.notifications);
    return result.app;
  });
  return { apps: nextApps, notifications };
}

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
    const stored = readJson<AdmissionApplication[] | null>(
      ADMISSIONS_STORAGE_KEYS.applications,
      null,
    );
    appsCache = stored ?? [...DEMO_APPLICATIONS];
  }
  const lifecycle = applyAdmissionsLifecycle(appsCache);
  const changed = lifecycle.apps.some((app, idx) => app !== appsCache![idx]);
  if (changed) {
    appsCache = lifecycle.apps;
    writeJson(ADMISSIONS_STORAGE_KEYS.applications, appsCache);
    pushSyncSnapshot(appsCache);
    if (lifecycle.notifications.length > 0) {
      const existing = getNotificationsStore();
      const generated = lifecycle.notifications.map((item, idx) => ({
        ...item,
        id: `n-auto-${Date.now()}-${idx}`,
        read: false,
        createdAt: new Date().toISOString(),
      }));
      saveNotifications([...generated, ...existing]);
    }
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
    notifCache = readJson<AdmissionsNotification[]>(ADMISSIONS_STORAGE_KEYS.notifications, [
      ...DEMO_NOTIFICATIONS,
    ]);
  }
  return notifCache;
}

function saveNotifications(n: AdmissionsNotification[]) {
  notifCache = n;
  writeJson(ADMISSIONS_STORAGE_KEYS.notifications, n);
}

export function getPrograms(instituteId?: string) {
  if (instituteId) return getProgramsForInstitute(instituteId);
  const openings = getOpenPublishedOpenings().map(openingToProgram);
  const seen = new Set(openings.map((p) => p.id));
  return [...openings, ...ADMISSION_PROGRAMS_V2.filter((p) => !seen.has(p.id))];
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

/** Persist API-authenticated admissions user (Supabase session is authoritative). */
export function persistApiAdmissionsUser(user: AdmissionsUser): void {
  setCurrentUser({
    ...user,
    profileComplete: user.profileComplete ?? (user.accountType === "institute_admin" ? 100 : 25),
    createdAt: user.createdAt ?? new Date().toISOString(),
  });
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
    profileComplete:
      input.accountType === "institute_admin" ? 100 : input.email && input.phone ? 80 : 60,
    createdAt: new Date().toISOString(),
    accountType: input.accountType ?? "parent",
    instituteId: input.instituteId,
    instituteName: input.instituteName,
  };
  saveUsers([...users, user]);
  setCurrentUser(user);
  return user;
}

export function signInUser(
  identifier: string,
  password: string,
  expectedAccountType?: AdmissionsUser["accountType"],
): AdmissionsUser | null {
  const user = findUserByIdentifier(identifier);
  const pwd = password.trim();
  if (!user || !passwordMatches(user, pwd)) return null;
  if (expectedAccountType && user.accountType !== expectedAccountType) return null;
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

/** Create or reuse an institute Admissions account from a verified LumenX Admin identity. */
export function continueInstituteWithLumenxAdmin(admin: {
  email: string;
  name: string;
  phone?: string;
  instituteId: string;
  instituteName: string;
}): AdmissionsUser {
  const email = admin.email.trim().toLowerCase();
  const phoneDigits = (admin.phone ?? "").replace(/\D/g, "").slice(-10);
  const users = getUsers();
  const existing = users.find((u) => {
    if (u.accountType !== "institute_admin") return false;
    if (u.email && u.email.trim().toLowerCase() === email) return true;
    if (
      phoneDigits &&
      u.phone &&
      u.phone.replace(/\D/g, "").slice(-10) === phoneDigits
    ) {
      return true;
    }
    return false;
  });

  const instituteId =
    existing?.instituteId ?? mapAdminInstituteToAdmissions(admin.instituteId);

  if (existing) {
    const updated: AdmissionsUser = {
      ...existing,
      name: admin.name || existing.name,
      email: existing.email ?? email,
      phone: existing.phone ?? admin.phone,
      instituteId,
      instituteName: existing.instituteName ?? admin.instituteName,
      accountType: "institute_admin",
    };
    saveUsers(users.map((u) => (u.id === existing.id ? updated : u)));
    setCurrentUser(updated);
    return updated;
  }

  return registerUser({
    name: admin.name,
    email,
    phone: admin.phone,
    password: `admin-linked:${email}`,
    accountType: "institute_admin",
    instituteId: mapAdminInstituteToAdmissions(admin.instituteId),
    instituteName: admin.instituteName,
  });
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

export type CorrectionFieldOption = {
  key: CorrectionFieldPath;
  label: string;
  type: "text" | "email" | "tel" | "date" | "file";
};

export const CORRECTION_FIELD_OPTIONS: CorrectionFieldOption[] = [
  { key: "student.name", label: "Student name", type: "text" },
  { key: "student.gender", label: "Student gender", type: "text" },
  { key: "student.dateOfBirth", label: "Student date of birth", type: "date" },
  { key: "student.nationality", label: "Student nationality", type: "text" },
  { key: "student.bloodGroup", label: "Student blood group", type: "text" },
  { key: "parent.fatherName", label: "Father's name", type: "text" },
  { key: "parent.motherName", label: "Mother's name", type: "text" },
  { key: "parent.guardianName", label: "Guardian name", type: "text" },
  { key: "parent.mobile", label: "Parent mobile", type: "tel" },
  { key: "parent.email", label: "Parent email", type: "email" },
  { key: "parent.occupation", label: "Parent occupation", type: "text" },
  { key: "address.address", label: "Address", type: "text" },
  { key: "address.city", label: "City", type: "text" },
  { key: "address.state", label: "State", type: "text" },
  { key: "address.country", label: "Country", type: "text" },
  { key: "address.postalCode", label: "Postal code", type: "text" },
  { key: "academic.currentSchool", label: "Current school", type: "text" },
  { key: "academic.currentGrade", label: "Current grade", type: "text" },
  { key: "academic.previousResults", label: "Previous results", type: "text" },
  { key: "academic.performance", label: "Academic performance", type: "text" },
  { key: "documents.birth_certificate", label: "Birth Certificate", type: "file" },
  { key: "documents.transfer_certificate", label: "Transfer Certificate", type: "file" },
  { key: "documents.marks_memo", label: "Previous Marks Memo", type: "file" },
  { key: "documents.student_photo", label: "Student Photo", type: "file" },
  { key: "documents.parent_id", label: "Parent ID", type: "file" },
  { key: "documents.additional", label: "Additional Document", type: "file" },
];

const CORRECTION_FIELD_LABEL_MAP = new Map(
  CORRECTION_FIELD_OPTIONS.map((field) => [field.key, field.label] as const),
);

const DOC_PATH_PREFIX = "documents." as const;

function correctionDocType(field: CorrectionFieldPath): DocumentType | null {
  if (!field.startsWith(DOC_PATH_PREFIX)) return null;
  const type = field.slice(DOC_PATH_PREFIX.length) as DocumentType;
  return DOC_LABELS[type] ? type : null;
}

function buildTimelineEvent(
  status: AdmissionApplication["status"],
  label: string,
  note?: string,
) {
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status,
    label,
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
  };
}

export function getCorrectionFieldLabel(field: CorrectionFieldPath): string {
  return CORRECTION_FIELD_LABEL_MAP.get(field) ?? field;
}

export function getCorrectionFieldCurrentValue(
  app: AdmissionApplication,
  field: CorrectionFieldPath,
): string {
  switch (field) {
    case "student.name":
      return app.student.name;
    case "student.gender":
      return app.student.gender;
    case "student.dateOfBirth":
      return app.student.dateOfBirth;
    case "student.nationality":
      return app.student.nationality;
    case "student.bloodGroup":
      return app.student.bloodGroup;
    case "parent.fatherName":
      return app.parent.fatherName;
    case "parent.motherName":
      return app.parent.motherName;
    case "parent.guardianName":
      return app.parent.guardianName;
    case "parent.mobile":
      return app.parent.mobile;
    case "parent.email":
      return app.parent.email;
    case "parent.occupation":
      return app.parent.occupation;
    case "address.address":
      return app.address.address;
    case "address.city":
      return app.address.city;
    case "address.state":
      return app.address.state;
    case "address.country":
      return app.address.country;
    case "address.postalCode":
      return app.address.postalCode;
    case "academic.currentSchool":
      return app.academic.currentSchool;
    case "academic.currentGrade":
      return app.academic.currentGrade;
    case "academic.previousResults":
      return app.academic.previousResults;
    case "academic.performance":
      return app.academic.performance;
    case "documents.birth_certificate":
    case "documents.transfer_certificate":
    case "documents.marks_memo":
    case "documents.student_photo":
    case "documents.parent_id":
    case "documents.additional": {
      const docType = correctionDocType(field);
      if (!docType) return "";
      return app.documents.find((doc) => doc.type === docType)?.fileName ?? "";
    }
    default:
      return "";
  }
}

function applyCorrectionFieldValue(
  app: AdmissionApplication,
  field: CorrectionFieldPath,
  value: string,
): AdmissionApplication {
  switch (field) {
    case "student.name":
      return { ...app, student: { ...app.student, name: value } };
    case "student.gender":
      return { ...app, student: { ...app.student, gender: value } };
    case "student.dateOfBirth":
      return { ...app, student: { ...app.student, dateOfBirth: value } };
    case "student.nationality":
      return { ...app, student: { ...app.student, nationality: value } };
    case "student.bloodGroup":
      return { ...app, student: { ...app.student, bloodGroup: value } };
    case "parent.fatherName":
      return { ...app, parent: { ...app.parent, fatherName: value } };
    case "parent.motherName":
      return { ...app, parent: { ...app.parent, motherName: value } };
    case "parent.guardianName":
      return { ...app, parent: { ...app.parent, guardianName: value } };
    case "parent.mobile":
      return { ...app, parent: { ...app.parent, mobile: value } };
    case "parent.email":
      return { ...app, parent: { ...app.parent, email: value } };
    case "parent.occupation":
      return { ...app, parent: { ...app.parent, occupation: value } };
    case "address.address":
      return { ...app, address: { ...app.address, address: value } };
    case "address.city":
      return { ...app, address: { ...app.address, city: value } };
    case "address.state":
      return { ...app, address: { ...app.address, state: value } };
    case "address.country":
      return { ...app, address: { ...app.address, country: value } };
    case "address.postalCode":
      return { ...app, address: { ...app.address, postalCode: value } };
    case "academic.currentSchool":
      return { ...app, academic: { ...app.academic, currentSchool: value } };
    case "academic.currentGrade":
      return { ...app, academic: { ...app.academic, currentGrade: value } };
    case "academic.previousResults":
      return { ...app, academic: { ...app.academic, previousResults: value } };
    case "academic.performance":
      return { ...app, academic: { ...app.academic, performance: value } };
    default:
      return app;
  }
}

export function submitApplication(
  applicantId: string,
  data: Omit<
    AdmissionApplication,
    "id" | "applicantId" | "status" | "updatedAt" | "timeline" | "submittedAt"
  >,
): AdmissionApplication {
  const apps = getApplicationsStore();
  if (
    hasDuplicateActiveApplicationForInstitute(
      applicantId,
      data.instituteId ?? "",
      data.student.name,
      data.student.dateOfBirth,
    )
  ) {
    throw new Error("DUPLICATE_ACTIVE_INSTITUTE_APPLICATION");
  }
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
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.applicationSubmitted,
      variables: { applicationId: app.id, studentName: app.student.name },
      applicantId,
      applicationId: app.id,
      type: "application",
    }),
  );
  return app;
}

function isActiveAdmissionsStatus(status: AdmissionApplication["status"]): boolean {
  const normalized = normalizeApplicationStatus(status);
  return normalized !== "draft" && normalized !== "rejected" && normalized !== "withdrawn";
}

function normalizeStudentIdentity(name: string, dateOfBirth: string): string {
  return `${name.trim().toLowerCase()}::${dateOfBirth.trim()}`;
}

export function hasDuplicateActiveApplicationForInstitute(
  applicantId: string,
  instituteId: string,
  studentName: string,
  dateOfBirth: string,
): boolean {
  const targetInstituteId = instituteId || "ins-test1school";
  const targetStudentKey = normalizeStudentIdentity(studentName, dateOfBirth);
  return getApplicationsStore().some((app) => {
    if (app.applicantId !== applicantId) return false;
    if (!isActiveAdmissionsStatus(app.status)) return false;
    const appInstituteId = app.instituteId || "ins-test1school";
    if (appInstituteId !== targetInstituteId) return false;
    return normalizeStudentIdentity(app.student.name, app.student.dateOfBirth) === targetStudentKey;
  });
}

export function requiredDocumentsForAdmissionType(admissionType: AdmissionType): DocumentType[] {
  if (admissionType === "transfer_admission") {
    return [
      "birth_certificate",
      "transfer_certificate",
      "marks_memo",
      "student_photo",
      "parent_id",
    ];
  }
  return ["birth_certificate", "student_photo", "parent_id"];
}

export function saveDraftApplication(
  applicantId: string,
  partial: Partial<AdmissionApplication>,
): AdmissionApplication {
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
    student: partial.student ?? {
      name: "",
      gender: "",
      dateOfBirth: "",
      nationality: "Indian",
      bloodGroup: "",
    },
    parent: partial.parent ?? {
      fatherName: "",
      motherName: "",
      guardianName: "",
      mobile: "",
      email: "",
      occupation: "",
    },
    address: partial.address ?? {
      address: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
    },
    academic: partial.academic ?? {
      currentSchool: "",
      currentGrade: "",
      previousResults: "",
      performance: "",
    },
    documents: partial.documents ?? [],
    timeline: [
      { id: "draft", status: "draft", label: "Draft saved", at: new Date().toISOString() },
    ],
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
  saveNotifications(all.map((n) => (n.applicantId === applicantId ? { ...n, read: true } : n)));
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

export function getParentConfirmationRemainingDays(
  app: AdmissionApplication,
  now: Date = new Date(),
): number | null {
  if (app.status !== "parent_confirmation" || !app.parentConfirmationDueAt) return null;
  const dueMs = new Date(app.parentConfirmationDueAt).getTime();
  if (Number.isNaN(dueMs)) return null;
  const remainingMs = dueMs - now.getTime();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / ONE_DAY_MS);
}

export function getTransientParentConfirmationReminders(
  applicantId: string,
  now: Date = new Date(),
): AdmissionsNotification[] {
  const hour = now.getHours();
  const slot =
    hour >= 6 && hour < 12 ? "morning" : hour >= 17 && hour < 22 ? "evening" : null;
  if (!slot) return [];

  const apps = getApplicationsForUser(applicantId).filter(
    (app) =>
      app.status === "parent_confirmation" &&
      !app.parentConfirmationRespondedAt &&
      getParentConfirmationRemainingDays(app, now) !== 0,
  );

  return apps.map((app, idx) => {
    const remainingDays = getParentConfirmationRemainingDays(app, now) ?? 0;
    const templateId =
      slot === "morning"
        ? NOTIFICATION_TEMPLATE_IDS.admissions.parent.confirmationReminderMorning
        : NOTIFICATION_TEMPLATE_IDS.admissions.parent.confirmationReminderEvening;
    const rendered = renderNotificationTemplate({
      templateId,
      variables: {
        applicationId: app.id,
        remainingDays,
      },
    });
    return {
      id: `transient-reminder-${slot}-${app.id}-${idx}`,
      applicantId,
      applicationId: app.id,
      templateId: rendered.id,
      title: rendered.title,
      body: rendered.body,
      type: "reminder",
      read: true,
      createdAt: now.toISOString(),
    };
  });
}

export function getWaitlistAgeDays(
  app: AdmissionApplication,
  now: Date = new Date(),
): number | null {
  if (app.status !== "waitlisted" || !app.waitlist) return null;
  return waitlistAgeDays(app.waitlist, now.getTime());
}

export function getWaitlistRemainingDays(
  app: AdmissionApplication,
  now: Date = new Date(),
): number | null {
  if (app.status !== "waitlisted" || !app.waitlist) return null;
  return waitlistDaysRemaining(app.waitlist, now.getTime());
}

export function isSeatAvailableForApplication(
  applicationId: string,
): boolean {
  const apps = getApplicationsStore();
  const app = apps.find((item) => item.id === applicationId);
  if (!app) return false;
  return areSeatsAvailableForApplication(app, apps);
}

export function moveApplicationToParentConfirmation(
  applicationId: string,
  by?: string,
): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find((item) => item.id === applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "verification") throw new Error("APPLICATION_NOT_IN_VERIFICATION");

  const now = new Date();
  const due = new Date(now.getTime() + PARENT_CONFIRMATION_WINDOW_DAYS * ONE_DAY_MS);
  const requestedAt = now.toISOString();
  const dueAt = due.toISOString();

  const updated: AdmissionApplication = {
    ...app,
    status: "parent_confirmation",
    requiredActions: ["Parent decision required within 7 days."],
    parentConfirmationRequestedAt: requestedAt,
    parentConfirmationDueAt: dueAt,
    parentConfirmationRespondedAt: undefined,
    parentConfirmationResponse: undefined,
    waitlist: undefined,
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        "parent_confirmation",
        "Sent to parent for confirmation",
        `Parent has 7 days to continue or reject${by ? ` · Verified by ${by}` : ""}.`,
      ),
    ],
    updatedAt: requestedAt,
  };
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.parentConfirmationRequired,
      variables: { applicationId: app.id, days: PARENT_CONFIRMATION_WINDOW_DAYS },
      applicantId: app.applicantId,
      applicationId: app.id,
      type: "confirmation",
    }),
  );
  return updated;
}

export function respondToParentConfirmation(input: {
  applicationId: string;
  applicantId: string;
  response: Exclude<ParentConfirmationResponse, "expired">;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find(
    (item) => item.id === input.applicationId && item.applicantId === input.applicantId,
  );
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "parent_confirmation") throw new Error("APPLICATION_NOT_IN_PARENT_CONFIRMATION");

  const now = new Date().toISOString();
  const dueMs = app.parentConfirmationDueAt ? new Date(app.parentConfirmationDueAt).getTime() : Number.NaN;
  if (!Number.isNaN(dueMs) && dueMs < Date.now()) {
    throw new Error("PARENT_CONFIRMATION_EXPIRED");
  }

  if (input.response === "continue" && !areSeatsAvailableForApplication(app, apps)) {
    throw new Error("SEATS_UNAVAILABLE");
  }

  const status = input.response === "continue" ? "approved" : "withdrawn";
  const updated: AdmissionApplication = {
    ...app,
    status,
    requiredActions: [],
    parentConfirmationRespondedAt: now,
    parentConfirmationResponse: input.response,
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        status,
        input.response === "continue"
          ? "Parent confirmed and continued"
          : "Parent rejected and closed application",
      ),
    ],
    updatedAt: now,
  };
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId:
        input.response === "continue"
          ? NOTIFICATION_TEMPLATE_IDS.admissions.parent.applicationApproved
          : NOTIFICATION_TEMPLATE_IDS.admissions.parent.applicationClosed,
      variables: { applicationId: app.id },
      applicantId: app.applicantId,
      applicationId: app.id,
      type: input.response === "continue" ? "approval" : "rejection",
    }),
  );
  return updated;
}

export function joinWaitlist(input: {
  applicationId: string;
  applicantId: string;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find(
    (item) => item.id === input.applicationId && item.applicantId === input.applicantId,
  );
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "parent_confirmation") {
    throw new Error("APPLICATION_NOT_IN_PARENT_CONFIRMATION");
  }
  if (areSeatsAvailableForApplication(app, apps)) {
    throw new Error("SEATS_AVAILABLE");
  }
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + WAITLIST_WINDOW_DAYS * ONE_DAY_MS).toISOString();
  const updated: AdmissionApplication = {
    ...app,
    status: "waitlisted",
    waitlist: {
      joinedAt: nowIso,
      expiresAt,
      active: true,
      priorityScore: now.getTime(),
    },
    requiredActions: ["Waitlist active. You can remind institute or remove from waitlist."],
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        "waitlisted",
        "Joined waitlist",
        "Seats unavailable. Added to 90-day fixed waitlist.",
      ),
    ],
    updatedAt: nowIso,
  };
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.waitlistJoined,
      variables: { applicationId: updated.id, days: WAITLIST_WINDOW_DAYS },
      applicantId: input.applicantId,
      applicationId: updated.id,
      type: "confirmation",
    }),
  );
  return updated;
}

export function remindInstituteFromWaitlist(input: {
  applicationId: string;
  applicantId: string;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find(
    (item) => item.id === input.applicationId && item.applicantId === input.applicantId,
  );
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "waitlisted" || !app.waitlist) throw new Error("APPLICATION_NOT_WAITLISTED");

  const nowIso = new Date().toISOString();
  const updated: AdmissionApplication = {
    ...app,
    waitlist: {
      ...app.waitlist,
      active: true,
      priorityScore: Date.now(),
      lastInstituteReminderAt: nowIso,
    },
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        "waitlisted",
        "Parent reminded institute",
        "Moved to top of institute waitlist and marked active.",
      ),
    ],
    updatedAt: nowIso,
  };
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.waitlistReminderSent,
      variables: { applicationId: updated.id },
      applicantId: input.applicantId,
      applicationId: updated.id,
      type: "reminder",
    }),
  );
  return updated;
}

export function removeFromWaitlist(input: {
  applicationId: string;
  applicantId: string;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find(
    (item) => item.id === input.applicationId && item.applicantId === input.applicantId,
  );
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "waitlisted" || !app.waitlist) throw new Error("APPLICATION_NOT_WAITLISTED");
  const nowIso = new Date().toISOString();
  const updated = removeFromWaitlistState(
    app,
    nowIso,
    "parent_removed",
    "Removed from waitlist by parent",
  );
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.waitlistRemoved,
      variables: { applicationId: updated.id },
      applicantId: input.applicantId,
      applicationId: updated.id,
      type: "rejection",
    }),
  );
  return updated;
}

export function getInstituteWaitlist(instituteId: string): AdmissionApplication[] {
  return getApplicationsStore()
    .filter(
      (app) =>
        (app.instituteId ?? "ins-test1school") === instituteId &&
        app.status === "waitlisted" &&
        app.waitlist?.active,
    )
    .sort((a, b) => (b.waitlist?.priorityScore ?? 0) - (a.waitlist?.priorityScore ?? 0));
}

export function bulkDeleteInstituteWaitlist(instituteId: string): number {
  const apps = getApplicationsStore();
  const nowIso = new Date().toISOString();
  let count = 0;
  const updated = apps.map((app) => {
    if (
      (app.instituteId ?? "ins-test1school") === instituteId &&
      app.status === "waitlisted" &&
      app.waitlist?.active
    ) {
      count += 1;
      return removeFromWaitlistState(
        app,
        nowIso,
        "bulk_deleted",
        "Removed from waitlist by institute bulk delete",
      );
    }
    return app;
  });
  if (count > 0) {
    saveApplications(updated);
  }
  return count;
}

export function requestApplicationCorrectionByInstitute(input: {
  applicationId: string;
  reason: string;
  requestedFields: CorrectionFieldPath[];
  requestedBy?: string;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find((item) => item.id === input.applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "verification") throw new Error("APPLICATION_NOT_IN_VERIFICATION");
  if (input.requestedFields.length === 0) throw new Error("REQUEST_FIELDS_REQUIRED");

  const now = new Date().toISOString();
  const cycleId = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const uniqueFields = [...new Set(input.requestedFields)];
  const reason = input.reason.trim();

  const updated: AdmissionApplication = {
    ...app,
    pendingCorrection: {
      cycleId,
      reason,
      requestedAt: now,
      requestedFields: uniqueFields,
      requestedBy: input.requestedBy,
    },
    requiredActions: [
      `Correction requested: ${reason}`,
      ...uniqueFields.map((field) => `Update ${getCorrectionFieldLabel(field)}`),
    ],
    correctionHistory: [
      ...(app.correctionHistory ?? []),
      {
        id: cycleId,
        reason,
        requestedAt: now,
        requestedFields: uniqueFields,
        requestedBy: input.requestedBy,
      },
    ],
    timeline: [
      ...app.timeline,
      buildTimelineEvent(
        "verification",
        "Correction requested from parent",
        `${reason} · ${uniqueFields.map(getCorrectionFieldLabel).join(", ")}`,
      ),
    ],
    updatedAt: now,
  };
  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.correctionRequested,
      variables: { applicationId: app.id, reason },
      applicantId: app.applicantId,
      applicationId: app.id,
      type: "document",
    }),
  );
  return updated;
}

export function resubmitRequestedCorrections(input: {
  applicationId: string;
  applicantId: string;
  fieldValues: Partial<Record<CorrectionFieldPath, string>>;
  documentValues?: Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>>;
}): AdmissionApplication {
  const apps = getApplicationsStore();
  const app = apps.find((item) => item.id === input.applicationId && item.applicantId === input.applicantId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (!app.pendingCorrection) throw new Error("NO_PENDING_CORRECTION");

  const allowed = new Set(app.pendingCorrection.requestedFields);
  let updated: AdmissionApplication = { ...app };
  const changedFields: CorrectionFieldPath[] = [];

  for (const [field, rawValue] of Object.entries(input.fieldValues) as [CorrectionFieldPath, string][]) {
    if (!allowed.has(field)) throw new Error("FIELD_NOT_REQUESTED");
    if (correctionDocType(field)) throw new Error("DOCUMENT_FIELD_REQUIRES_UPLOAD");
    const nextValue = rawValue.trim();
    updated = applyCorrectionFieldValue(updated, field, nextValue);
    changedFields.push(field);
  }

  if (input.documentValues) {
    for (const [docType, docValue] of Object.entries(input.documentValues) as [
      DocumentType,
      { fileName: string; dataUrl?: string },
    ][]) {
      const docField = `documents.${docType}` as CorrectionFieldPath;
      if (!allowed.has(docField)) throw new Error("FIELD_NOT_REQUESTED");
      const previous = updated.documents.find((doc) => doc.type === docType);
      const now = new Date().toISOString();
      const nextDoc: ApplicationDocument = {
        id: previous?.id ?? `doc-${docType}-${Date.now()}`,
        type: docType,
        label: DOC_LABELS[docType],
        fileName: docValue.fileName,
        status: "uploaded",
        uploadedAt: now.slice(0, 10),
        version: (previous?.version ?? 0) + 1,
        previewDataUrl: docValue.dataUrl,
        verificationTimeline: [
          ...(previous?.verificationTimeline ?? []),
          {
            id: `vt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            status: "uploaded",
            at: now,
            note: "Resubmitted for verification",
            by: "parent",
          },
        ],
      };
      updated = {
        ...updated,
        documents: [...updated.documents.filter((doc) => doc.type !== docType), nextDoc],
      };
      changedFields.push(docField);
    }
  }

  const now = new Date().toISOString();
  const cycleId = app.pendingCorrection.cycleId;
  const nextHistory = (updated.correctionHistory ?? []).map((cycle) =>
    cycle.id === cycleId
      ? {
          ...cycle,
          resubmittedAt: now,
          resubmittedBy: input.applicantId,
          resubmittedFields: [...new Set(changedFields)],
        }
      : cycle,
  );

  updated = {
    ...updated,
    status: "review",
    requiredActions: [],
    pendingCorrection: undefined,
    correctionHistory: nextHistory,
    timeline: [
      ...updated.timeline,
      buildTimelineEvent("review", "Corrections resubmitted and moved back to review"),
    ],
    updatedAt: now,
  };

  saveApplications(apps.map((item) => (item.id === updated.id ? updated : item)));
  addNotification(
    admissionsTemplateNotification({
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.correctionsSubmitted,
      variables: { applicationId: updated.id },
      applicantId: input.applicantId,
      applicationId: updated.id,
      type: "application",
    }),
  );
  return updated;
}

