import type {
  ConnectLoginAccountStatus,
  PortalAccessStatus,
} from "@lumenx/types";
import { readAdminDataScopeKey } from "@/lib/admin-tenant";
import type { AdminStudentRecord } from "@lumenx/module-students";
import { normalizePhoneLast10, recordLocalChangeForSync, downloadTextToDevice } from "@lumenx/utils";

import { getMockStudentsForProfile } from "@/lib/academic-data";
import {
  formatIdCardIssueDate,
  publishStudentIdCardSync,
} from "@/lib/student-id-card-sync";
import {
  collectStudentAssetIds,
  hydrateStudentDirectoryMedia,
  isInlineDataUrl,
  persistStudentDirectoryMedia,
  slimStudentForPersist,
} from "@/lib/student-media";
import { deleteBlobAsset } from "@/lib/blob-asset-store";

export type StudentGender = "Female" | "Male" | "Other" | "Prefer not to say";

export type StudentConnectAccount = {
  email?: string;
  phone?: string;
  temporaryPassword: string;
  status: ConnectLoginAccountStatus;
};

export type StudentAccessStatus = PortalAccessStatus;

export type StudentDirectoryRecord = AdminStudentRecord & {
  firstName: string;
  surname: string;
  gender: StudentGender;
  address: string;
  parentName: string;
  parentPhone: string;
  /** Enrollment access: Hold / Suspend from the student list menu. */
  accessStatus: StudentAccessStatus;
  dateOfBirth?: string;
  admissionNumber?: string;
  /** Class roll number used for class rosters and search. */
  rollNo?: string;
  connectAccount?: StudentConnectAccount;
  admissionDocuments?: StudentProfileDocument[];
  /** IndexedDB key for the student photo (payload lives outside localStorage JSON). */
  photoAssetId?: string;
  /** Digital ID card — filled by Admin; empty fields show blank on Connect. */
  photoDataUrl?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  house?: string;
  /** Set automatically when the student record is created. */
  idCardIssuedOn?: string;
  idCardValidTill?: string;
};

export type StudentProfileDocument = {
  id: string;
  sourceApplicationId: string;
  sourceDocumentId: string;
  type: string;
  label: string;
  fileName: string;
  status: string;
  movedAt: string;
  purgeAdmissionCopyAt: string;
  previewAssetId?: string;
  previewDataUrl: string;
  note?: string;
};

export type StudentDraft = {
  firstName: string;
  surname: string;
  className: string;
  section: string;
  parentName: string;
  parentPhone: string;
  address: string;
  gender: StudentGender | "";
  dateOfBirth: string;
  admissionNumber: string;
  rollNo: string;
  createConnectAccount: boolean;
  studentPhone: string;
  studentEmail: string;
  temporaryPassword: string;
};

export type StudentImportRow = {
  firstName: string;
  surname: string;
  className: string;
  parentName: string;
  address: string;
  parentPhone: string;
  gender: string;
  dateOfBirth?: string;
  admissionNumber?: string;
  rollNo?: string;
  section?: string;
  studentPhone?: string;
  studentEmail?: string;
  accountPassword?: string;
};

type ConnectRegistryAccount = {
  identityKeys?: string[];
  phoneKey?: string;
  phone?: string;
  email?: string;
  instituteId: string;
  studentId: string;
  name: string;
  passwordHash: string | null;
  temporaryPassword?: string;
  hasCompletedSetup: boolean;
};

const DIRECTORY_KEY_PREFIX = "lumenx.admin.students.v2";
const CONNECT_AUTH_KEY = "lumenx.connect.studentAuth.v1";
const DEFAULT_CONNECT_INSTITUTE_ID = "ins-delhi-riverside";
export const STUDENTS_CHANGED_EVENT = "lumenx-students-changed";

let cachedDirectoryKey: string | null = null;
let cachedDirectory: StudentDirectoryRecord[] | null = null;
let directoryEpoch = 0;

export function invalidateStudentDirectoryCache(): void {
  cachedDirectoryKey = null;
  cachedDirectory = null;
  directoryEpoch += 1;
}

const PARENT_DETAILS: Record<
  string,
  { name: string; phone: string; address: string }
