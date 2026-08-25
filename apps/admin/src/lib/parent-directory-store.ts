import type { PortalAccessStatus, PortalInviteStatus } from "@lumenx/types";
import { readAdminDataScopeKey, isRegisteredAdminTenant } from "@/lib/admin-tenant";

import {
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";

export type ParentInviteStatus = PortalInviteStatus;
export type ParentAccessStatus = PortalAccessStatus;
export type ParentRelationship = "Mother" | "Father" | "Guardian";

export type ParentDirectoryRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  relationship: ParentRelationship;
  address: string;
  linkedStudentIds: string[];
  inviteStatus: ParentInviteStatus;
  accessStatus: ParentAccessStatus;
};

const DIRECTORY_KEY_PREFIX = "lumenx.admin.parents.v2";

const INITIAL_PARENTS: ParentDirectoryRecord[] = [
  {
    id: "PAR-2201",
    name: "Rohan Sharma",
    email: "rohan@kin.io",
    phone: "9876512345",
    password: "Parent@Rohan1",
    relationship: "Father",
    address: "14 Lake View Road, New Delhi",
    linkedStudentIds: ["STU-1042"],
    inviteStatus: "active",
    accessStatus: "active",
  },
  {
    id: "PAR-2202",
    name: "Mira Draxler",
    email: "mira.d@kin.io",
    phone: "9876512346",
    password: "Parent@Mira1",
    relationship: "Mother",
    address: "22 Green Park Avenue, New Delhi",
    linkedStudentIds: ["STU-1043"],
    inviteStatus: "active",
    accessStatus: "active",
  },
  {
    id: "PAR-2203",
    name: "Susan Wright",
    email: "swright@kin.io",
    phone: "9876512347",
    password: "Parent@Susan1",
    relationship: "Mother",
    address: "8 Cedar Street, New Delhi",
    linkedStudentIds: ["STU-1044"],
    inviteStatus: "pending",
    accessStatus: "active",
  },
  {
    id: "PAR-2204",
    name: "Imran Khan",
    email: "ikhan@kin.io",
    phone: "9876512348",
    password: "Parent@Imran1",
    relationship: "Father",
    address: "41 Crescent Lane, New Delhi",
    linkedStudentIds: ["STU-1045"],
    inviteStatus: "active",
    accessStatus: "active",
  },
  {
    id: "PAR-2205",
    name: "Carla Moreno",
    email: "cmoreno@kin.io",
    phone: "6129981100",
    password: "Parent@Carla1",
    relationship: "Mother",
    address: "Address pending verification",
    linkedStudentIds: ["STU-1046"],
    inviteStatus: "active",
    accessStatus: "suspended",
  },
  {
    id: "PAR-2206",
    name: "Hyun Lee",
    email: "hlee@kin.io",
    phone: "1099124421",
    password: "Parent@Hyun12",
    relationship: "Guardian",
    address: "Address pending verification",
    linkedStudentIds: ["STU-1047"],
    inviteStatus: "active",
    accessStatus: "active",
  },
  {
    id: "PAR-2207",
    name: "Kavita Patel",
    email: "kpatel@kin.io",
    phone: "9822044102",
    password: "Parent@Kavita1",
    relationship: "Mother",
    address: "Address pending verification",
    linkedStudentIds: ["STU-1048"],
    inviteStatus: "active",
    accessStatus: "active",
  },
  {
    id: "PAR-2208",
    name: "Fadi Haddad",
    email: "fhaddad@kin.io",
    phone: "5088211000",
    password: "Parent@Fadi12",
    relationship: "Father",
    address: "Address pending verification",
    linkedStudentIds: ["STU-1049"],
    inviteStatus: "active",
    accessStatus: "active",
  },
];

function directoryKey(): string {
  return `${DIRECTORY_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

export function normalizeParentPhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function normalizeRecord(record: ParentDirectoryRecord): ParentDirectoryRecord {
  const legacy = record as ParentDirectoryRecord & { status?: string; children?: { studentId: string }[] };
  return {
    ...record,
    password: record.password || "Parent@123",
    relationship: record.relationship || "Guardian",
    address: record.address || "Address pending verification",
    phone: normalizeParentPhone(record.phone),
    linkedStudentIds:
      record.linkedStudentIds ?? legacy.children?.map((child) => child.studentId) ?? [],
    inviteStatus: record.inviteStatus ?? (legacy.status === "pending" ? "pending" : "active"),
    accessStatus:
      record.accessStatus ?? (legacy.status === "suspended" ? "suspended" : "active"),
  };
}

export function loadParentDirectory(): ParentDirectoryRecord[] {
  try {
    const raw = localStorage.getItem(directoryKey());
    if (raw) {
      const parsed = (JSON.parse(raw) as ParentDirectoryRecord[]).map(normalizeRecord);
      return parsed;
    }
  } catch {
    // Fall back to seed data (demo profiles only).
  }
  if (isRegisteredAdminTenant()) {
    return [];
  }
  return INITIAL_PARENTS.map((record) => ({ ...record, linkedStudentIds: [...record.linkedStudentIds] }));
}

export function saveParentDirectory(records: ParentDirectoryRecord[]): void {
  try {
    localStorage.setItem(directoryKey(), JSON.stringify(records));
  } catch {
    // Keep the in-memory UI usable when storage is unavailable.
  }
}

export function findParentRecord(id: string): ParentDirectoryRecord | null {
  return loadParentDirectory().find((record) => record.id === id) ?? null;
}

export function nextParentId(records: ParentDirectoryRecord[]): string {
  const max = records.reduce((value, record) => {
    const parsed = Number(record.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(value, parsed) : value;
  }, 2200);
  return `PAR-${max + 1}`;
}

export function resolveParentChildren(
  parent: ParentDirectoryRecord,
  students = loadStudentDirectory(),
): StudentDirectoryRecord[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  return parent.linkedStudentIds
    .map((studentId) => byId.get(studentId))
    .filter((student): student is StudentDirectoryRecord => Boolean(student));
}

/** Keep the canonical guardian fields on linked student records aligned after parent edits. */
export function syncParentToLinkedStudents(parent: ParentDirectoryRecord): void {
  const linkedIds = new Set(parent.linkedStudentIds);
  const students = loadStudentDirectory();
  let changed = false;
  const next = students.map((student) => {
    if (!linkedIds.has(student.id)) return student;
    changed = true;
    return {
      ...student,
      parent: parent.name,
      parentName: parent.name,
      parentPhone: parent.phone,
      address: parent.address,
    };
  });
  if (changed) saveStudentDirectory(next);
}