> = {
  "STU-1042": {
    name: "Rohan Sharma",
    phone: "9876512345",
    address: "14 Lake View Road, New Delhi",
  },
  "STU-1043": {
    name: "Mira Draxler",
    phone: "9876512346",
    address: "22 Green Park Avenue, New Delhi",
  },
  "STU-1044": {
    name: "Susan Wright",
    phone: "9876512347",
    address: "8 Cedar Street, New Delhi",
  },
  "STU-1045": {
    name: "Imran Khan",
    phone: "9876512348",
    address: "41 Crescent Lane, New Delhi",
  },
};

function directoryKey(): string {
  return `${DIRECTORY_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function splitName(name: string): { firstName: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    surname: parts.slice(1).join(" ") || "—",
  };
}

/** Known demo roll numbers aligned with accounts / Connect portals. */
const SEED_ROLL_NOS: Record<string, string> = {
  "STU-1042": "12",
  "STU-1043": "07",
  "STU-1044": "08",
  "STU-1045": "03",
  "STU-1046": "01",
  "STU-1047": "14",
  "STU-1048": "05",
  "STU-1049": "22",
};

export function getStudentRollNo(student: {
  id: string;
  rollNo?: string;
  admissionNumber?: string;
}): string {
  const roll = student.rollNo?.trim();
  if (roll) return roll;
  const seeded = SEED_ROLL_NOS[student.id];
  if (seeded) return seeded;
  const admission = student.admissionNumber?.trim();
  if (admission && admission !== student.id) return admission;
  const digits = student.id.replace(/\D/g, "");
  if (digits.length > 0) return digits.slice(-2).padStart(2, "0");
  return "—";
}

/** Numeric-aware roll sort (01, 2, 10 → 1, 2, 10). */
export function compareRollNo(a: string, b: string): number {
  const parse = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits ? Number.parseInt(digits, 10) : Number.POSITIVE_INFINITY;
  };
  const na = parse(a);
  const nb = parse(b);
  if (na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortStudentsByRollNo<T extends { id: string; rollNo?: string; admissionNumber?: string }>(
  students: T[],
): T[] {
  return [...students].sort((a, b) =>
    compareRollNo(getStudentRollNo(a), getStudentRollNo(b)),
  );
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

/** Stable DOB for seeded directory rows so Home birthdays use real month/day matching. */
function seedStudentDateOfBirth(index: number, now = new Date()): string {
  const year = now.getFullYear() - (10 + (index % 8));
  if (index === 0) {
    return `${year}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
  }
  if (index === 1) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return `${year}-${padDatePart(next.getMonth() + 1)}-${padDatePart(next.getDate())}`;
  }
  if (index === 2) {
    const soon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
    return `${year}-${padDatePart(soon.getMonth() + 1)}-${padDatePart(soon.getDate())}`;
  }
  const month = ((index * 2) % 12) + 1;
  let day = 1 + ((index * 11) % 27);
  if (month === now.getMonth() + 1 && day === now.getDate()) {
    day = Math.min(day + 8, 28);
  }
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function withSeededDateOfBirth(
  record: StudentDirectoryRecord,
  index: number,
): StudentDirectoryRecord {
  if (record.dateOfBirth?.trim()) return record;
  return { ...record, dateOfBirth: seedStudentDateOfBirth(index) };
}

function seedRecord(record: AdminStudentRecord, index: number): StudentDirectoryRecord {
  const name = splitName(record.name);
  const parent = PARENT_DETAILS[record.id] ?? {
    name: record.parent === "—" ? "Parent not recorded" : record.parent,
    phone: `987652${String(1000 + index).slice(-4)}`,
    address: "Address pending verification",
  };
  const seeded: StudentDirectoryRecord = {
    ...record,
    ...name,
    parentName: parent.name,
    parentPhone: parent.phone,
    address: parent.address,
    gender: index % 2 === 0 ? "Female" : "Male",
    accessStatus: "active",
    admissionNumber: record.id,
    rollNo: SEED_ROLL_NOS[record.id] ?? String(index + 1).padStart(2, "0"),
    dateOfBirth: seedStudentDateOfBirth(index),
  };

  if (record.id === "STU-1042") {
    seeded.connectAccount = {
      email: "aanya.sharma@student.edu",
      phone: "9876543210",
      temporaryPassword: "Student@1042",
      status: "active",
    };
  }
  return seeded;
}

function normalizeDirectoryRecord(
  record: StudentDirectoryRecord,
): StudentDirectoryRecord {
  return {
    ...record,
    accessStatus: record.accessStatus ?? "active",
    rollNo: record.rollNo?.trim() || getStudentRollNo(record),
    admissionDocuments: Array.isArray(record.admissionDocuments)
      ? record.admissionDocuments.map((doc) => ({
          ...doc,
          previewAssetId: doc.previewAssetId?.trim() || undefined,
          previewDataUrl: doc.previewDataUrl ?? "",
        }))
      : [],
    idCardIssuedOn: record.idCardIssuedOn?.trim() || formatIdCardIssueDate(),
    photoAssetId: record.photoAssetId?.trim() || undefined,
    photoDataUrl: record.photoDataUrl?.trim() || undefined,
    bloodGroup: record.bloodGroup?.trim() || undefined,
    emergencyContact: record.emergencyContact?.trim() || undefined,
    house: record.house?.trim() || undefined,
    idCardValidTill: record.idCardValidTill?.trim() || undefined,
  };
}

function recordHasPendingInlineMedia(record: StudentDirectoryRecord): boolean {
  if (isInlineDataUrl(record.photoDataUrl)) return true;
  return (record.admissionDocuments ?? []).some((doc) => isInlineDataUrl(doc.previewDataUrl));
}

function recordNeedsMediaHydration(record: StudentDirectoryRecord): boolean {
  if (record.photoAssetId && !isInlineDataUrl(record.photoDataUrl)) return true;
  return (record.admissionDocuments ?? []).some(
    (doc) => Boolean(doc.previewAssetId) && !isInlineDataUrl(doc.previewDataUrl),
  );
}

function writeDirectoryJson(key: string, records: StudentDirectoryRecord[]): void {
  const hasInline = records.some(recordHasPendingInlineMedia);
  const payload = hasInline ? records : records.map(slimStudentForPersist);
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return;
  } catch {
    // Quota: drop inline payloads and keep asset ids only.
  }
  try {
    localStorage.setItem(key, JSON.stringify(records.map(slimStudentForPersist)));
  } catch {
    // Keep page state when browser storage is unavailable.
  }
}

function emitStudentsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDENTS_CHANGED_EVENT));
}

async function flushStudentMedia(
  key: string,
  records: StudentDirectoryRecord[],
  previousAssetIds: Set<string>,
  epoch: number,
): Promise<void> {
  const persisted = await persistStudentDirectoryMedia(records);
  if (epoch !== directoryEpoch || cachedDirectoryKey !== key) return;

  const kept = new Set(persisted.flatMap(collectStudentAssetIds));
  await Promise.all(
    [...previousAssetIds].filter((id) => !kept.has(id)).map((id) => deleteBlobAsset(id)),
  );

  const merged = persisted.map((record, index) => {
    const source = records[index];
    return {
      ...record,
      photoDataUrl: source?.photoDataUrl || record.photoDataUrl,
      admissionDocuments: (record.admissionDocuments ?? []).map((doc, docIndex) => ({
        ...doc,
        previewDataUrl:
          source?.admissionDocuments?.[docIndex]?.previewDataUrl || doc.previewDataUrl,
      })),
    };
  });
  cachedDirectory = merged;
  writeDirectoryJson(key, merged.map(slimStudentForPersist));
  publishStudentIdCardSync(merged);
}

async function hydrateCachedDirectory(key: string, epoch: number): Promise<void> {
  const snapshot = cachedDirectory;
  if (!snapshot || !snapshot.some(recordNeedsMediaHydration)) return;
  const hydrated = await hydrateStudentDirectoryMedia(snapshot);
  if (epoch !== directoryEpoch || cachedDirectoryKey !== key) return;
  cachedDirectory = hydrated;
  publishStudentIdCardSync(hydrated);
  const filledPhoto = hydrated.some(
    (record, index) => record.photoDataUrl && record.photoDataUrl !== snapshot[index]?.photoDataUrl,
  );
  if (filledPhoto) emitStudentsChanged();
}

export function loadStudentDirectory(): StudentDirectoryRecord[] {
  const key = directoryKey();
  if (cachedDirectoryKey === key && cachedDirectory) {
    return cachedDirectory.map((record) => ({ ...record }));
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = (JSON.parse(raw) as StudentDirectoryRecord[]).map(normalizeDirectoryRecord);
      const filled = parsed.map(withSeededDateOfBirth);
      const dobBackfilled = filled.some(
        (record, index) => record.dateOfBirth !== parsed[index]?.dateOfBirth,
      );
      cachedDirectoryKey = key;
      cachedDirectory = filled;
      if (dobBackfilled) writeDirectoryJson(key, filled);
      if (typeof window !== "undefined") {
        void hydrateCachedDirectory(key, directoryEpoch);
      }
      return filled.map((record) => ({ ...record }));
    }
  } catch {
    // Fall back to profile seed data.
  }
  const seeded = getMockStudentsForProfile().map(seedRecord);
  cachedDirectoryKey = key;
  cachedDirectory = seeded;
  writeDirectoryJson(key, seeded);
  return seeded.map((record) => ({ ...record }));
}

export function saveStudentDirectory(records: StudentDirectoryRecord[]): void {
  const key = directoryKey();
  const previousAssetIds = new Set((cachedDirectory ?? []).flatMap(collectStudentAssetIds));
  const normalized = records.map(normalizeDirectoryRecord);
  directoryEpoch += 1;
  const epoch = directoryEpoch;
  cachedDirectoryKey = key;
  cachedDirectory = normalized;
  writeDirectoryJson(key, normalized);
  if (typeof window !== "undefined") {
    void flushStudentMedia(key, normalized, previousAssetIds, epoch);
  }
  recordLocalChangeForSync({
    app: "admin",
    module: "Students",
    label: "Save student directory",
    op: "update",
  });
  publishStudentIdCardSync(normalized);
  emitStudentsChanged();
}

export function findStudentRecord(studentId: string): StudentDirectoryRecord | null {
  return loadStudentDirectory().find((record) => record.id === studentId) ?? null;
}

export function nextStudentId(records: readonly StudentDirectoryRecord[]): string {
  const highest = records.reduce((max, record) => {
    const value = Number(record.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 1000);
  return `STU-${highest + 1}`;
}

export function normalizePhone(value: string): string {
  return normalizePhoneLast10(value);
}

export function validateStudentDraft(
  draft: StudentDraft,
  opts?: { apiMode?: boolean },
): string[] {
  const errors: string[] = [];
  if (!draft.firstName.trim()) errors.push("First name is required.");
  if (!draft.surname.trim()) errors.push("Surname is required.");
  if (!draft.className.trim()) errors.push("Class is required.");
  if (!opts?.apiMode) {
    if (!draft.parentName.trim()) errors.push("Parent name is required.");
    if (!/^\d{10}$/.test(draft.parentPhone)) {
      errors.push("Parent phone must contain exactly 10 digits.");
    }
  }
  if (!draft.address.trim()) errors.push("Address is required.");
  if (!draft.gender) errors.push("Gender is required.");
  if (draft.createConnectAccount) {
    const hasPhone = Boolean(draft.studentPhone);
    const hasEmail = Boolean(draft.studentEmail.trim());
    if (!hasPhone && !hasEmail) {
      errors.push("Enter a student mobile number, email, or both for Connect access.");
    }
    if (hasPhone && !/^\d{10}$/.test(draft.studentPhone)) {
      errors.push("Student phone must contain exactly 10 digits.");
    }
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.studentEmail.trim())) {
      errors.push("Enter a valid student email address.");
    }
    if (draft.temporaryPassword.length < 8) {
      errors.push("Demo password must contain at least 8 characters.");
    }
  }
  return errors;
}

export function studentFromDraft(
  draft: StudentDraft,
  id: string,
  gradeKey: string,
): StudentDirectoryRecord {
  const connectAccount = draft.createConnectAccount
    ? {
        email: draft.studentEmail.trim().toLowerCase() || undefined,
        phone: draft.studentPhone || undefined,
        temporaryPassword: draft.temporaryPassword,
        status: "first-login-pending" as const,
      }
    : undefined;
  return {
    id,
    firstName: draft.firstName.trim(),
    surname: draft.surname.trim(),
    name: `${draft.firstName.trim()} ${draft.surname.trim()}`,
    grade: gradeKey,
    attendance: 100,
    gpa: 0,
    status: "active",
    accessStatus: "active",
    parent: draft.parentName.trim(),
    parentName: draft.parentName.trim(),
    parentPhone: draft.parentPhone,
    address: draft.address.trim(),
    gender: draft.gender as StudentGender,
    dateOfBirth: draft.dateOfBirth || undefined,
    admissionNumber: draft.admissionNumber.trim() || undefined,
    rollNo: draft.rollNo.trim() || undefined,
    connectAccount,
    // Digital ID / QR identity is issued with the student record.
    // Optional fields stay empty until Admin fills them.
    idCardIssuedOn: formatIdCardIssueDate(),
    idCardValidTill: undefined,
    photoDataUrl: undefined,
    bloodGroup: undefined,
    emergencyContact: undefined,
    house: undefined,
  };
}

function identifierKey(identifier: string, instituteId: string): string {
  const value = identifier.trim().toLowerCase();
  const normalized = value.includes("@") ? value : normalizePhone(value);
  return `${normalized}@${instituteId}`;
}

export function provisionStudentConnectAccount(record: StudentDirectoryRecord): void {
  if (!record.connectAccount) return;
  try {
    const raw = localStorage.getItem(CONNECT_AUTH_KEY);
    const accounts = raw ? (JSON.parse(raw) as ConnectRegistryAccount[]) : [];
    const phone = record.connectAccount.phone;
    const email = record.connectAccount.email;
    const identityKeys = [phone, email]
      .filter((value): value is string => Boolean(value))
      .map((value) => identifierKey(value, DEFAULT_CONNECT_INSTITUTE_ID));
    const nextAccount: ConnectRegistryAccount = {
      identityKeys,
      phoneKey: phone ? identifierKey(phone, DEFAULT_CONNECT_INSTITUTE_ID) : undefined,
      phone,
      email,
      instituteId: DEFAULT_CONNECT_INSTITUTE_ID,
      studentId: record.id,
      name: record.name,
      passwordHash: null,
      temporaryPassword: record.connectAccount.temporaryPassword,
      hasCompletedSetup: false,
    };
    const filtered = accounts.filter((account) => account.studentId !== record.id);
    localStorage.setItem(CONNECT_AUTH_KEY, JSON.stringify([...filtered, nextAccount]));
  } catch {
    // Student record remains valid even if account registry cannot be persisted.
  }
}

export function getStudentConnectPassword(record: StudentDirectoryRecord): string | null {
  if (!record.connectAccount) return null;
  try {
    const raw = localStorage.getItem(CONNECT_AUTH_KEY);
    if (!raw) return record.connectAccount.temporaryPassword;
    const accounts = JSON.parse(raw) as ConnectRegistryAccount[];
    const account = accounts.find((item) => item.studentId === record.id);
    return account?.passwordHash ?? account?.temporaryPassword ?? record.connectAccount.temporaryPassword;
  } catch {
    return record.connectAccount.temporaryPassword;
  }
}

export function validateImportRow(
  row: StudentImportRow,
  rowNumber: number,
): string[] {
  const errors: string[] = [];
  const required: Array<[keyof StudentImportRow, string]> = [
    ["firstName", "first_name"],
    ["surname", "surname"],
    ["className", "class"],
    ["parentName", "parent_name"],
    ["address", "address"],
    ["parentPhone", "parent_phone"],
    ["gender", "gender"],
  ];
  for (const [key, label] of required) {
    if (!String(row[key] ?? "").trim()) errors.push(`Row ${rowNumber}: ${label} is required.`);
  }
  if (row.parentPhone && !/^\d{10}$/.test(normalizePhone(row.parentPhone))) {
    errors.push(`Row ${rowNumber}: parent_phone must contain exactly 10 digits.`);
  }
  const genders = ["female", "male", "other", "prefer not to say"];
  if (row.gender && !genders.includes(row.gender.trim().toLowerCase())) {
    errors.push(`Row ${rowNumber}: gender is not valid.`);
  }
  const studentPhone = normalizePhone(row.studentPhone ?? "");
  const studentEmail = row.studentEmail?.trim() ?? "";
  const accountPassword = row.accountPassword ?? "";
  const createsAccount = Boolean(studentPhone || studentEmail || accountPassword);
  if (createsAccount && !studentPhone && !studentEmail) {
    errors.push(`Row ${rowNumber}: enter student_phone, student_email, or both.`);
  }
  if (row.studentPhone && !/^\d{10}$/.test(studentPhone)) {
    errors.push(`Row ${rowNumber}: student_phone must contain exactly 10 digits.`);
  }
  if (studentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
    errors.push(`Row ${rowNumber}: student_email is not valid.`);
  }
  if (createsAccount && accountPassword.length < 8) {
    errors.push(`Row ${rowNumber}: account_password must contain at least 8 characters.`);
  }
  return errors;
}

function normalizeNamePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function studentImportDuplicateKey(row: {
  firstName: string;
  surname: string;
  parentPhone: string;
  admissionNumber?: string;
  studentPhone?: string;
  studentEmail?: string;
}): string {
  const admission = row.admissionNumber?.trim().toLowerCase();
  if (admission) return `admission:${admission}`;

  const studentPhone = normalizePhone(row.studentPhone ?? "");
  if (studentPhone) return `phone:${studentPhone}`;

  const studentEmail = row.studentEmail?.trim().toLowerCase();
  if (studentEmail) return `email:${studentEmail}`;

  return [
    "identity",
    normalizeNamePart(row.firstName),
    normalizeNamePart(row.surname),
    normalizePhone(row.parentPhone),
  ].join(":");
}

export function splitImportRowsByDuplicate(
  importRows: readonly StudentImportRow[],
  existing: readonly StudentDirectoryRecord[],
): { unique: StudentImportRow[]; duplicates: StudentImportRow[] } {
  const seen = new Set(
    existing.map((record) =>
      studentImportDuplicateKey({
        firstName: record.firstName,
        surname: record.surname,
        parentPhone: record.parentPhone,
        admissionNumber: record.admissionNumber,
        studentPhone: record.connectAccount?.phone,
        studentEmail: record.connectAccount?.email,
      }),
    ),
  );
  const unique: StudentImportRow[] = [];
  const duplicates: StudentImportRow[] = [];

  for (const row of importRows) {
    const key = studentImportDuplicateKey(row);
    if (seen.has(key)) {
      duplicates.push(row);
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  return { unique, duplicates };
}

export const STUDENT_CSV_HEADERS = [
  "first_name",
  "surname",
  "class",
  "parent_name",
  "address",
  "parent_phone",
  "gender",
  "date_of_birth",
  "admission_number",
  "roll_no",
  "section",
  "student_phone",
  "student_email",
  "account_password",
] as const;

export const STUDENT_IMPORT_SAMPLE_ROW = [
  "Aanya",
  "Sharma",
  "Grade 10",
  "Rohan Sharma",
  "14 Lake View Road, New Delhi",
  "9876512345",
  "Female",
  "2010-01-15",
  "ADM-2026-001",
  "12",
  "A",
  "9876543210",
  "aanya.sharma@student.edu",
  "Student@123",
] as const;

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  downloadTextToDevice(filename, content, mimeType);
}

export function downloadStudentDirectoryCsv(records: StudentDirectoryRecord[]): void {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const header = [
    "id",
    "first_name",
    "surname",
    "name",
    "class",
    "section",
    "parent_name",
    "parent_phone",
    "address",
    "gender",
    "roll_no",
    "admission_number",
    "attendance",
    "status",
  ];
  const lines = [
    header.join(","),
    ...records.map((s) =>
      [
        s.id,
        s.firstName,
        s.surname,
        s.name,
        s.grade,
        s.section ?? "",
        s.parentName,
        s.parentPhone,
        s.address,
        s.gender,
        s.rollNo ?? "",
        s.admissionNumber ?? "",
        String(s.attendance),
        s.status,
      ]
        .map((cell) => escape(String(cell)))
        .join(","),
    ),
    "",
  ];
  downloadTextFile("students-directory.csv", lines.join("\n"), "text/csv;charset=utf-8");
}

export function downloadStudentImportTemplateCsv(): void {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const csv = [
    STUDENT_CSV_HEADERS.join(","),
    STUDENT_IMPORT_SAMPLE_ROW.map((cell) => escape(cell)).join(","),
    "",
  ].join("\n");
  downloadTextFile("students-bulk-import-template.csv", csv, "text/csv;charset=utf-8");
}
